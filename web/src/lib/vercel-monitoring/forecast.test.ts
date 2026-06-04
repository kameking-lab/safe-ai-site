import { describe, expect, it } from "vitest";
import { judgeHobbyReadiness } from "./forecast";
import { HOBBY_LIMITS, QUOTA_ORDER } from "./limits";
import { currentBillingPeriod } from "./period";
import type { QuotaKey, UsageSnapshot, UsageTrendPoint } from "./types";

const NOW = new Date("2026-05-20T00:00:00Z");

function buildSnapshot(
  dailyPerKey: Partial<Record<QuotaKey, number>>,
  days: number = 14
): UsageSnapshot {
  const trend: UsageTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() - i);
    trend.push({ date: d.toISOString().slice(0, 10), values: { ...dailyPerKey } });
  }
  const samples = QUOTA_ORDER.map((key) => {
    const spec = HOBBY_LIMITS[key];
    return { key, spec, current: 0, limit: spec.hobbyLimit, percent: null };
  });
  return {
    generatedAt: NOW.toISOString(),
    source: "mock",
    period: currentBillingPeriod(NOW),
    samples,
    trend,
  };
}

describe("judgeHobbyReadiness", () => {
  it("marks all-low usage as ready", () => {
    const snapshot = buildSnapshot({
      bandwidth: 0.1,
      functionInvocations: 100,
      buildExecutionMinutes: 5,
      edgeRequests: 5_000,
      isrWrites: 1_000,
      imageOptimization: 5,
      fastOriginTransfer: 0.1,
    });
    const result = judgeHobbyReadiness(snapshot, NOW.getTime());
    expect(result.status).toBe("ready");
    expect(result.recommendations).toHaveLength(0);
  });

  it("flags isrWrites and edgeRequests as blocked at May 2026 actual pace", () => {
    const snapshot = buildSnapshot({
      isrWrites: 36_000,
      edgeRequests: 53_000,
    });
    const result = judgeHobbyReadiness(snapshot, NOW.getTime());
    expect(result.status).toBe("blocked");
    const isr = result.projections.find((p) => p.key === "isrWrites")!;
    expect(isr.verdict).toBe("blocked");
    expect(isr.projected).toBeGreaterThan(HOBBY_LIMITS.isrWrites.hobbyLimit!);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes("ISR Writes"))).toBe(true);
  });

  it("flags borderline state at exactly the warn threshold", () => {
    const isrLimit = HOBBY_LIMITS.isrWrites.hobbyLimit!;
    const borderlineDaily = (isrLimit * 0.85) / 30;
    const snapshot = buildSnapshot({ isrWrites: borderlineDaily });
    const result = judgeHobbyReadiness(snapshot, NOW.getTime());
    const isr = result.projections.find((p) => p.key === "isrWrites")!;
    expect(isr.verdict).toBe("borderline");
    expect(result.status).toBe("borderline");
  });

  it("returns unknown when there is no recent trend data", () => {
    const snapshot: UsageSnapshot = {
      generatedAt: NOW.toISOString(),
      source: "mock",
      period: currentBillingPeriod(NOW),
      samples: QUOTA_ORDER.map((key) => ({
        key,
        spec: HOBBY_LIMITS[key],
        current: 0,
        limit: HOBBY_LIMITS[key].hobbyLimit,
        percent: null,
      })),
      trend: [],
    };
    const result = judgeHobbyReadiness(snapshot, NOW.getTime());
    expect(result.status).toBe("ready");
    for (const p of result.projections) {
      if (p.limit === null) {
        expect(p.verdict).toBe("unknown");
      } else {
        expect(p.verdict).toBe("unknown");
      }
    }
  });
});
