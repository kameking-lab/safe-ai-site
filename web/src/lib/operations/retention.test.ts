import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { planOperationsRetention, purgeOperationsRetention } from "./retention";

describe("operations retention", () => {
  it("supports a non-mutating dry-run and idempotent purge", async () => {
    const state = { rum: 2, rates: 1, funnel: 3 };
    const database = {
      $transaction: (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      rumMetric: {
        count: async () => state.rum,
        deleteMany: async () => {
          const count = state.rum;
          state.rum = 0;
          return { count };
        },
      },
      rumRateBucket: {
        count: async () => state.rates,
        deleteMany: async () => {
          const count = state.rates;
          state.rates = 0;
          return { count };
        },
      },
      automationFunnelEvent: {
        count: async () => state.funnel,
        deleteMany: async () => {
          const count = state.funnel;
          state.funnel = 0;
          return { count };
        },
      },
    } as unknown as PrismaClient;
    const now = new Date("2026-07-29T00:00:00Z");

    await expect(planOperationsRetention(database, now)).resolves.toEqual({
      rumMetrics: 2,
      rumRateBuckets: 1,
      funnelEvents: 3,
      funnelStore: "available",
    });
    expect(state).toEqual({ rum: 2, rates: 1, funnel: 3 });
    await expect(purgeOperationsRetention(database, now)).resolves.toEqual({
      rumMetrics: 2,
      rumRateBuckets: 1,
      funnelEvents: 3,
      funnelStore: "available",
    });
    await expect(purgeOperationsRetention(database, now)).resolves.toEqual({
      rumMetrics: 0,
      rumRateBuckets: 0,
      funnelEvents: 0,
      funnelStore: "available",
    });
  });

  it("keeps RUM expiry independent when the optional funnel store is unavailable", async () => {
    const state = { rum: 2, rates: 1, funnel: 3 };
    const database = {
      $transaction: (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      rumMetric: {
        count: async () => state.rum,
        deleteMany: async () => {
          const count = state.rum;
          state.rum = 0;
          return { count };
        },
      },
      rumRateBucket: {
        count: async () => state.rates,
        deleteMany: async () => {
          const count = state.rates;
          state.rates = 0;
          return { count };
        },
      },
      automationFunnelEvent: {
        count: async () => {
          throw new Error("must_not_be_called");
        },
        deleteMany: async () => {
          throw new Error("must_not_be_called");
        },
      },
    } as unknown as PrismaClient;
    const now = new Date("2026-07-29T00:00:00Z");

    await expect(planOperationsRetention(database, now)).resolves.toEqual({
      rumMetrics: 2,
      rumRateBuckets: 1,
      funnelEvents: null,
      funnelStore: "unavailable",
    });
    await expect(purgeOperationsRetention(database, now)).resolves.toEqual({
      rumMetrics: 2,
      rumRateBuckets: 1,
      funnelEvents: null,
      funnelStore: "unavailable",
    });
    expect(state).toEqual({ rum: 0, rates: 0, funnel: 3 });
  });
});
