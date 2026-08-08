import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RUM_ROUTE_TEMPLATES } from "@/lib/rum/schema";

export const RUM_MIN_ROUTE_SAMPLES = 100;
export const RUM_MIN_ROUTE_RANGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1_000;

export function hasSufficientRumRouteData(
  metricSampleCounts: number | readonly number[],
  observedDayCount: number,
): boolean {
  const counts = (
    Array.isArray(metricSampleCounts)
      ? metricSampleCounts
      : [metricSampleCounts]
  ).filter((sampleCount) => sampleCount > 0);
  if (counts.length === 0) return false;
  return (
    counts.every((sampleCount) => sampleCount >= RUM_MIN_ROUTE_SAMPLES) ||
    observedDayCount >= RUM_MIN_ROUTE_RANGE_DAYS
  );
}

type MetricName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";

type RawMetricRow = {
  routeTemplate: string;
  metric: string;
  sampleCount: bigint | number;
  distinctBuckets: bigint | number;
  firstAt: Date | null;
  lastAt: Date | null;
  deploymentCount: bigint | number;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  good: bigint | number;
  needsImprovement: bigint | number;
  poor: bigint | number;
};

type RawOverallMetricRow = Omit<RawMetricRow, "routeTemplate">;
type RawDeploymentMetricRow = RawOverallMetricRow & {
  deployment: string;
};
type RawRouteRow = {
  routeTemplate: string;
  sampleCount: bigint | number;
  distinctBuckets: bigint | number;
  firstAt: Date | null;
  lastAt: Date | null;
  deploymentCount: bigint | number;
  observedDayCount: bigint | number;
};
type RawGlobalRow = Omit<RawRouteRow, "routeTemplate">;
type RawDimensionRow = {
  routeTemplate: string;
  dimension: string;
  sampleCount: bigint | number;
};

export type RumMetricSummary = {
  metric: MetricName;
  sampleCount: number;
  distinctAnonymousBuckets: number;
  deploymentCount: number;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  rating: "good" | "needs-improvement" | "poor" | "no-data";
  good: number;
  needsImprovement: number;
  poor: number;
  previousP75: number | null;
  p75Change: number | null;
  trend: "improved" | "worsened" | "unchanged" | "no-comparison";
};

export type RumRouteSummary = {
  routeTemplate: string;
  sampleCount: number;
  distinctAnonymousBuckets: number;
  firstAt: string | null;
  lastAt: string | null;
  dateRangeDays: number;
  observedDayCount: number;
  deploymentCount: number;
  minimumMetricSampleCount: number;
  deviceClasses: Array<{ value: string; sampleCount: number }>;
  connectionClasses: Array<{ value: string; sampleCount: number }>;
  navigationTypes: Array<{ value: string; sampleCount: number }>;
  deployments: Array<{ value: string; sampleCount: number }>;
  dataSufficient: boolean;
  sufficiencyReason: "sample-count" | "date-range" | "insufficient" | "no-data";
  metrics: RumMetricSummary[];
};

export type RumDeploymentComparison = {
  deployment: string;
  sampleCount: number;
  firstAt: string | null;
  lastAt: string | null;
  metrics: RumMetricSummary[];
};

export type RumAggregationResult = {
  available: boolean;
  generatedAt: string;
  period: { start: string; end: string; days: number };
  previousPeriod: { start: string; end: string; days: number };
  actualRange: { firstAt: string | null; lastAt: string | null };
  sampleCount: number;
  distinctAnonymousBuckets: number;
  deploymentCount: number;
  routes: RumRouteSummary[];
  overallMetrics: RumMetricSummary[];
  deploymentComparisons: RumDeploymentComparison[];
  insufficientRouteCount: number;
  errorCode?: "database-unavailable" | "aggregation-unavailable";
};

function count(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  return Number(value ?? 0);
}

function dateRangeDays(first: Date | null, last: Date | null): number {
  if (!first || !last) return 0;
  return Math.max(0, (last.getTime() - first.getTime()) / DAY_MS);
}

function metricRating(
  metric: MetricName,
  value: number | null,
): RumMetricSummary["rating"] {
  if (value === null) return "no-data";
  const thresholds: Record<MetricName, [number, number]> = {
    LCP: [2_500, 4_000],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    FCP: [1_800, 3_000],
    TTFB: [800, 1_800],
  };
  const [good, needsImprovement] = thresholds[metric];
  if (value <= good) return "good";
  if (value <= needsImprovement) return "needs-improvement";
  return "poor";
}

function trend(
  current: number | null,
  previous: number | null,
): RumMetricSummary["trend"] {
  if (current === null || previous === null) return "no-comparison";
  const delta = current - previous;
  if (Math.abs(delta) < 0.000_001) return "unchanged";
  return delta < 0 ? "improved" : "worsened";
}

function normalizeMetric(
  row: RawMetricRow | RawOverallMetricRow | undefined,
  previous: RawMetricRow | RawOverallMetricRow | undefined,
  metric: MetricName,
): RumMetricSummary {
  const p75 =
    row?.p75 === null || row?.p75 === undefined ? null : Number(row.p75);
  const previousP75 =
    previous?.p75 === null || previous?.p75 === undefined
      ? null
      : Number(previous.p75);
  return {
    metric,
    sampleCount: count(row?.sampleCount),
    distinctAnonymousBuckets: count(row?.distinctBuckets),
    deploymentCount: count(row?.deploymentCount),
    p50: row?.p50 === null || row?.p50 === undefined ? null : Number(row.p50),
    p75,
    p95: row?.p95 === null || row?.p95 === undefined ? null : Number(row.p95),
    rating: metricRating(metric, p75),
    good: count(row?.good),
    needsImprovement: count(row?.needsImprovement),
    poor: count(row?.poor),
    previousP75,
    p75Change: p75 === null || previousP75 === null ? null : p75 - previousP75,
    trend: trend(p75, previousP75),
  };
}

function dimensionMap(rows: RawDimensionRow[]) {
  const result = new Map<
    string,
    Array<{ value: string; sampleCount: number }>
  >();
  for (const row of rows) {
    const current = result.get(row.routeTemplate) ?? [];
    current.push({ value: row.dimension, sampleCount: count(row.sampleCount) });
    result.set(row.routeTemplate, current);
  }
  return result;
}

const METRICS: MetricName[] = ["LCP", "CLS", "INP", "FCP", "TTFB"];

function metricSql(start: Date, end: Date, byRoute: boolean) {
  const routeSelect = byRoute
    ? Prisma.sql`"routeTemplate" AS "routeTemplate",`
    : Prisma.empty;
  const routeGroup = byRoute ? Prisma.sql`"routeTemplate",` : Prisma.empty;
  return Prisma.sql`
    SELECT
      ${routeSelect}
      "metric" AS "metric",
      COUNT(*)::bigint AS "sampleCount",
      COUNT(DISTINCT "anonymousBucket")::bigint AS "distinctBuckets",
      MIN("createdAt") AS "firstAt",
      MAX("createdAt") AS "lastAt",
      COUNT(DISTINCT "buildId")::bigint AS "deploymentCount",
      (percentile_cont(0.50) WITHIN GROUP (ORDER BY "value"))::double precision AS "p50",
      (percentile_cont(0.75) WITHIN GROUP (ORDER BY "value"))::double precision AS "p75",
      (percentile_cont(0.95) WITHIN GROUP (ORDER BY "value"))::double precision AS "p95",
      COUNT(*) FILTER (WHERE "rating" = 'good')::bigint AS "good",
      COUNT(*) FILTER (WHERE "rating" = 'needs-improvement')::bigint AS "needsImprovement",
      COUNT(*) FILTER (WHERE "rating" = 'poor')::bigint AS "poor"
    FROM "RumMetric"
    WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    GROUP BY ${routeGroup} "metric"
  `;
}

function dimensionSql(
  start: Date,
  end: Date,
  dimension: "deviceClass" | "connectionClass" | "navigationType" | "buildId",
) {
  if (dimension === "deviceClass") {
    return Prisma.sql`
      SELECT "routeTemplate", "deviceClass" AS "dimension",
        COUNT(*)::bigint AS "sampleCount"
      FROM "RumMetric"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      GROUP BY "routeTemplate", "deviceClass"
    `;
  }
  if (dimension === "connectionClass") {
    return Prisma.sql`
      SELECT "routeTemplate", "connectionClass" AS "dimension",
        COUNT(*)::bigint AS "sampleCount"
      FROM "RumMetric"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      GROUP BY "routeTemplate", "connectionClass"
    `;
  }
  if (dimension === "navigationType") {
    return Prisma.sql`
      SELECT "routeTemplate", "navigationType" AS "dimension",
        COUNT(*)::bigint AS "sampleCount"
      FROM "RumMetric"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      GROUP BY "routeTemplate", "navigationType"
    `;
  }
  return Prisma.sql`
    SELECT "routeTemplate", "buildId" AS "dimension",
      COUNT(*)::bigint AS "sampleCount"
    FROM "RumMetric"
    WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    GROUP BY "routeTemplate", "buildId"
  `;
}

function deploymentComparisonSql(start: Date, end: Date) {
  return Prisma.sql`
    WITH latest_deployments AS (
      SELECT "buildId", MAX("createdAt") AS "latestAt"
      FROM "RumMetric"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      GROUP BY "buildId"
      ORDER BY "latestAt" DESC
      LIMIT 2
    )
    SELECT metrics."buildId" AS "deployment",
      metrics."metric" AS "metric",
      COUNT(*)::bigint AS "sampleCount",
      COUNT(DISTINCT metrics."anonymousBucket")::bigint AS "distinctBuckets",
      MIN(metrics."createdAt") AS "firstAt",
      MAX(metrics."createdAt") AS "lastAt",
      1::bigint AS "deploymentCount",
      (percentile_cont(0.50) WITHIN GROUP (
        ORDER BY metrics."value"
      ))::double precision AS "p50",
      (percentile_cont(0.75) WITHIN GROUP (
        ORDER BY metrics."value"
      ))::double precision AS "p75",
      (percentile_cont(0.95) WITHIN GROUP (
        ORDER BY metrics."value"
      ))::double precision AS "p95",
      COUNT(*) FILTER (
        WHERE metrics."rating" = 'good'
      )::bigint AS "good",
      COUNT(*) FILTER (
        WHERE metrics."rating" = 'needs-improvement'
      )::bigint AS "needsImprovement",
      COUNT(*) FILTER (
        WHERE metrics."rating" = 'poor'
      )::bigint AS "poor"
    FROM "RumMetric" metrics
    INNER JOIN latest_deployments latest
      ON latest."buildId" = metrics."buildId"
    WHERE metrics."createdAt" >= ${start}
      AND metrics."createdAt" < ${end}
    GROUP BY metrics."buildId", metrics."metric", latest."latestAt"
    ORDER BY latest."latestAt" DESC, metrics."metric"
  `;
}

export async function aggregateRum(
  database: PrismaClient | null = prisma,
  now = new Date(),
  periodDays = 7,
): Promise<RumAggregationResult> {
  const end = now;
  const start = new Date(end.getTime() - periodDays * DAY_MS);
  const previousStart = new Date(start.getTime() - periodDays * DAY_MS);
  const base = {
    generatedAt: now.toISOString(),
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      days: periodDays,
    },
    previousPeriod: {
      start: previousStart.toISOString(),
      end: start.toISOString(),
      days: periodDays,
    },
  };
  if (!database) {
    return {
      available: false,
      ...base,
      actualRange: { firstAt: null, lastAt: null },
      sampleCount: 0,
      distinctAnonymousBuckets: 0,
      deploymentCount: 0,
      routes: [],
      overallMetrics: [],
      deploymentComparisons: [],
      insufficientRouteCount: RUM_ROUTE_TEMPLATES.length,
      errorCode: "database-unavailable",
    };
  }

  try {
    const [
      currentMetrics,
      previousMetrics,
      overallCurrent,
      overallPrevious,
      routeRows,
      globalRows,
      deviceRows,
      connectionRows,
      navigationRows,
      deploymentRows,
      deploymentMetricRows,
    ] = await Promise.all([
      database.$queryRaw<RawMetricRow[]>(metricSql(start, end, true)),
      database.$queryRaw<RawMetricRow[]>(metricSql(previousStart, start, true)),
      database.$queryRaw<RawOverallMetricRow[]>(metricSql(start, end, false)),
      database.$queryRaw<RawOverallMetricRow[]>(
        metricSql(previousStart, start, false),
      ),
      database.$queryRaw<RawRouteRow[]>(Prisma.sql`
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
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY "routeTemplate"
      `),
      database.$queryRaw<RawGlobalRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "sampleCount",
          COUNT(DISTINCT "anonymousBucket")::bigint AS "distinctBuckets",
          MIN("createdAt") AS "firstAt",
          MAX("createdAt") AS "lastAt",
          COUNT(DISTINCT "buildId")::bigint AS "deploymentCount",
          COUNT(DISTINCT (
            ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo'
          )::date)::bigint AS "observedDayCount"
        FROM "RumMetric"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      `),
      database.$queryRaw<RawDimensionRow[]>(
        dimensionSql(start, end, "deviceClass"),
      ),
      database.$queryRaw<RawDimensionRow[]>(
        dimensionSql(start, end, "connectionClass"),
      ),
      database.$queryRaw<RawDimensionRow[]>(
        dimensionSql(start, end, "navigationType"),
      ),
      database.$queryRaw<RawDimensionRow[]>(
        dimensionSql(start, end, "buildId"),
      ),
      database.$queryRaw<RawDeploymentMetricRow[]>(
        deploymentComparisonSql(start, end),
      ),
    ]);

    const routeByName = new Map(
      routeRows.map((row) => [row.routeTemplate, row]),
    );
    const currentMetricMap = new Map(
      currentMetrics.map((row) => [`${row.routeTemplate}:${row.metric}`, row]),
    );
    const previousMetricMap = new Map(
      previousMetrics.map((row) => [`${row.routeTemplate}:${row.metric}`, row]),
    );
    const overallCurrentMap = new Map(
      overallCurrent.map((row) => [row.metric, row]),
    );
    const overallPreviousMap = new Map(
      overallPrevious.map((row) => [row.metric, row]),
    );
    const devices = dimensionMap(deviceRows);
    const connections = dimensionMap(connectionRows);
    const navigations = dimensionMap(navigationRows);
    const deployments = dimensionMap(deploymentRows);
    const deploymentMetricGroups = new Map<string, RawDeploymentMetricRow[]>();
    for (const row of deploymentMetricRows) {
      const rows = deploymentMetricGroups.get(row.deployment) ?? [];
      rows.push(row);
      deploymentMetricGroups.set(row.deployment, rows);
    }

    const routes = RUM_ROUTE_TEMPLATES.map((routeTemplate) => {
      const row = routeByName.get(routeTemplate);
      const samples = count(row?.sampleCount);
      const rangeDays = dateRangeDays(
        row?.firstAt ?? null,
        row?.lastAt ?? null,
      );
      const observedDayCount = count(row?.observedDayCount);
      const byRange = observedDayCount >= RUM_MIN_ROUTE_RANGE_DAYS;
      const metrics = METRICS.map((metric) =>
        normalizeMetric(
          currentMetricMap.get(`${routeTemplate}:${metric}`),
          previousMetricMap.get(`${routeTemplate}:${metric}`),
          metric,
        ),
      );
      const observedMetricSampleCounts = metrics
        .map((metric) => metric.sampleCount)
        .filter((sampleCount) => sampleCount > 0);
      const minimumMetricSampleCount =
        observedMetricSampleCounts.length > 0
          ? Math.min(...observedMetricSampleCounts)
          : 0;
      const bySamples =
        observedMetricSampleCounts.length > 0 &&
        observedMetricSampleCounts.every(
          (sampleCount) => sampleCount >= RUM_MIN_ROUTE_SAMPLES,
        );
      return {
        routeTemplate,
        sampleCount: samples,
        distinctAnonymousBuckets: count(row?.distinctBuckets),
        firstAt: row?.firstAt?.toISOString() ?? null,
        lastAt: row?.lastAt?.toISOString() ?? null,
        dateRangeDays: rangeDays,
        observedDayCount,
        deploymentCount: count(row?.deploymentCount),
        minimumMetricSampleCount,
        deviceClasses: devices.get(routeTemplate) ?? [],
        connectionClasses: connections.get(routeTemplate) ?? [],
        navigationTypes: navigations.get(routeTemplate) ?? [],
        deployments: deployments.get(routeTemplate) ?? [],
        dataSufficient: hasSufficientRumRouteData(
          observedMetricSampleCounts,
          observedDayCount,
        ),
        sufficiencyReason:
          samples === 0
            ? "no-data"
            : bySamples
              ? "sample-count"
              : byRange
                ? "date-range"
                : "insufficient",
        metrics,
      } satisfies RumRouteSummary;
    });
    const global = globalRows[0];
    return {
      available: true,
      ...base,
      actualRange: {
        firstAt: global?.firstAt?.toISOString() ?? null,
        lastAt: global?.lastAt?.toISOString() ?? null,
      },
      sampleCount: count(global?.sampleCount),
      distinctAnonymousBuckets: count(global?.distinctBuckets),
      deploymentCount: count(global?.deploymentCount),
      routes,
      overallMetrics: METRICS.map((metric) =>
        normalizeMetric(
          overallCurrentMap.get(metric),
          overallPreviousMap.get(metric),
          metric,
        ),
      ),
      deploymentComparisons: [...deploymentMetricGroups.entries()].map(
        ([deployment, rows]) => ({
          deployment,
          sampleCount: rows.reduce(
            (total, row) => total + count(row.sampleCount),
            0,
          ),
          firstAt:
            rows
              .map((row) => row.firstAt)
              .filter((value): value is Date => value !== null)
              .sort((left, right) => left.getTime() - right.getTime())[0]
              ?.toISOString() ?? null,
          lastAt:
            rows
              .map((row) => row.lastAt)
              .filter((value): value is Date => value !== null)
              .sort((left, right) => right.getTime() - left.getTime())[0]
              ?.toISOString() ?? null,
          metrics: METRICS.map((metric) =>
            normalizeMetric(
              rows.find((row) => row.metric === metric),
              undefined,
              metric,
            ),
          ),
        }),
      ),
      insufficientRouteCount: routes.filter((route) => !route.dataSufficient)
        .length,
    };
  } catch {
    return {
      available: false,
      ...base,
      actualRange: { firstAt: null, lastAt: null },
      sampleCount: 0,
      distinctAnonymousBuckets: 0,
      deploymentCount: 0,
      routes: [],
      overallMetrics: [],
      deploymentComparisons: [],
      insufficientRouteCount: RUM_ROUTE_TEMPLATES.length,
      errorCode: "aggregation-unavailable",
    };
  }
}
