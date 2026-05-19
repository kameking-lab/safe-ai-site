/**
 * Deterministic mock data used when VERCEL_TOKEN is not configured.
 *
 * Calibrated against the real May 2026 numbers documented in the
 * project handoff (ISR Writes ~1.1M, Edge Requests ~1.6M, Fast Origin
 * ~30GB) so the dashboard reads "as if we were already on Hobby and
 * blowing through the caps" — that is the scenario the user actually
 * needs to plan for.
 */

import { currentBillingPeriod } from "./period";
import type { QuotaKey, UsageSnapshot, UsageTrendPoint } from "./types";
import { HOBBY_LIMITS } from "./limits";

const DAILY_TARGETS: Record<QuotaKey, number> = {
  bandwidth: 0.6,
  functionInvocations: 1_200,
  buildExecutionMinutes: 30,
  edgeRequests: 53_000,
  isrWrites: 36_000,
  imageOptimization: 18,
  fastOriginTransfer: 1.0,
};

export function buildMockSnapshot(now: Date = new Date()): UsageSnapshot {
  const period = currentBillingPeriod(now);
  const trend: UsageTrendPoint[] = [];

  const samples = (Object.keys(HOBBY_LIMITS) as QuotaKey[]).map((key) => {
    const spec = HOBBY_LIMITS[key];
    const dailyAvg = DAILY_TARGETS[key];
    const current = dailyAvg * period.daysIntoPeriod;
    const limit = spec.hobbyLimit;
    const percent = limit && limit > 0 ? (current / limit) * 100 : null;
    return { key, spec, current, limit, percent };
  });

  for (let i = period.daysIntoPeriod - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - i);
    const date = day.toISOString().slice(0, 10);
    const values: Partial<Record<QuotaKey, number>> = {};
    for (const key of Object.keys(DAILY_TARGETS) as QuotaKey[]) {
      const base = DAILY_TARGETS[key];
      const wobble = 0.85 + ((seed(date + key) % 30) / 100);
      values[key] = base * wobble;
    }
    trend.push({ date, values });
  }

  return {
    generatedAt: now.toISOString(),
    source: "mock",
    warningMessage:
      "VERCEL_TOKEN が未設定のためモックデータを表示しています。実数値を見るには VERCEL_TOKEN と VERCEL_TEAM_ID を環境変数に設定してください。",
    period,
    samples,
    trend,
  };
}

function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
