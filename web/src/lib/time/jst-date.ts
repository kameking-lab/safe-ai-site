const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Returns the calendar date in Japan Standard Time, independent of device TZ. */
export function jstDateKey(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

export function compareDateKeys(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = Date.parse(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}

export function relativeJstDateLabel(dateKey: string, now: Date = new Date()): string {
  const today = jstDateKey(now);
  if (!today || !dateKey) return dateKey;
  if (dateKey === today) return "今日";
  if (dateKey === addDaysToDateKey(today, 1)) return "明日";
  if (dateKey === addDaysToDateKey(today, 2)) return "明後日";
  return dateKey;
}

export type Freshness = "fresh" | "stale" | "unknown";

export function dataFreshness(
  fetchedAt: string | null | undefined,
  now: Date = new Date(),
  staleAfterMs = 15 * 60 * 1000,
): Freshness {
  if (!fetchedAt) return "unknown";
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(fetched)) return "unknown";
  const age = now.getTime() - fetched;
  return age >= 0 && age <= staleAfterMs ? "fresh" : "stale";
}
