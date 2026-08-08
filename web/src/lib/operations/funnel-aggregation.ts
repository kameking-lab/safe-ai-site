import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AUTOMATION_FUNNEL_EVENTS,
  type AutomationFunnelEvent,
} from "@/lib/automation-funnel/schema";

const DAY_MS = 24 * 60 * 60 * 1_000;

type CountRow = {
  event: string;
  sampleCount: bigint | number;
};
type DimensionCountRow = CountRow & { dimension: string };
type GlobalRow = {
  sampleCount: bigint | number;
  distinctBuckets: bigint | number;
  deploymentCount: bigint | number;
  firstAt: Date | null;
  lastAt: Date | null;
};

export type FunnelCounts = Record<AutomationFunnelEvent, number>;
export type FunnelRates = {
  pricingViewRate: number | null;
  ctaClickRate: number | null;
  formStartRate: number | null;
  unavailableRate: number | null;
  validationErrorRate: number | null;
  completionRate: number | null;
};

export type FunnelAggregationResult = {
  available: boolean;
  generatedAt: string;
  period: { start: string; end: string; days: number };
  previousPeriod: { start: string; end: string; days: number };
  actualRange: { firstAt: string | null; lastAt: string | null };
  sampleCount: number;
  distinctAnonymousBuckets: number;
  deploymentCount: number;
  counts: FunnelCounts;
  previousCounts: FunnelCounts;
  rates: FunnelRates;
  previousRates: FunnelRates;
  rateChanges: FunnelRates;
  deviceBreakdown: Array<{
    deviceClass: string;
    counts: FunnelCounts;
    rates: FunnelRates;
  }>;
  ctaPositionBreakdown: Array<{
    ctaPosition: string;
    counts: FunnelCounts;
  }>;
  consultationCategoryBreakdown: Array<{
    consultationCategory: string;
    sampleCount: number;
  }>;
  budgetBucketBreakdown: Array<{
    budgetBucket: string;
    sampleCount: number;
  }>;
  errorCode?: "database-unavailable" | "aggregation-unavailable";
};

function number(value: bigint | number | null | undefined): number {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function emptyCounts(): FunnelCounts {
  return Object.fromEntries(
    AUTOMATION_FUNNEL_EVENTS.map((event) => [event, 0]),
  ) as FunnelCounts;
}

function countsFromRows(rows: CountRow[]): FunnelCounts {
  const result = emptyCounts();
  for (const row of rows) {
    if (AUTOMATION_FUNNEL_EVENTS.includes(row.event as AutomationFunnelEvent)) {
      result[row.event as AutomationFunnelEvent] = number(row.sampleCount);
    }
  }
  return result;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function calculateFunnelRates(counts: FunnelCounts): FunnelRates {
  const serviceViews = counts.automation_service_view;
  const ctaClicks = counts.automation_cta_click;
  const formStarts = counts.automation_form_start;
  return {
    pricingViewRate: ratio(counts.automation_pricing_view, serviceViews),
    ctaClickRate: ratio(ctaClicks, serviceViews),
    formStartRate: ratio(formStarts, ctaClicks),
    unavailableRate: ratio(counts.automation_form_unavailable, serviceViews),
    validationErrorRate: ratio(
      counts.automation_form_validation_error,
      formStarts,
    ),
    completionRate: ratio(counts.automation_form_success, formStarts),
  };
}

function subtractRates(current: FunnelRates, previous: FunnelRates): FunnelRates {
  return Object.fromEntries(
    Object.entries(current).map(([key, value]) => [
      key,
      value === null || previous[key as keyof FunnelRates] === null
        ? null
        : value - (previous[key as keyof FunnelRates] as number),
    ]),
  ) as FunnelRates;
}

function eventCountSql(start: Date, end: Date) {
  return Prisma.sql`
    SELECT "event", COUNT(*)::bigint AS "sampleCount"
    FROM "AutomationFunnelEvent"
    WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    GROUP BY "event"
  `;
}

function dimensionSql(
  start: Date,
  end: Date,
  dimension:
    | "deviceClass"
    | "ctaPosition"
    | "consultationCategory"
    | "budgetBucket",
) {
  if (dimension === "deviceClass") {
    return Prisma.sql`
      SELECT "deviceClass" AS "dimension", "event",
        COUNT(*)::bigint AS "sampleCount"
      FROM "AutomationFunnelEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      GROUP BY "deviceClass", "event"
    `;
  }
  if (dimension === "ctaPosition") {
    return Prisma.sql`
      SELECT "ctaPosition" AS "dimension", "event",
        COUNT(*)::bigint AS "sampleCount"
      FROM "AutomationFunnelEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        AND "ctaPosition" IS NOT NULL
      GROUP BY "ctaPosition", "event"
    `;
  }
  if (dimension === "consultationCategory") {
    return Prisma.sql`
      SELECT "consultationCategory" AS "dimension", "event",
        COUNT(*)::bigint AS "sampleCount"
      FROM "AutomationFunnelEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        AND "consultationCategory" IS NOT NULL
      GROUP BY "consultationCategory", "event"
    `;
  }
  return Prisma.sql`
    SELECT "budgetBucket" AS "dimension", "event",
      COUNT(*)::bigint AS "sampleCount"
    FROM "AutomationFunnelEvent"
    WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      AND "budgetBucket" IS NOT NULL
    GROUP BY "budgetBucket", "event"
  `;
}

function groupDimension(rows: DimensionCountRow[]) {
  const grouped = new Map<string, CountRow[]>();
  for (const row of rows) {
    const values = grouped.get(row.dimension) ?? [];
    values.push(row);
    grouped.set(row.dimension, values);
  }
  return grouped;
}

export async function aggregateAutomationFunnel(
  database: PrismaClient | null = prisma,
  now = new Date(),
  periodDays = 7,
): Promise<FunnelAggregationResult> {
  const end = now;
  const start = new Date(end.getTime() - periodDays * DAY_MS);
  const previousStart = new Date(start.getTime() - periodDays * DAY_MS);
  const base = {
    generatedAt: now.toISOString(),
    period: { start: start.toISOString(), end: end.toISOString(), days: periodDays },
    previousPeriod: {
      start: previousStart.toISOString(),
      end: start.toISOString(),
      days: periodDays,
    },
  };
  const empty = emptyCounts();
  if (!database) {
    return {
      available: false,
      ...base,
      actualRange: { firstAt: null, lastAt: null },
      sampleCount: 0,
      distinctAnonymousBuckets: 0,
      deploymentCount: 0,
      counts: empty,
      previousCounts: emptyCounts(),
      rates: calculateFunnelRates(empty),
      previousRates: calculateFunnelRates(empty),
      rateChanges: calculateFunnelRates(empty),
      deviceBreakdown: [],
      ctaPositionBreakdown: [],
      consultationCategoryBreakdown: [],
      budgetBucketBreakdown: [],
      errorCode: "database-unavailable",
    };
  }

  try {
    const [
      currentRows,
      previousRows,
      globalRows,
      deviceRows,
      ctaRows,
      categoryRows,
      budgetRows,
    ] = await Promise.all([
      database.$queryRaw<CountRow[]>(eventCountSql(start, end)),
      database.$queryRaw<CountRow[]>(eventCountSql(previousStart, start)),
      database.$queryRaw<GlobalRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "sampleCount",
          COUNT(DISTINCT "anonymousBucket")::bigint AS "distinctBuckets",
          COUNT(DISTINCT "deployment")::bigint AS "deploymentCount",
          MIN("createdAt") AS "firstAt",
          MAX("createdAt") AS "lastAt"
        FROM "AutomationFunnelEvent"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      `),
      database.$queryRaw<DimensionCountRow[]>(
        dimensionSql(start, end, "deviceClass"),
      ),
      database.$queryRaw<DimensionCountRow[]>(
        dimensionSql(start, end, "ctaPosition"),
      ),
      database.$queryRaw<DimensionCountRow[]>(
        dimensionSql(start, end, "consultationCategory"),
      ),
      database.$queryRaw<DimensionCountRow[]>(
        dimensionSql(start, end, "budgetBucket"),
      ),
    ]);
    const counts = countsFromRows(currentRows);
    const previousCounts = countsFromRows(previousRows);
    const rates = calculateFunnelRates(counts);
    const previousRates = calculateFunnelRates(previousCounts);
    const devices = groupDimension(deviceRows);
    const ctaPositions = groupDimension(ctaRows);
    const categoryCounts = groupDimension(categoryRows);
    const budgetCounts = groupDimension(budgetRows);
    const global = globalRows[0];
    return {
      available: true,
      ...base,
      actualRange: {
        firstAt: global?.firstAt?.toISOString() ?? null,
        lastAt: global?.lastAt?.toISOString() ?? null,
      },
      sampleCount: number(global?.sampleCount),
      distinctAnonymousBuckets: number(global?.distinctBuckets),
      deploymentCount: number(global?.deploymentCount),
      counts,
      previousCounts,
      rates,
      previousRates,
      rateChanges: subtractRates(rates, previousRates),
      deviceBreakdown: [...devices.entries()].map(([deviceClass, rows]) => {
        const deviceCounts = countsFromRows(rows);
        return {
          deviceClass,
          counts: deviceCounts,
          rates: calculateFunnelRates(deviceCounts),
        };
      }),
      ctaPositionBreakdown: [...ctaPositions.entries()].map(
        ([ctaPosition, rows]) => ({
          ctaPosition,
          counts: countsFromRows(rows),
        }),
      ),
      consultationCategoryBreakdown: [...categoryCounts.entries()].map(
        ([consultationCategory, rows]) => ({
          consultationCategory,
          sampleCount: rows.reduce(
            (sum, row) => sum + number(row.sampleCount),
            0,
          ),
        }),
      ),
      budgetBucketBreakdown: [...budgetCounts.entries()].map(
        ([budgetBucket, rows]) => ({
          budgetBucket,
          sampleCount: rows.reduce(
            (sum, row) => sum + number(row.sampleCount),
            0,
          ),
        }),
      ),
    };
  } catch {
    return {
      available: false,
      ...base,
      actualRange: { firstAt: null, lastAt: null },
      sampleCount: 0,
      distinctAnonymousBuckets: 0,
      deploymentCount: 0,
      counts: empty,
      previousCounts: emptyCounts(),
      rates: calculateFunnelRates(empty),
      previousRates: calculateFunnelRates(empty),
      rateChanges: calculateFunnelRates(empty),
      deviceBreakdown: [],
      ctaPositionBreakdown: [],
      consultationCategoryBreakdown: [],
      budgetBucketBreakdown: [],
      errorCode: "aggregation-unavailable",
    };
  }
}
