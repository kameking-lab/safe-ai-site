import { z } from "zod";

// Preserve the production CSP by disabling Zod's Function-based parser JIT.
z.config({ jitless: true });
import type { JmaForecastReport } from "./parse-jma-forecast";
import {
  levelFromWarningCode,
  type JmaWarningPayload,
} from "./parse-jma-warning";

const explicitIsoDatetime = z.string().refine(
  (value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value)),
  "explicit, parseable ISO datetime required",
);
const numericAreaCode = z.string().regex(/^\d{4,8}$/);
const EARLIEST_REASONABLE_JMA_DATETIME = Date.parse("2000-01-01T00:00:00Z");
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_CONTROL_REPORT_GAP_MS = 24 * 60 * 60 * 1000;
const MAX_WARNING_REPORT_AGE_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WARNING_STATUSES = new Set([
  "発表",
  "継続",
  "警報から注意報",
  // 2026年の危険警報導入後、レベル4危険警報からレベル2注意報へ
  // 切り替わった状態。code（例: 29）を必須にして現在の注意報を保持する。
  "危険警報から注意報",
]);
const INACTIVE_WARNING_STATUSES = new Set([
  "発表警報・注意報はなし",
  "解除",
  "なし",
]);
const warningStatus = z.string().trim().refine(
  (status) =>
    ACTIVE_WARNING_STATUSES.has(status) ||
    INACTIVE_WARNING_STATUSES.has(status),
  "known JMA warning status required",
);
const warningCode = z.string().trim().min(1).refine(
  (code) => levelFromWarningCode(code) !== null,
  "known JMA warning code required",
);

export type JmaWarningParseIssue =
  | "schema-mismatch"
  | "future-datetime"
  | "abnormal-datetime"
  | "stale";

export type JmaWarningParseResult =
  | { ok: true; payload: JmaWarningPayload }
  | { ok: false; issue: JmaWarningParseIssue };

const legacyWarningSchema = z.object({
  reportDatetime: explicitIsoDatetime,
  publishingOffice: z.string().trim().min(1),
  headlineText: z.string().optional(),
  areaTypes: z.array(z.object({
    areas: z.array(z.object({
      code: numericAreaCode,
      warnings: z.array(z.object({
        code: warningCode.optional(),
        status: warningStatus,
      }).passthrough()).superRefine((warnings, ctx) => {
        for (const [index, warning] of warnings.entries()) {
          const inactive = INACTIVE_WARNING_STATUSES.has(warning.status);
          if (!inactive && !warning.code) {
            ctx.addIssue({
              code: "custom",
              path: [index, "code"],
              message: "active warning code required",
            });
          }
        }
      }),
    }).passthrough()).min(1),
  }).passthrough()).min(1),
}).passthrough();

const r8KindSchema = z
  .object({
    code: warningCode.optional(),
    status: warningStatus,
  })
  .passthrough()
  .superRefine((kind, ctx) => {
    const inactive = INACTIVE_WARNING_STATUSES.has(kind.status);
    if (!inactive && !kind.code) {
      ctx.addIssue({
        code: "custom",
        path: ["code"],
        message: "active warning code required",
      });
    }
  });

const r8AreaSchema = z
  .object({
    areaCode: numericAreaCode,
    kinds: z.array(r8KindSchema).min(1),
  })
  .passthrough();

const r8WarningReportSchema = z
  .object({
    controlDatetime: explicitIsoDatetime,
    reportDatetime: explicitIsoDatetime,
    publishingOffice: z.string().trim().min(1),
    headlineText: z.string().optional(),
    dataTypeCode: z.string().regex(/^VPWW\d{2}$/),
    warning: z
      .object({
        class10Items: z.array(r8AreaSchema).optional(),
        class20Items: z.array(r8AreaSchema).optional(),
      })
      .passthrough(),
  })
  .passthrough()
  .superRefine((report, ctx) => {
    const count =
      (report.warning.class10Items?.length ?? 0) +
      (report.warning.class20Items?.length ?? 0);
    if (count === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["warning"],
        message: "warning area items required",
      });
    }
  });

const r8WarningSchema = z.array(r8WarningReportSchema).min(1);

type R8WarningReport = z.infer<typeof r8WarningReportSchema>;

function normalizeR8WarningReports(
  reports: R8WarningReport[],
): JmaWarningPayload {
  const newest = [...reports].sort(
    (a, b) => Date.parse(b.reportDatetime) - Date.parse(a.reportDatetime),
  )[0]!;
  const areas = reports.flatMap((report) =>
    [
      ...(report.warning.class10Items ?? []),
      ...(report.warning.class20Items ?? []),
    ].map((area) => ({
      code: area.areaCode,
      warnings: area.kinds.map((kind) => ({
        code: kind.code,
        status: kind.status,
      })),
    })),
  );
  const headlines = reports
    .map((report) => report.headlineText?.trim())
    .filter((value): value is string => Boolean(value));
  return {
    reportDatetime: newest.reportDatetime,
    publishingOffice: newest.publishingOffice,
    headlineText: [...new Set(headlines)].join(" / "),
    areaTypes: [{ areas }],
  };
}

const forecastAreaSchema = z.object({
  area: z.object({ code: numericAreaCode }).passthrough(),
  weatherCodes: z.array(z.string().trim().min(1)).optional(),
  weathers: z.array(z.string().trim().min(1)).optional(),
}).passthrough();

const forecastReportSchema = z.object({
  reportDatetime: explicitIsoDatetime,
  publishingOffice: z.string().trim().min(1),
  timeSeries: z.array(z.object({
    timeDefines: z.array(explicitIsoDatetime).min(1),
    areas: z.array(forecastAreaSchema).min(1),
  }).passthrough()).min(1),
}).passthrough();

const forecastSchema = z.array(forecastReportSchema).min(1).superRefine((reports, ctx) => {
  const hasWeatherSeries = reports.some((report) => report.timeSeries.some((series) =>
    series.areas.some((area) =>
      (area.weatherCodes?.length ?? 0) > 0 && (area.weathers?.length ?? 0) > 0,
    ),
  ));
  if (!hasWeatherSeries) ctx.addIssue({ code: "custom", message: "weather series required" });
});

const quakeItemSchema = z.object({
  eid: z.string().trim().min(1),
  rdt: explicitIsoDatetime,
  at: explicitIsoDatetime,
  anm: z.string().trim().min(1),
  mag: z.string().trim().min(1),
  maxInt: z.enum(["1", "2", "3", "4", "5-", "5+", "6-", "6+", "7"]),
  ttl: z.string().trim().min(1),
}).passthrough();
const quakeListSchema = z.array(quakeItemSchema).min(1);

export function parseJmaWarningResponse(
  value: unknown,
  now: Date = new Date(),
): JmaWarningPayload | null {
  const result = inspectJmaWarningResponse(value, now);
  return result.ok ? result.payload : null;
}

function rawWarningDatetimes(value: unknown): Array<{
  reportDatetime?: unknown;
  controlDatetime?: unknown;
}> {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
      )
      .map((item) => ({
        reportDatetime: item.reportDatetime,
        controlDatetime: item.controlDatetime,
      }));
  }
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return [{
      reportDatetime: item.reportDatetime,
      controlDatetime: item.controlDatetime,
    }];
  }
  return [];
}

function warningDatetimeIssue(
  value: unknown,
  now: Date,
): Exclude<JmaWarningParseIssue, "schema-mismatch"> | null {
  const parsedTimestamps: number[] = [];
  for (const item of rawWarningDatetimes(value)) {
    const values = [item.reportDatetime, item.controlDatetime].filter(
      (candidate): candidate is string => typeof candidate === "string",
    );
    for (const candidate of values) {
      if (!explicitIsoDatetime.safeParse(candidate).success) {
        return "abnormal-datetime";
      }
      const timestamp = Date.parse(candidate);
      parsedTimestamps.push(timestamp);
      if (timestamp < EARLIEST_REASONABLE_JMA_DATETIME) {
        return "abnormal-datetime";
      }
      if (timestamp > now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS) {
        return "future-datetime";
      }
    }
    if (
      typeof item.reportDatetime === "string" &&
      typeof item.controlDatetime === "string" &&
      Math.abs(
        Date.parse(item.reportDatetime) - Date.parse(item.controlDatetime),
      ) > MAX_CONTROL_REPORT_GAP_MS
    ) {
      return "abnormal-datetime";
    }
  }
  if (
    parsedTimestamps.length > 0 &&
    Math.max(...parsedTimestamps) <
      now.getTime() - MAX_WARNING_REPORT_AGE_MS
  ) {
    return "stale";
  }
  return null;
}

export function inspectJmaWarningResponse(
  value: unknown,
  now: Date = new Date(),
): JmaWarningParseResult {
  const temporalIssue = warningDatetimeIssue(value, now);
  if (temporalIssue) return { ok: false, issue: temporalIssue };

  const legacy = legacyWarningSchema.safeParse(value);
  if (legacy.success) {
    return { ok: true, payload: legacy.data as JmaWarningPayload };
  }
  const r8 = r8WarningSchema.safeParse(value);
  return r8.success
    ? { ok: true, payload: normalizeR8WarningReports(r8.data) }
    : { ok: false, issue: "schema-mismatch" };
}

export function parseJmaForecastResponse(value: unknown): JmaForecastReport[] | null {
  return forecastSchema.safeParse(value).success ? value as JmaForecastReport[] : null;
}

export function parseJmaEarthquakeResponse(value: unknown): unknown[] | null {
  return quakeListSchema.safeParse(value).success ? value as unknown[] : null;
}

export function warningPayloadFingerprint(payload: JmaWarningPayload): string {
  return JSON.stringify({
    reportDatetime: payload.reportDatetime,
    publishingOffice: payload.publishingOffice,
    areaTypes: payload.areaTypes,
  });
}
