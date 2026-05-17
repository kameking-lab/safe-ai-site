/**
 * Annual schedule optimizer.
 *
 * Builds on `health-checkup-engine.generateAnnualSchedule` to produce a more
 * operations-friendly schedule:
 *
 *   1. Surfaces event-driven exams (overtime interview, overseas dispatch
 *      pre/post) in a dedicated "随時実施" bucket so they don't pollute the
 *      monthly calendar.
 *   2. Detects months that pile up too many checkup events and suggests
 *      re-distributing into adjacent low-load months (operations-quiet
 *      windows). The decision is heuristic — we don't move the legally
 *      required at-hire event, only periodic repeats.
 *   3. Computes a deduplicated test-item summary per month so the
 *      organising clinician can avoid drawing blood twice for the same
 *      panel (e.g. liver function shared by vinyl-chloride, dichloromethane,
 *      and the general periodic checkup).
 *
 * The optimizer is purely additive — the underlying `AnnualSchedule` is
 * preserved unchanged for callers that prefer the strict statutory placement.
 */

import { ALL_CHECKUP_RULES, getRuleById } from "@/data/health-checkup-rules";
import type {
  AnnualSchedule,
  CheckupRule,
  MonthIndex,
  RequiredCheckup,
  ScheduleEntry,
} from "@/types/health-checkup";

/**
 * Per-month operational priority. Higher = preferred (busy season avoidance
 * for construction / transportation goes here when expanded per-industry).
 *
 * The default profile mirrors the typical 衛生委員会 calendar:
 *   - April / October — fiscal-half kickoffs, used for at-hire & periodic
 *     anchors. Slightly de-prioritised so we don't pile new repeats on top.
 *   - May / June / September / November — operationally quietest months,
 *     preferred for redistribution.
 *   - July / August / December / January — busy or short-month periods.
 *   - March — fiscal-year close; busy.
 */
export const DEFAULT_MONTH_PRIORITY: Record<MonthIndex, number> = {
  1: 1,
  2: 3,
  3: 1,
  4: 2,
  5: 5,
  6: 5,
  7: 2,
  8: 1,
  9: 5,
  10: 2,
  11: 5,
  12: 1,
};

/**
 * Test items that are mechanically the same blood/imaging panel and can be
 * consolidated when scheduled together. Each canonical key collapses several
 * mandatory-item strings that appear under different rules.
 */
const DEDUP_GROUPS: Array<{ canonical: string; aliases: RegExp[] }> = [
  {
    canonical: "血液一般（赤血球・白血球・血色素・血小板）",
    aliases: [/貧血検査/, /血液像/, /末梢血液一般検査/, /白血球数|赤血球数/],
  },
  {
    canonical: "肝機能（GOT・GPT・γ-GTP）",
    aliases: [/肝機能検査/, /GOT.*GPT.*γ-?GTP/],
  },
  {
    canonical: "血中脂質（LDL/HDL・中性脂肪）",
    aliases: [/血中脂質検査/, /LDL.*HDL/],
  },
  {
    canonical: "血糖検査",
    aliases: [/血糖検査/, /HbA1c/],
  },
  {
    canonical: "尿検査（糖・蛋白）",
    aliases: [/尿検査.*糖.*蛋白/, /尿中の蛋白/],
  },
  {
    canonical: "胸部エックス線検査",
    aliases: [/胸部エックス線/],
  },
  {
    canonical: "血圧測定",
    aliases: [/血圧の測定/],
  },
  {
    canonical: "視力・聴力検査",
    aliases: [/視力及び聴力/, /視力.*聴力/],
  },
  {
    canonical: "心電図検査",
    aliases: [/心電図検査/],
  },
  {
    canonical: "皮膚・粘膜の所見",
    aliases: [/皮膚所見|皮膚の検査|皮膚・粘膜/],
  },
];

function canonicaliseItem(item: string): string {
  for (const group of DEDUP_GROUPS) {
    if (group.aliases.some((re) => re.test(item))) return group.canonical;
  }
  return item;
}

/**
 * Returns a deduplicated set of test items (canonical keys) drawn from the
 * mandatory items of every rule scheduled in the given month.
 */
export function consolidatedTestItemsForMonth(
  schedule: AnnualSchedule,
  month: MonthIndex,
): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of schedule.entries) {
    if (entry.month !== month) continue;
    const rule = getRuleById(entry.ruleId);
    if (!rule) continue;
    for (const raw of rule.testItems.mandatory) {
      const key = canonicaliseItem(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(key);
    }
  }
  return items;
}

/** Event-driven rules pulled out of the monthly calendar. */
export interface OnDemandEvent {
  rule: CheckupRule;
  /** Brief explanation of the triggering event in human-readable form. */
  trigger: string;
}

export function extractOnDemandEvents(
  required: RequiredCheckup[],
): OnDemandEvent[] {
  const out: OnDemandEvent[] = [];
  for (const r of required) {
    if (!r.rule.frequency.eventDriven) continue;
    out.push({
      rule: r.rule,
      trigger:
        r.rule.type === "overtime"
          ? "時間外労働の申出があったとき"
          : r.rule.type === "overseas"
            ? "6か月以上の海外派遣の決定・帰任時"
            : "業務・配置変更等の事象発生時",
    });
  }
  return out;
}

export interface MonthLoad {
  month: MonthIndex;
  load: number;
  /** Higher = better month to schedule into (1..5 from DEFAULT_MONTH_PRIORITY). */
  priority: number;
}

export function monthLoadProfile(
  schedule: AnnualSchedule,
  priority: Record<MonthIndex, number> = DEFAULT_MONTH_PRIORITY,
): MonthLoad[] {
  const counts: Record<MonthIndex, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  };
  for (const e of schedule.entries) {
    counts[e.month] += 1;
  }
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as MonthIndex[]).map((m) => ({
    month: m,
    load: counts[m],
    priority: priority[m],
  }));
}

/**
 * Re-distribute the `n` busiest months by moving the latest periodic event
 * (NOT the at-hire event) onto a nearby quiet/high-priority month.
 *
 * Heuristic:
 *   1. Find the month with the largest load whose load > average + 1.
 *   2. Find a candidate target month within ±2 months that has lower load
 *      AND higher priority.
 *   3. Move one periodic (non-at-hire) entry from source → target.
 *
 * The function returns a new AnnualSchedule, leaving the input intact.
 * Up to `maxMoves` re-distributions are performed.
 */
export function optimiseSchedule(
  schedule: AnnualSchedule,
  options: {
    priority?: Record<MonthIndex, number>;
    maxMoves?: number;
  } = {},
): { schedule: AnnualSchedule; moves: SchedulerMove[] } {
  const priority = options.priority ?? DEFAULT_MONTH_PRIORITY;
  const maxMoves = options.maxMoves ?? 4;

  const entries = schedule.entries.map((e) => ({ ...e }));
  const moves: SchedulerMove[] = [];

  for (let step = 0; step < maxMoves; step++) {
    const loads = monthLoadProfile({ ...schedule, entries }, priority);
    const total = loads.reduce((s, l) => s + l.load, 0);
    const nonZero = loads.filter((l) => l.load > 0).length;
    if (nonZero === 0) break;
    const avg = total / 12;

    // Find busiest month with load >= ceil(avg) + 1.
    const busiest = [...loads]
      .filter((l) => l.load >= Math.ceil(avg) + 1)
      .sort((a, b) => b.load - a.load || a.priority - b.priority)[0];
    if (!busiest) break;

    // Find candidate target within ±2 months that improves balance.
    const candidates = loads.filter(
      (l) =>
        Math.abs(l.month - busiest.month) > 0 &&
        Math.abs(l.month - busiest.month) <= 2 &&
        l.load < busiest.load - 1 &&
        l.priority >= busiest.priority,
    );
    if (candidates.length === 0) break;

    candidates.sort(
      (a, b) => a.load - b.load || b.priority - a.priority,
    );
    const target = candidates[0];

    // Pick a periodic (non-at-hire) entry from busiest.
    const movable = entries.findIndex(
      (e) => e.month === busiest.month && !e.isAtHire,
    );
    if (movable === -1) break;
    const moved = entries[movable];
    moves.push({
      ruleId: moved.ruleId,
      ruleTitle: moved.ruleTitle,
      from: busiest.month,
      to: target.month,
      reason: `${busiest.month}月の予定が${busiest.load}件と集中しているため、優先度の高い${target.month}月に再配置。`,
    });
    entries[movable] = { ...moved, month: target.month };
  }

  entries.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.ruleTitle.localeCompare(b.ruleTitle, "ja");
  });

  return {
    schedule: { ...schedule, entries },
    moves,
  };
}

export interface SchedulerMove {
  ruleId: string;
  ruleTitle: string;
  from: MonthIndex;
  to: MonthIndex;
  reason: string;
}

/**
 * Group entries by month, but for the consumer-friendly optimized view —
 * also includes the consolidated test-item set so the UI can show a
 * single de-duplicated lab order per month.
 */
export interface OptimisedMonthView {
  month: MonthIndex;
  entries: ScheduleEntry[];
  consolidatedItems: string[];
}

export function buildOptimisedMonthlyView(
  schedule: AnnualSchedule,
): OptimisedMonthView[] {
  const months: MonthIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return months.map((m) => ({
    month: m,
    entries: schedule.entries.filter((e) => e.month === m),
    consolidatedItems: consolidatedTestItemsForMonth(schedule, m),
  }));
}

/**
 * Top-level facade combining the engine output with optimisation.
 */
export interface OptimisedDecision {
  original: AnnualSchedule;
  optimised: AnnualSchedule;
  moves: SchedulerMove[];
  monthlyView: OptimisedMonthView[];
  onDemand: OnDemandEvent[];
  /**
   * Coverage stats — share of the 30 rule library that fires for this
   * profile. Useful as an at-a-glance indicator on the result page.
   */
  coverage: {
    matched: number;
    total: number;
  };
}

export function optimiseDecision(
  required: RequiredCheckup[],
  schedule: AnnualSchedule,
  options?: {
    priority?: Record<MonthIndex, number>;
    maxMoves?: number;
  },
): OptimisedDecision {
  const { schedule: optimised, moves } = optimiseSchedule(schedule, options);
  return {
    original: schedule,
    optimised,
    moves,
    monthlyView: buildOptimisedMonthlyView(optimised),
    onDemand: extractOnDemandEvents(required),
    coverage: {
      matched: required.length,
      total: ALL_CHECKUP_RULES.length,
    },
  };
}
