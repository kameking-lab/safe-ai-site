const MAX_FORECAST_DAYS = 6;

function jstDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function resolveForecastTargetDate(
  raw: string | null,
  now = new Date(),
): { date: string; daysAhead: number } | null {
  const today = jstDate(now);
  const date = raw || today;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return null;
  const targetMs = Date.parse(`${date}T00:00:00+09:00`);
  const todayMs = Date.parse(`${today}T00:00:00+09:00`);
  if (!Number.isFinite(targetMs) || !Number.isFinite(todayMs)) return null;
  const daysAhead = Math.round((targetMs - todayMs) / 86_400_000);
  if (daysAhead < 0 || daysAhead > MAX_FORECAST_DAYS) return null;
  return { date, daysAhead };
}
