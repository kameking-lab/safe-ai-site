import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  aggregateAutomationFunnel,
  calculateFunnelRates,
} from "./funnel-aggregation";

describe("automation funnel aggregation", () => {
  it("uses explicit denominators and keeps unavailable separate from normal exit", () => {
    const rates = calculateFunnelRates({
      automation_service_view: 100,
      automation_pricing_view: 40,
      automation_example_select: 10,
      automation_cta_click: 20,
      automation_form_start: 10,
      automation_form_unavailable: 30,
      automation_form_validation_error: 2,
      automation_form_success: 4,
    });
    expect(rates).toEqual({
      pricingViewRate: 0.4,
      ctaClickRate: 0.2,
      formStartRate: 0.5,
      unavailableRate: 0.3,
      validationErrorRate: 0.2,
      completionRate: 0.4,
    });
  });

  it("aggregates counts without returning anonymous bucket values", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { event: "automation_service_view", sampleCount: BigInt(10) },
        { event: "automation_cta_click", sampleCount: BigInt(3) },
        { event: "automation_form_unavailable", sampleCount: BigInt(2) },
      ])
      .mockResolvedValueOnce([
        { event: "automation_service_view", sampleCount: BigInt(8) },
      ])
      .mockResolvedValueOnce([
        {
          sampleCount: BigInt(15),
          distinctBuckets: BigInt(2),
          deploymentCount: BigInt(1),
          firstAt: new Date("2026-07-29T00:00:00Z"),
          lastAt: new Date("2026-07-29T01:00:00Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          dimension: "mobile",
          event: "automation_service_view",
          sampleCount: BigInt(10),
        },
      ])
      .mockResolvedValueOnce([
        {
          dimension: "hero",
          event: "automation_cta_click",
          sampleCount: BigInt(3),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const database = { $queryRaw: query } as unknown as PrismaClient;
    const result = await aggregateAutomationFunnel(
      database,
      new Date("2026-07-29T02:00:00Z"),
    );
    expect(result.available).toBe(true);
    expect(result.counts.automation_service_view).toBe(10);
    expect(result.rates.ctaClickRate).toBe(0.3);
    expect(result.rates.unavailableRate).toBe(0.2);
    expect(result.distinctAnonymousBuckets).toBe(2);
    expect(JSON.stringify(result)).not.toContain("anonymous_bucket");
    expect(JSON.stringify(result)).not.toContain("af_");
  });
});
