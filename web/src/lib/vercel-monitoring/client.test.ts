import { describe, expect, it } from "vitest";
import { normalizeUsageResponse } from "./client";
import { HOBBY_LIMITS } from "./limits";

const NOW = new Date("2026-05-20T00:00:00Z");

describe("normalizeUsageResponse", () => {
  it("maps known Vercel metric names to quota keys", () => {
    const snapshot = normalizeUsageResponse(
      {
        usage: [
          { metric: "bandwidth", value: 50 },
          { metric: "functionInvocations", value: 75_000 },
          { metric: "isrWrites", value: 220_000 },
          { metric: "edgeMiddlewareInvocations", value: 12_345 }, // unrecognized → ignored
        ],
        trend: [
          { date: "2026-05-19", metric: "isrWrites", value: 35_000 },
          { day: "2026-05-19", metric: "bandwidth", value: 0.5 },
        ],
      },
      NOW,
      "live"
    );

    const bandwidth = snapshot.samples.find((s) => s.key === "bandwidth")!;
    expect(bandwidth.current).toBe(50);
    expect(bandwidth.percent).toBeCloseTo(50);

    const isr = snapshot.samples.find((s) => s.key === "isrWrites")!;
    expect(isr.current).toBe(220_000);
    expect(isr.percent! > 100).toBe(true);

    const trendPoint = snapshot.trend.find((p) => p.date === "2026-05-19")!;
    expect(trendPoint.values.isrWrites).toBe(35_000);
    expect(trendPoint.values.bandwidth).toBeCloseTo(0.5);

    expect(snapshot.source).toBe("live");
    expect(snapshot.period.end.endsWith("T00:00:00.000Z")).toBe(true);
  });

  it("tolerates the `data` key in place of `usage`", () => {
    const snapshot = normalizeUsageResponse(
      { data: [{ name: "Bandwidth", used: 10 }] },
      NOW,
      "live"
    );
    const bandwidth = snapshot.samples.find((s) => s.key === "bandwidth")!;
    expect(bandwidth.current).toBe(10);
  });

  it("defaults every quota to zero when the response is empty", () => {
    const snapshot = normalizeUsageResponse({}, NOW, "live");
    for (const sample of snapshot.samples) {
      expect(sample.current).toBe(0);
      if (sample.limit !== null) {
        expect(sample.percent).toBe(0);
      }
    }
    expect(snapshot.samples).toHaveLength(Object.keys(HOBBY_LIMITS).length);
  });
});
