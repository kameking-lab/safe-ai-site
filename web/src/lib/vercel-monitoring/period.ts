import type { BillingPeriod } from "./types";

/**
 * Vercel billing periods reset on the 1st of each UTC month for Hobby/Pro
 * plans on the default cycle. The dashboard surfaces the period boundary
 * so the user can read "we still have N days before quotas reset".
 */
export function currentBillingPeriod(now: Date = new Date()): BillingPeriod {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay);
  const daysIntoPeriod = Math.min(
    totalDays,
    Math.max(1, Math.floor((now.getTime() - start.getTime()) / msPerDay) + 1)
  );
  const daysRemaining = Math.max(0, totalDays - daysIntoPeriod);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    daysIntoPeriod,
    daysRemaining,
    totalDays,
  };
}
