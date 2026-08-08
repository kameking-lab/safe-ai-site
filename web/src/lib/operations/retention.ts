import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OperationsRetentionResult = {
  rumMetrics: number;
  rumRateBuckets: number;
  funnelEvents: number | null;
  funnelStore: "available" | "unavailable";
};

/** Read-only expiry plan. The returned counts never contain event payloads. */
export async function planOperationsRetention(
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<OperationsRetentionResult> {
  if (!database) throw new Error("operations_retention_database_unavailable");
  const [rumMetrics, rumRateBuckets] = await database.$transaction([
    database.rumMetric.count({ where: { expiresAt: { lte: now } } }),
    database.rumRateBucket.count({ where: { expiresAt: { lte: now } } }),
  ]);
  try {
    const funnelEvents = await database.automationFunnelEvent.count({
      where: { expiresAt: { lte: now } },
    });
    return {
      rumMetrics,
      rumRateBuckets,
      funnelEvents,
      funnelStore: "available",
    };
  } catch {
    return {
      rumMetrics,
      rumRateBuckets,
      funnelEvents: null,
      funnelStore: "unavailable",
    };
  }
}

/**
 * Deletes only rows whose server-generated expiresAt is due. Re-running at the
 * same timestamp is safe and returns zero once all due rows are gone.
 */
export async function purgeOperationsRetention(
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<OperationsRetentionResult> {
  if (!database) throw new Error("operations_retention_database_unavailable");
  const [rumMetrics, rumRateBuckets] = await database.$transaction([
    database.rumMetric.deleteMany({ where: { expiresAt: { lte: now } } }),
    database.rumRateBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  try {
    const funnelEvents = await database.automationFunnelEvent.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return {
      rumMetrics: rumMetrics.count,
      rumRateBuckets: rumRateBuckets.count,
      funnelEvents: funnelEvents.count,
      funnelStore: "available",
    };
  } catch {
    // The additive funnel table can be absent during rollout/rollback. RUM
    // deletion has already completed and must never be rolled back or skipped.
    return {
      rumMetrics: rumMetrics.count,
      rumRateBuckets: rumRateBuckets.count,
      funnelEvents: null,
      funnelStore: "unavailable",
    };
  }
}
