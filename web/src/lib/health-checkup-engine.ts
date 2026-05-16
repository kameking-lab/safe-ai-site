/**
 * Health-checkup decision engine.
 *
 * Given a {@link WorkerProfile}, the engine resolves which checkup rules
 * apply (`determineRequiredCheckups`), lays them onto an annual calendar
 * anchored at the worker's hire date (`generateAnnualSchedule`), and
 * compares the current performance log against the required set to surface
 * missing or overdue exams (`identifyMissing`).
 *
 * Triggers fire on union semantics — a worker may match a rule by industry,
 * substance, or work condition, and each match is preserved in the result so
 * the UI can show "なぜこの健診が必要か".
 */

import { ALL_CHECKUP_RULES, getJobById, getRuleById } from "@/data/health-checkup-rules";
import type {
  AnnualSchedule,
  MissingCheckup,
  MissingCheckupInput,
  MonthIndex,
  RequiredCheckup,
  ScheduleEntry,
  SubstanceId,
  WorkConditionId,
  WorkerProfile,
} from "@/types/health-checkup";

/**
 * Resolves the effective hazard set by combining a worker's manually-entered
 * substances/conditions with the defaults attached to each selected job.
 */
export interface ResolvedHazards {
  substances: Set<SubstanceId>;
  workConditions: Set<WorkConditionId>;
}

export function resolveWorkerHazards(profile: WorkerProfile): ResolvedHazards {
  const substances = new Set<SubstanceId>(profile.substances);
  const workConditions = new Set<WorkConditionId>(profile.workConditions);
  for (const jobId of profile.jobIds) {
    const job = getJobById(jobId);
    if (!job) continue;
    for (const s of job.defaultSubstances) substances.add(s);
    for (const c of job.defaultWorkConditions) workConditions.add(c);
  }
  return { substances, workConditions };
}

/**
 * Returns the subset of {@link ALL_CHECKUP_RULES} that apply to the worker,
 * with a record of which triggers fired so callers can render explanations.
 */
export function determineRequiredCheckups(
  profile: WorkerProfile,
): RequiredCheckup[] {
  const { substances, workConditions } = resolveWorkerHazards(profile);
  const out: RequiredCheckup[] = [];
  for (const rule of ALL_CHECKUP_RULES) {
    const triggeredBy: RequiredCheckup["triggeredBy"] = [];

    if (rule.trigger.unconditional) {
      triggeredBy.push({ kind: "unconditional" });
    }
    if (rule.trigger.industries?.includes(profile.industry)) {
      triggeredBy.push({ kind: "industry", value: profile.industry });
    }
    if (rule.trigger.substances) {
      for (const s of rule.trigger.substances) {
        if (substances.has(s)) {
          triggeredBy.push({ kind: "substance", value: s });
        }
      }
    }
    if (rule.trigger.workConditions) {
      for (const c of rule.trigger.workConditions) {
        if (workConditions.has(c)) {
          triggeredBy.push({ kind: "work-condition", value: c });
        }
      }
    }

    if (triggeredBy.length > 0) {
      out.push({ rule, triggeredBy });
    }
  }
  return out;
}

/**
 * Parse YYYY-MM-DD safely. Returns null when the input is not a sane date.
 * Avoids `new Date("yyyy-mm-dd")` UTC vs local pitfalls by normalising to
 * noon local time.
 */
function parseHireDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return new Date(y, mm - 1, dd, 12, 0, 0, 0);
}

function addMonthsClamped(d: Date, months: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
}

function monthIndexFromDate(d: Date): MonthIndex {
  return (d.getMonth() + 1) as MonthIndex;
}

/**
 * Lay required checkups on a calendar by month. The first event of a rule is
 * anchored at the hire month (at-hire) if the rule has `atHire: true`, then
 * subsequent events repeat every `intervalMonths`. The output is sorted by
 * month index (1–12) for downstream UI rendering; calendar-year semantics,
 * not fiscal year — that matches how Japanese employers typically run their
 * 衛生委員会 health-checkup planning.
 */
export function generateAnnualSchedule(
  required: RequiredCheckup[],
  hireDate: string,
): AnnualSchedule {
  const anchor = parseHireDate(hireDate);
  if (!anchor) {
    return { hireDate, entries: [] };
  }
  const entries: ScheduleEntry[] = [];

  for (const { rule } of required) {
    const interval = rule.frequency.intervalMonths;
    const monthsInWindow: { month: MonthIndex; isAtHire: boolean }[] = [];

    if (rule.frequency.atHire) {
      monthsInWindow.push({ month: monthIndexFromDate(anchor), isAtHire: true });
    }

    if (interval > 0 && interval <= 12) {
      // Walk forward 12 months from the anchor, dropping a slot every
      // `interval` months. We deliberately walk 0..11 — that's a full year
      // window of repeats relative to the hire anchor.
      for (let i = interval; i < 12; i += interval) {
        const d = addMonthsClamped(anchor, i);
        monthsInWindow.push({ month: monthIndexFromDate(d), isAtHire: false });
      }
    }

    for (const slot of monthsInWindow) {
      entries.push({
        month: slot.month,
        ruleId: rule.id,
        ruleTitle: rule.title,
        type: rule.type,
        isAtHire: slot.isAtHire,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.ruleTitle.localeCompare(b.ruleTitle, "ja");
  });

  return { hireDate, entries };
}

/**
 * Group {@link AnnualSchedule.entries} by month index. Months without events
 * are returned as empty arrays so calendar UIs can render a stable 12-row
 * structure without conditional logic.
 */
export function groupScheduleByMonth(
  schedule: AnnualSchedule,
): Record<MonthIndex, ScheduleEntry[]> {
  const grouped: Record<MonthIndex, ScheduleEntry[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [],
  };
  for (const e of schedule.entries) {
    grouped[e.month].push(e);
  }
  return grouped;
}

/**
 * Determine which required checkups have not been performed within the rule's
 * interval. Returns one entry per missing/overdue rule with a human-readable
 * reason. `referenceDate` defaults to "today" and is parameterised so unit
 * tests stay deterministic.
 */
export function identifyMissing(
  required: RequiredCheckup[],
  performed: MissingCheckupInput[],
  referenceDate: Date = new Date(),
): MissingCheckup[] {
  const performedMap = new Map<string, MissingCheckupInput>();
  for (const p of performed) performedMap.set(p.ruleId, p);

  const out: MissingCheckup[] = [];
  for (const { rule } of required) {
    const record = performedMap.get(rule.id);
    if (!record || !record.lastPerformed) {
      out.push({
        rule,
        reason: "実施記録なし。雇入時または定期健診として速やかに実施が必要。",
      });
      continue;
    }
    const last = parseHireDate(record.lastPerformed);
    if (!last) {
      out.push({
        rule,
        reason: "実施日の形式が不正（YYYY-MM-DD を期待）。",
      });
      continue;
    }
    const diffMonths =
      (referenceDate.getFullYear() - last.getFullYear()) * 12 +
      (referenceDate.getMonth() - last.getMonth());
    if (diffMonths > rule.frequency.intervalMonths) {
      out.push({
        rule,
        reason: `前回実施(${record.lastPerformed})から ${diffMonths} か月経過。法定間隔(${rule.frequency.intervalMonths}か月以内)を超過。`,
      });
    }
  }
  return out;
}

/**
 * Convenience facade used by the result page: takes a worker profile and the
 * worker's performance log, and returns the full decision output.
 */
export interface CheckupDecision {
  required: RequiredCheckup[];
  schedule: AnnualSchedule;
  missing: MissingCheckup[];
}

export function buildDecision(
  profile: WorkerProfile,
  performed: MissingCheckupInput[] = [],
  referenceDate?: Date,
): CheckupDecision {
  const required = determineRequiredCheckups(profile);
  const schedule = generateAnnualSchedule(required, profile.hireDate);
  const missing = identifyMissing(required, performed, referenceDate);
  return { required, schedule, missing };
}

/** Re-export for callers that want to materialise a rule by id (e.g. URL params). */
export { getRuleById };
