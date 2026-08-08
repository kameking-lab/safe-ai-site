import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { aggregateRum, hasSufficientRumRouteData } from "./rum-aggregation";

const currentMetric = {
  routeTemplate: "/safety-ai",
  metric: "LCP",
  sampleCount: BigInt(2),
  distinctBuckets: BigInt(2),
  firstAt: new Date("2026-07-29T06:22:31.013Z"),
  lastAt: new Date("2026-07-29T06:25:24.133Z"),
  deploymentCount: BigInt(2),
  p50: 152,
  p75: 154,
  p95: 155.6,
  good: BigInt(2),
  needsImprovement: BigInt(0),
  poor: BigInt(0),
};

describe("RUM route aggregation", () => {
  it("accepts either 100 route samples or observations on 7 JST dates", () => {
    expect(hasSufficientRumRouteData(100, 1)).toBe(true);
    expect(hasSufficientRumRouteData(10, 7)).toBe(true);
    expect(hasSufficientRumRouteData(99, 6)).toBe(false);
    expect(hasSufficientRumRouteData([20, 20, 20, 20, 20], 1)).toBe(false);
    expect(hasSufficientRumRouteData([100, 100, 100], 1)).toBe(true);
    expect(hasSufficientRumRouteData([100, 20], 1)).toBe(false);
    expect(hasSufficientRumRouteData([], 7)).toBe(false);
  });

  it("shows percentiles but marks the real small sample as insufficient", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([currentMetric])
      .mockResolvedValueOnce([{ ...currentMetric, p75: 160 }])
      .mockResolvedValueOnce([
        Object.fromEntries(
          Object.entries(currentMetric).filter(
            ([key]) => key !== "routeTemplate",
          ),
        ),
      ])
      .mockResolvedValueOnce([
        {
          ...Object.fromEntries(
            Object.entries(currentMetric).filter(
              ([key]) => key !== "routeTemplate",
            ),
          ),
          p75: 160,
        },
      ])
      .mockResolvedValueOnce([
        {
          routeTemplate: "/safety-ai",
          sampleCount: BigInt(11),
          distinctBuckets: BigInt(2),
          firstAt: new Date("2026-07-29T06:22:31.013Z"),
          lastAt: new Date("2026-07-29T06:25:24.133Z"),
          deploymentCount: BigInt(2),
          observedDayCount: BigInt(1),
        },
      ])
      .mockResolvedValueOnce([
        {
          sampleCount: BigInt(11),
          distinctBuckets: BigInt(2),
          firstAt: new Date("2026-07-29T06:22:31.013Z"),
          lastAt: new Date("2026-07-29T06:25:24.133Z"),
          deploymentCount: BigInt(2),
          observedDayCount: BigInt(1),
        },
      ])
      .mockResolvedValueOnce([
        {
          routeTemplate: "/safety-ai",
          dimension: "mobile",
          sampleCount: BigInt(11),
        },
      ])
      .mockResolvedValueOnce([
        {
          routeTemplate: "/safety-ai",
          dimension: "fast",
          sampleCount: BigInt(11),
        },
      ])
      .mockResolvedValueOnce([
        {
          routeTemplate: "/safety-ai",
          dimension: "navigate",
          sampleCount: BigInt(11),
        },
      ])
      .mockResolvedValueOnce([
        {
          routeTemplate: "/safety-ai",
          dimension: "build_one",
          sampleCount: BigInt(11),
        },
      ])
      .mockResolvedValueOnce([
        {
          ...Object.fromEntries(
            Object.entries(currentMetric).filter(
              ([key]) => key !== "routeTemplate",
            ),
          ),
          deployment: "build_one",
        },
      ]);
    const database = { $queryRaw: query } as unknown as PrismaClient;
    const result = await aggregateRum(
      database,
      new Date("2026-07-29T07:00:00Z"),
    );
    const route = result.routes.find(
      (item) => item.routeTemplate === "/safety-ai",
    );
    const lcp = route?.metrics.find((metric) => metric.metric === "LCP");
    expect(result.available).toBe(true);
    expect(result.sampleCount).toBe(11);
    expect(result.distinctAnonymousBuckets).toBe(2);
    expect(route?.dataSufficient).toBe(false);
    expect(route?.sufficiencyReason).toBe("insufficient");
    expect(route?.minimumMetricSampleCount).toBe(2);
    expect(lcp).toMatchObject({
      p50: 152,
      p75: 154,
      p95: 155.6,
      p75Change: -6,
      trend: "improved",
    });
    expect(result.insufficientRouteCount).toBe(11);
    expect(result.deploymentComparisons[0]).toMatchObject({
      deployment: "build_one",
      metrics: [
        expect.objectContaining({ metric: "LCP", p75: 154 }),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      ],
    });
  });
});
