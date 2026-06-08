/**
 * Health-checkup timing classifier.
 *
 * Given a checkup's legal interval (months) and the date it was last performed,
 * decide whether it is 適正 / 期限間近 / 期限超過 / 未記録 and when it is next due.
 *
 * This is the read-side complement to the engine's {@link identifyMissing}
 * (which only emits overdue/no-record warnings). It powers the interactive
 * "前回実施日トラッカー" so a safety officer can clear the noise of "everything
 * is unrecorded" and see only what is actually about to lapse.
 *
 * Month math uses the same calendar-month convention as the engine
 * (`(refY-lastY)*12 + (refM-lastM)`) so overdue thresholds stay consistent.
 * Pure and deterministic: `referenceDate` is injected for tests.
 */

export type CheckupTimingStatus = "unrecorded" | "overdue" | "due-soon" | "ok";

export interface CheckupTiming {
  status: CheckupTimingStatus;
  /** Whole calendar months since the last exam (null when unrecorded/invalid). */
  monthsSince: number | null;
  /** Whole calendar months until the next legal deadline; negative = overdue. */
  monthsUntilDue: number | null;
  /** Next legal deadline as YYYY-MM-DD (null when unrecorded/invalid). */
  nextDueDate: string | null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(iso: string): Date | null {
  const m = ISO_DATE.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  // Noon local time avoids UTC/local off-by-one around midnight.
  return new Date(y, mm - 1, dd, 12, 0, 0, 0);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonthsClamped(d: Date, months: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Window (in months) before the legal deadline within which a checkup is
 * flagged 期限間近. Narrower for short intervals so e.g. a monthly exam is not
 * permanently "due soon". Capped at 2 months.
 */
export function dueSoonWindow(intervalMonths: number): number {
  if (intervalMonths <= 0) return 0;
  return Math.min(2, intervalMonths);
}

/**
 * Classify a single periodic checkup. Event-driven exams (intervalMonths === 0)
 * are not periodic — callers should surface those as 随時実施 instead of feeding
 * them here; if passed, they resolve to "unrecorded"/"ok" without a deadline.
 */
export function classifyCheckupTiming(
  intervalMonths: number,
  lastPerformed: string | undefined | null,
  referenceDate: Date = new Date(),
): CheckupTiming {
  if (!lastPerformed) {
    return { status: "unrecorded", monthsSince: null, monthsUntilDue: null, nextDueDate: null };
  }
  const last = parseIsoDate(lastPerformed);
  if (!last) {
    return { status: "unrecorded", monthsSince: null, monthsUntilDue: null, nextDueDate: null };
  }

  const monthsSince =
    (referenceDate.getFullYear() - last.getFullYear()) * 12 +
    (referenceDate.getMonth() - last.getMonth());

  // Event-driven / no interval: recorded but nothing periodic to chase.
  if (intervalMonths <= 0) {
    return { status: "ok", monthsSince, monthsUntilDue: null, nextDueDate: null };
  }

  const nextDueDate = toIso(addMonthsClamped(last, intervalMonths));
  const monthsUntilDue = intervalMonths - monthsSince;

  let status: CheckupTimingStatus;
  if (monthsSince > intervalMonths) {
    status = "overdue";
  } else if (monthsUntilDue <= dueSoonWindow(intervalMonths)) {
    status = "due-soon";
  } else {
    status = "ok";
  }

  return { status, monthsSince, monthsUntilDue, nextDueDate };
}

export const CHECKUP_TIMING_LABELS: Record<CheckupTimingStatus, string> = {
  unrecorded: "未記録",
  overdue: "期限超過",
  "due-soon": "期限間近",
  ok: "適正",
};

/** Sort weight so the most urgent rows float to the top of the tracker. */
export const CHECKUP_TIMING_ORDER: Record<CheckupTimingStatus, number> = {
  overdue: 0,
  "due-soon": 1,
  unrecorded: 2,
  ok: 3,
};
