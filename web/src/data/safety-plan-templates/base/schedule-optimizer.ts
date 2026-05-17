/**
 * Monthly schedule optimizer.
 *
 * Applied after industry × scale merging to ensure:
 *   1. health-check events are deduplicated within the same month (no
 *      double-booking definite health checks)
 *   2. at least one emergency-response drill exists in the fiscal year
 *      (anchor: 9月 防災の日)
 *   3. equipment-check events are biased toward off-peak months (Feb/May) for
 *      industries with seasonal peaks
 *   4. statutory ("required") events keep their position; only optional events
 *      may be reordered
 */

import type {
  IndustryId,
  MonthIndex,
  MonthlyEvent,
  MonthlySchedule,
} from "@/types/safety-plan";

const INDUSTRY_PEAK_MONTHS: Partial<Record<IndustryId, MonthIndex[]>> = {
  construction: [12, 3],
  retail: [12, 1],
  food: [8, 12],
  transportation: [8, 12],
  warehouse: [8, 12],
  wholesale: [12],
};

const PREFERRED_EQUIPMENT_CHECK_MONTHS: MonthIndex[] = [5, 2];

function eventKey(ev: MonthlyEvent): string {
  return `${ev.category}::${ev.title}`;
}

/**
 * Within each month, drop later duplicates with the same (category, title)
 * pair. Earlier entries (typically the base common-schedule) win.
 */
function dedupeWithinMonth(entries: MonthlySchedule[]): MonthlySchedule[] {
  return entries.map((entry) => {
    const seen = new Set<string>();
    const events: MonthlyEvent[] = [];
    for (const ev of entry.events) {
      const k = eventKey(ev);
      if (seen.has(k)) continue;
      seen.add(k);
      events.push(ev);
    }
    return { month: entry.month, events };
  });
}

/**
 * Ensure at least one emergency-response drill (category=drill, required) is
 * present somewhere in the schedule. If absent, insert one in September
 * (anchored to 防災の日) — common-schedule already has this, so this acts as
 * a safety net only.
 */
function ensureEmergencyDrill(entries: MonthlySchedule[]): MonthlySchedule[] {
  const hasDrill = entries.some((m) =>
    m.events.some((ev) => ev.category === "drill"),
  );
  if (hasDrill) return entries;
  return entries.map((entry) => {
    if (entry.month !== 9) return entry;
    return {
      month: entry.month,
      events: [
        ...entry.events,
        {
          title: "防災訓練（避難・通報・初期消火）",
          category: "drill",
          description:
            "地震・火災を想定した避難訓練、通報訓練、初期消火訓練を実施し、結果を消防署へ報告する。",
          reference: "消防法第8条",
          required: true,
        },
      ],
    };
  });
}

/**
 * For industries with seasonal peaks, move equipment-check (and only optional
 * equipment-check) events out of peak months and into the preferred off-peak
 * months (May/February). Required statutory events are never moved.
 */
function rebalanceEquipmentChecks(
  entries: MonthlySchedule[],
  industry: IndustryId,
): MonthlySchedule[] {
  const peaks = INDUSTRY_PEAK_MONTHS[industry];
  if (!peaks || peaks.length === 0) return entries;
  const peakSet = new Set<number>(peaks);

  const next = entries.map((e) => ({ month: e.month, events: [...e.events] }));
  const findEntry = (m: MonthIndex) => next.find((e) => e.month === m)!;

  for (const entry of next) {
    if (!peakSet.has(entry.month)) continue;
    const keep: MonthlyEvent[] = [];
    const movable: MonthlyEvent[] = [];
    for (const ev of entry.events) {
      if (ev.category === "equipment-check" && !ev.required) {
        movable.push(ev);
      } else {
        keep.push(ev);
      }
    }
    if (movable.length === 0) continue;
    entry.events = keep;
    let i = 0;
    for (const ev of movable) {
      const targetMonth = PREFERRED_EQUIPMENT_CHECK_MONTHS[i % PREFERRED_EQUIPMENT_CHECK_MONTHS.length];
      const target = findEntry(targetMonth);
      // Avoid duplicating the same event in the destination.
      if (!target.events.some((x) => eventKey(x) === eventKey(ev))) {
        target.events.push(ev);
      }
      i += 1;
    }
  }
  return next;
}

/**
 * Within each month, sort events so statutory (required) items appear before
 * optional ones, then by category for predictable rendering. Original order
 * is preserved for ties via Array#sort's stability.
 */
function sortWithinMonth(entries: MonthlySchedule[]): MonthlySchedule[] {
  const categoryOrder: Record<string, number> = {
    committee: 0,
    education: 1,
    "health-check": 2,
    ra: 3,
    inspection: 4,
    "equipment-check": 5,
    drill: 6,
    ky: 7,
    "industry-specific": 8,
  };
  return entries.map((entry) => ({
    month: entry.month,
    events: [...entry.events].sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      const ai = categoryOrder[a.category] ?? 99;
      const bi = categoryOrder[b.category] ?? 99;
      return ai - bi;
    }),
  }));
}

export function optimizeMonthlySchedule(
  entries: MonthlySchedule[],
  industry: IndustryId,
): MonthlySchedule[] {
  let next = dedupeWithinMonth(entries);
  next = ensureEmergencyDrill(next);
  next = rebalanceEquipmentChecks(next, industry);
  next = sortWithinMonth(next);
  return next;
}
