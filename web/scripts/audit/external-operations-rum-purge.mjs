#!/usr/bin/env node

/**
 * Explicit RUM-only delete/disable runbook.
 *
 * Default execution refuses to write. `--dry-run` reports only aggregate row
 * counts. A purge requires both `--confirm-rum-purge` and
 * `--collection-disabled-verified`, after RUM_COLLECTION_ENABLED has been
 * disabled and deployed. Automation consultation tables are never referenced.
 */
import { PrismaClient } from "@prisma/client";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const purge = args.has("--confirm-rum-purge");
const collectionDisabledVerified = args.has(
  "--collection-disabled-verified",
);

if (dryRun === purge) {
  throw new Error(
    "Choose exactly one of --dry-run or --confirm-rum-purge",
  );
}
if (purge && !collectionDisabledVerified) {
  throw new Error(
    "Purge requires --collection-disabled-verified after disabling collection",
  );
}
if (
  purge &&
  process.env.RUM_COLLECTION_ENABLED?.trim().toLowerCase() === "true"
) {
  throw new Error(
    "Purge refused while RUM_COLLECTION_ENABLED is still true",
  );
}
if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const database = new PrismaClient({ log: [] });
try {
  if (dryRun) {
    const [metrics, rateBuckets] = await Promise.all([
      database.rumMetric.count(),
      database.rumRateBucket.count(),
    ]);
    process.stdout.write(
      `${JSON.stringify({
        mode: "dry-run",
        metrics,
        rateBuckets,
        deleted: false,
        automationTablesTouched: false,
        valuesIncluded: false,
        piiIncluded: false,
      })}\n`,
    );
  } else {
    const [metrics, rateBuckets] = await database.$transaction([
      database.rumMetric.deleteMany(),
      database.rumRateBucket.deleteMany(),
    ]);
    process.stdout.write(
      `${JSON.stringify({
        mode: "confirmed-rum-only-purge",
        metricsDeleted: metrics.count,
        rateBucketsDeleted: rateBuckets.count,
        automationTablesTouched: false,
        valuesIncluded: false,
        piiIncluded: false,
      })}\n`,
    );
  }
} finally {
  await database.$disconnect().catch(() => undefined);
}
