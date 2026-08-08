import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL?.trim()) {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../.env.local"));
  } catch {
    // The caller may provide DATABASE_URL through the deployment environment.
  }
}
if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient();

function jsonSafe(value) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]),
    );
  }
  return value;
}

try {
  const [rumSummary, rumMetrics, rumRoutes, funnelTable] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS "sampleCount",
        COUNT(DISTINCT "anonymousBucket")::bigint AS "distinctBuckets",
        MIN("createdAt") AS "firstAt",
        MAX("createdAt") AS "lastAt",
        COUNT(DISTINCT "buildId")::bigint AS "deploymentCount",
        COUNT(DISTINCT (
          ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo'
        )::date)::bigint AS "observedDayCount"
      FROM "RumMetric"
      WHERE "expiresAt" > NOW()
    `,
    prisma.$queryRaw`
      SELECT "metric",
        COUNT(*)::bigint AS "sampleCount",
        (percentile_cont(0.50) WITHIN GROUP (
          ORDER BY "value"
        ))::double precision AS "p50",
        (percentile_cont(0.75) WITHIN GROUP (
          ORDER BY "value"
        ))::double precision AS "p75",
        (percentile_cont(0.95) WITHIN GROUP (
          ORDER BY "value"
        ))::double precision AS "p95"
      FROM "RumMetric"
      WHERE "expiresAt" > NOW()
      GROUP BY "metric"
      ORDER BY "metric"
    `,
    prisma.$queryRaw`
      SELECT "routeTemplate",
        COUNT(*)::bigint AS "sampleCount",
        COUNT(DISTINCT "anonymousBucket")::bigint AS "distinctBuckets",
        MIN("createdAt") AS "firstAt",
        MAX("createdAt") AS "lastAt",
        COUNT(DISTINCT "buildId")::bigint AS "deploymentCount",
        COUNT(DISTINCT (
          ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo'
        )::date)::bigint AS "observedDayCount"
      FROM "RumMetric"
      WHERE "expiresAt" > NOW()
      GROUP BY "routeTemplate"
      ORDER BY "routeTemplate"
    `,
    prisma.$queryRaw`
      SELECT to_regclass('"AutomationFunnelEvent"') IS NOT NULL AS "present"
    `,
  ]);

  let funnel = {
    status: "migration-pending",
    sampleCount: 0,
    distinctBuckets: 0,
    firstAt: null,
    lastAt: null,
    deploymentCount: 0,
    counts: [],
    deviceCounts: [],
    ctaPositionCounts: [],
  };
  if (funnelTable[0]?.present) {
    const [summary, counts, deviceCounts, ctaPositionCounts] =
      await Promise.all([
        prisma.$queryRaw`
          SELECT COUNT(*)::bigint AS "sampleCount",
            COUNT(DISTINCT "anonymousBucket")::bigint AS "distinctBuckets",
            MIN("createdAt") AS "firstAt",
            MAX("createdAt") AS "lastAt",
            COUNT(DISTINCT "deployment")::bigint AS "deploymentCount"
          FROM "AutomationFunnelEvent"
          WHERE "expiresAt" > NOW()
        `,
        prisma.$queryRaw`
          SELECT "event", COUNT(*)::bigint AS "sampleCount"
          FROM "AutomationFunnelEvent"
          WHERE "expiresAt" > NOW()
          GROUP BY "event"
          ORDER BY "event"
        `,
        prisma.$queryRaw`
          SELECT "deviceClass", COUNT(*)::bigint AS "sampleCount"
          FROM "AutomationFunnelEvent"
          WHERE "expiresAt" > NOW()
          GROUP BY "deviceClass"
          ORDER BY "deviceClass"
        `,
        prisma.$queryRaw`
          SELECT "ctaPosition", COUNT(*)::bigint AS "sampleCount"
          FROM "AutomationFunnelEvent"
          WHERE "expiresAt" > NOW() AND "ctaPosition" IS NOT NULL
          GROUP BY "ctaPosition"
          ORDER BY "ctaPosition"
        `,
      ]);
    funnel = {
      status: "active",
      ...(summary[0] ?? {}),
      counts,
      deviceCounts,
      ctaPositionCounts,
    };
  }

  process.stdout.write(
    `${JSON.stringify(
      jsonSafe({
        generatedAt: new Date().toISOString(),
        privacy:
          "aggregate-only; no bucket values, IP, query, URL, user agent, consultation fields, or PII",
        rum: {
          ...(rumSummary[0] ?? {}),
          metrics: rumMetrics,
          routes: rumRoutes,
        },
        funnel,
      }),
      null,
      2,
    )}\n`,
  );
} finally {
  await prisma.$disconnect();
}
