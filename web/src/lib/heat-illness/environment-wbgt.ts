import type { SignageLocation } from "@/data/signage-locations";

export const ENVIRONMENT_WBGT_SOURCE_URL =
  "https://www.wbgt.env.go.jp/";
export const ENVIRONMENT_WBGT_DATA_SERVICE_URL =
  "https://www.wbgt.env.go.jp/data_service.php";

export type OfficialAlertState =
  | "active"
  | "inactive"
  | "candidate"
  | "unavailable";

export type EnvironmentWbgtValue = {
  status: "estimated" | "unavailable";
  mode: "official-estimated-current" | "official-forecast" | "unavailable";
  valueCelsius: number | null;
  targetAt: string | null;
  createdAt: string | null;
  stationCount: number;
  expectedStationCount: number;
  stale: boolean;
  label: string;
};

export type EnvironmentHeatAlert = {
  heatAlert: OfficialAlertState;
  specialHeatAlert: OfficialAlertState;
  targetDate: string | null;
  reportAt: string | null;
};

export type EnvironmentWbgtStatus = {
  areaId: string;
  areaLabel: string;
  prefectureIso: string;
  scopeLabel: string;
  wbgt: EnvironmentWbgtValue;
  alerts: EnvironmentHeatAlert;
  retrievedAt: string;
  degraded: boolean;
  provider: "環境省 熱中症予防情報サイト";
  sourceUrl: typeof ENVIRONMENT_WBGT_SOURCE_URL;
  dataServiceUrl: typeof ENVIRONMENT_WBGT_DATA_SERVICE_URL;
};

export type EnvironmentNationalHeatAlertSummary = {
  status: "live" | "unavailable";
  targetDate: string;
  reportAt: string | null;
  retrievedAt: string;
  heatAlertPrefectureCount: number | null;
  specialHeatAlertPrefectureCount: number | null;
  checkedPrefectureCount: number;
  provider: "環境省 熱中症予防情報サイト";
  sourceUrl: typeof ENVIRONMENT_WBGT_SOURCE_URL;
};

type ParsedWbgtRow = {
  valueCelsius: number;
  targetAt: string;
  createdAt: string | null;
  stationCount: number;
  expectedStationCount: number;
};

const PREFECTURE_SLUGS: Record<string, string> = {
  "JP-01": "hokkaido",
  "JP-02": "aomori",
  "JP-03": "iwate",
  "JP-04": "miyagi",
  "JP-05": "akita",
  "JP-06": "yamagata",
  "JP-07": "fukushima",
  "JP-08": "ibaraki",
  "JP-09": "tochigi",
  "JP-10": "gunma",
  "JP-11": "saitama",
  "JP-12": "chiba",
  "JP-13": "tokyo",
  "JP-14": "kanagawa",
  "JP-15": "niigata",
  "JP-16": "toyama",
  "JP-17": "ishikawa",
  "JP-18": "fukui",
  "JP-19": "yamanashi",
  "JP-20": "nagano",
  "JP-21": "gifu",
  "JP-22": "shizuoka",
  "JP-23": "aichi",
  "JP-24": "mie",
  "JP-25": "shiga",
  "JP-26": "kyoto",
  "JP-27": "osaka",
  "JP-28": "hyogo",
  "JP-29": "nara",
  "JP-30": "wakayama",
  "JP-31": "tottori",
  "JP-32": "shimane",
  "JP-33": "okayama",
  "JP-34": "hiroshima",
  "JP-35": "yamaguchi",
  "JP-36": "tokushima",
  "JP-37": "kagawa",
  "JP-38": "ehime",
  "JP-39": "kochi",
  "JP-40": "fukuoka",
  "JP-41": "saga",
  "JP-42": "nagasaki",
  "JP-43": "kumamoto",
  "JP-44": "oita",
  "JP-45": "miyazaki",
  "JP-46": "kagoshima",
  "JP-47": "okinawa",
};

const WBGT_STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

function splitCsvLine(line: string): string[] {
  // The Environment Ministry files used here contain no quoted commas in the
  // fields we inspect. Keep the parser deliberately small and reject bad rows.
  return line.replace(/\r$/, "").split(",").map((field) => field.trim());
}

function toJstIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 24 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }
  const utcMs =
    Date.UTC(year, month - 1, day, hour === 24 ? 0 : hour, minute, second) -
    9 * 60 * 60 * 1000 +
    (hour === 24 ? 24 * 60 * 60 * 1000 : 0);
  const parsed = new Date(utcMs);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function parseActualDateTime(date: string, time: string): string | null {
  const dateMatch = date.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!dateMatch || !timeMatch) return null;
  return toJstIso(
    Number(dateMatch[1]),
    Number(dateMatch[2]),
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] ?? 0),
  );
}

function validWbgtValues(fields: string[], divisor = 1): number[] {
  return fields.flatMap((field) => {
    if (!/^-?\d+(?:\.\d+)?$/.test(field)) return [];
    const raw = Number(field);
    const value = raw / divisor;
    return Number.isFinite(value) && value >= -10 && value <= 60
      ? [Math.round(value * 10) / 10]
      : [];
  });
}

export function parseEnvironmentActualCsv(
  csv: string,
  nowMs: number,
): ParsedWbgtRow | null {
  const lines = csv.split(/\n/).filter((line) => line.trim());
  const header = lines[0] ? splitCsvLine(lines[0]) : [];
  if (
    header[0] !== "Date" ||
    header[1] !== "Time" ||
    header.length < 3
  ) {
    return null;
  }

  let best: ParsedWbgtRow | null = null;
  const expectedStationCount = header.length - 2;
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    if (fields.length < 3) continue;
    const targetAt = parseActualDateTime(fields[0] ?? "", fields[1] ?? "");
    if (!targetAt) continue;
    const targetMs = Date.parse(targetAt);
    if (
      !Number.isFinite(targetMs) ||
      targetMs > nowMs + FUTURE_TOLERANCE_MS
    ) {
      continue;
    }
    const values = validWbgtValues(fields.slice(2));
    if (values.length === 0) continue;
    if (!best || targetMs > Date.parse(best.targetAt)) {
      best = {
        valueCelsius: Math.max(...values),
        targetAt,
        createdAt: null,
        stationCount: values.length,
        expectedStationCount,
      };
    }
  }
  return best;
}

function parseForecastTarget(value: string): string | null {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})$/,
  );
  if (!match) return null;
  return toJstIso(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  );
}

export function parseEnvironmentForecastCsv(
  csv: string,
  nowMs: number,
): ParsedWbgtRow | null {
  const lines = csv.split(/\n/).filter((line) => line.trim());
  const header = lines[0] ? splitCsvLine(lines[0]) : [];
  if (header.length < 3) return null;

  const targets = header.slice(2).map(parseForecastTarget);
  const targetIndex = targets.findIndex((target) => {
    if (!target) return false;
    return Date.parse(target) >= nowMs - 30 * 60 * 1000;
  });
  if (targetIndex < 0) return null;
  const targetAt = targets[targetIndex];
  if (!targetAt) return null;

  const values: number[] = [];
  let expectedStationCount = 0;
  let createdAt: string | null = null;
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    if (!fields[0]) continue;
    expectedStationCount += 1;
    if (fields.length < targetIndex + 3) continue;
    const parsed = validWbgtValues([fields[targetIndex + 2] ?? ""], 10);
    if (parsed[0] !== undefined) values.push(parsed[0]);
    if (!createdAt && fields[1]) {
      const match = fields[1].match(
        /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/,
      );
      if (match) {
        createdAt = toJstIso(
          Number(match[1]),
          Number(match[2]),
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
        );
      }
    }
  }
  if (values.length === 0) return null;
  return {
    valueCelsius: Math.max(...values),
    targetAt,
    createdAt,
    stationCount: values.length,
    expectedStationCount,
  };
}

function metadataValue(lines: string[], key: string): string | null {
  for (const line of lines) {
    const fields = splitCsvLine(line);
    if (fields[0] === key) return fields[1] || null;
  }
  return null;
}

function alertStateFromFlags(
  flags: number[],
  kind: "heat" | "special",
): OfficialAlertState {
  if (flags.length === 0 || flags.every((flag) => flag === 9)) {
    return "unavailable";
  }
  if (kind === "heat") {
    return flags.includes(1) ? "active" : "inactive";
  }
  if (flags.includes(3)) return "active";
  if (flags.includes(2)) return "candidate";
  return "inactive";
}

export function parseEnvironmentAlertCsv(
  csv: string,
  prefectureIso: string,
  todayJst: string,
): EnvironmentHeatAlert | null {
  const prefectureCode = prefectureIso.match(/^JP-(\d{2})$/)?.[1];
  if (!prefectureCode) return null;
  const lines = csv.split(/\n/).filter((line) => line.trim());
  const targetDateRaw = metadataValue(lines, "TargetDate1");
  const reportDateRaw = metadataValue(lines, "ReportDate");
  const reportTime = metadataValue(lines, "ReportTime");
  const targetDate = targetDateRaw?.replaceAll("/", "-") ?? null;
  const flags = lines.flatMap((line) => {
    const fields = splitCsvLine(line);
    if (
      fields[5] !== prefectureCode ||
      !/^(?:[0-3]|9)$/.test(fields[6] ?? "")
    ) {
      return [];
    }
    return [Number(fields[6])];
  });
  if (!targetDate || targetDate !== todayJst || flags.length === 0) {
    return {
      heatAlert: "unavailable",
      specialHeatAlert: "unavailable",
      targetDate,
      reportAt: null,
    };
  }

  const reportAt =
    reportDateRaw && reportTime
      ? parseActualDateTime(reportDateRaw, reportTime)
      : null;
  return {
    heatAlert: alertStateFromFlags(flags, "heat"),
    specialHeatAlert: alertStateFromFlags(flags, "special"),
    targetDate,
    reportAt,
  };
}

function jstParts(now: Date): {
  date: string;
  year: string;
  month: string;
  day: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return { date: `${year}-${month}-${day}`, year, month, day };
}

function previousJstDay(now: Date): {
  year: string;
  month: string;
  day: string;
} {
  const previous = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const parts = jstParts(previous);
  return { year: parts.year, month: parts.month, day: parts.day };
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "text/csv,text/plain;q=0.9" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadLatestAlertCsv(
  now: Date,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const today = jstParts(now);
  const previous = previousJstDay(now);
  const currentJstHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value ?? "-1",
  );
  const latestHour = [17, 14, 10, 5].find(
    (hour) => hour <= currentJstHour,
  );
  const stamp =
    latestHour === undefined
      ? `${previous.year}${previous.month}${previous.day}_17`
      : `${today.year}${today.month}${today.day}_${String(latestHour).padStart(2, "0")}`;
  const year = stamp.slice(0, 4);
  return fetchText(
    `https://www.wbgt.env.go.jp/alert/dl/${year}/alert_${stamp}.csv`,
    fetchImpl,
  );
}

export async function loadEnvironmentNationalHeatAlertSummary({
  now = new Date(),
  fetchImpl = fetch,
}: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}): Promise<EnvironmentNationalHeatAlertSummary> {
  const today = jstParts(now);
  const alertCsv = await loadLatestAlertCsv(now, fetchImpl);
  const unavailable: EnvironmentNationalHeatAlertSummary = {
    status: "unavailable",
    targetDate: today.date,
    reportAt: null,
    retrievedAt: now.toISOString(),
    heatAlertPrefectureCount: null,
    specialHeatAlertPrefectureCount: null,
    checkedPrefectureCount: 0,
    provider: "環境省 熱中症予防情報サイト",
    sourceUrl: ENVIRONMENT_WBGT_SOURCE_URL,
  };
  if (!alertCsv) return unavailable;

  const parsed = Object.keys(PREFECTURE_SLUGS).flatMap((prefectureIso) => {
    const alert = parseEnvironmentAlertCsv(
      alertCsv,
      prefectureIso,
      today.date,
    );
    return alert ? [alert] : [];
  });
  const reportAt =
    parsed
      .map((alert) => alert.reportAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const reportAtMs = Date.parse(reportAt ?? "");
  const nowMs = now.getTime();
  const fresh =
    parsed.length === Object.keys(PREFECTURE_SLUGS).length &&
    Number.isFinite(reportAtMs) &&
    reportAtMs <= nowMs + FUTURE_TOLERANCE_MS &&
    nowMs - reportAtMs <= 24 * 60 * 60 * 1000;
  if (!fresh) return unavailable;

  return {
    status: "live",
    targetDate: today.date,
    reportAt,
    retrievedAt: now.toISOString(),
    heatAlertPrefectureCount: parsed.filter(
      (alert) => alert.heatAlert === "active",
    ).length,
    specialHeatAlertPrefectureCount: parsed.filter(
      (alert) => alert.specialHeatAlert === "active",
    ).length,
    checkedPrefectureCount: parsed.length,
    provider: "環境省 熱中症予防情報サイト",
    sourceUrl: ENVIRONMENT_WBGT_SOURCE_URL,
  };
}

export async function loadEnvironmentWbgtStatus({
  location,
  now = new Date(),
  fetchImpl = fetch,
}: {
  location: SignageLocation;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<EnvironmentWbgtStatus> {
  const slug = PREFECTURE_SLUGS[location.prefectureIso];
  const nowMs = now.getTime();
  const today = jstParts(now);
  const unavailableValue: EnvironmentWbgtValue = {
    status: "unavailable",
    mode: "unavailable",
    valueCelsius: null,
    targetAt: null,
    createdAt: null,
    stationCount: 0,
    expectedStationCount: 0,
    stale: true,
    label: "未確認",
  };
  const unavailableAlerts: EnvironmentHeatAlert = {
    heatAlert: "unavailable",
    specialHeatAlert: "unavailable",
    targetDate: today.date,
    reportAt: null,
  };

  if (!slug) {
    return {
      areaId: location.id,
      areaLabel: location.label,
      prefectureIso: location.prefectureIso,
      scopeLabel: "公式区域を解決できないため表示を保留",
      wbgt: unavailableValue,
      alerts: unavailableAlerts,
      retrievedAt: now.toISOString(),
      degraded: true,
      provider: "環境省 熱中症予防情報サイト",
      sourceUrl: ENVIRONMENT_WBGT_SOURCE_URL,
      dataServiceUrl: ENVIRONMENT_WBGT_DATA_SERVICE_URL,
    };
  }

  const actualUrl =
    `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_${slug}_${today.year}${today.month}.csv`;
  const forecastUrl =
    `https://www.wbgt.env.go.jp/prev15WG/dl/yohou_${slug}.csv`;
  const [actualCsv, forecastCsv, alertCsv] = await Promise.all([
    fetchText(actualUrl, fetchImpl),
    fetchText(forecastUrl, fetchImpl),
    loadLatestAlertCsv(now, fetchImpl),
  ]);

  const actual = actualCsv
    ? parseEnvironmentActualCsv(actualCsv, nowMs)
    : null;
  const forecast = forecastCsv
    ? parseEnvironmentForecastCsv(forecastCsv, nowMs)
    : null;
  const actualAge = actual ? nowMs - Date.parse(actual.targetAt) : Infinity;
  const actualStale =
    !actual ||
    actualAge < -FUTURE_TOLERANCE_MS ||
    actualAge > WBGT_STALE_AFTER_MS;

  const wbgt: EnvironmentWbgtValue = actual && !actualStale
    ? {
        status: "estimated",
        mode: "official-estimated-current",
        valueCelsius: actual.valueCelsius,
        targetAt: actual.targetAt,
        createdAt: actual.createdAt,
        stationCount: actual.stationCount,
        expectedStationCount: actual.expectedStationCount,
        stale: actualStale,
        label:
          actual.stationCount < actual.expectedStationCount
            ? "公式提供・実況推定（取得できた地点の最大・一部欠測）"
            : "公式提供・実況推定（提供地点内最大）",
      }
    : forecast
      ? {
          status: "estimated",
          mode: "official-forecast",
          valueCelsius: forecast.valueCelsius,
          targetAt: forecast.targetAt,
          createdAt: forecast.createdAt,
          stationCount: forecast.stationCount,
          expectedStationCount: forecast.expectedStationCount,
          stale: false,
          label:
            forecast.stationCount < forecast.expectedStationCount
              ? "公式提供・予測（取得できた地点の最大・一部欠測）"
              : "公式提供・予測（提供地点内最大）",
        }
      : actual
        ? {
            status: "estimated",
            mode: "official-estimated-current",
            valueCelsius: actual.valueCelsius,
            targetAt: actual.targetAt,
            createdAt: actual.createdAt,
            stationCount: actual.stationCount,
            expectedStationCount: actual.expectedStationCount,
            stale: true,
            label:
              actual.stationCount < actual.expectedStationCount
                ? "公式提供・実況推定（古い値・一部欠測）"
                : "公式提供・実況推定（古い値）",
          }
        : unavailableValue;

  const parsedAlerts =
    (alertCsv
      ? parseEnvironmentAlertCsv(
          alertCsv,
          location.prefectureIso,
          today.date,
        )
      : null) ?? unavailableAlerts;
  const alertReportMs = Date.parse(parsedAlerts.reportAt ?? "");
  const alertFresh =
    Number.isFinite(alertReportMs) &&
    alertReportMs <= nowMs + FUTURE_TOLERANCE_MS &&
    nowMs - alertReportMs <= 24 * 60 * 60 * 1000;
  const alerts = alertFresh
    ? parsedAlerts
    : {
        ...parsedAlerts,
        heatAlert: "unavailable" as const,
        specialHeatAlert: "unavailable" as const,
      };
  const prefecture = location.regionName.split(/\s+/)[0] ?? location.label;

  return {
    areaId: location.id,
    areaLabel: location.label,
    prefectureIso: location.prefectureIso,
    scopeLabel: `${prefecture}内で取得できた提供地点の最大（${wbgt.stationCount}/${wbgt.expectedStationCount || "確認不能"}地点）。作業地点のJIS適合計による実測ではありません。`,
    wbgt,
    alerts,
    retrievedAt: now.toISOString(),
    degraded:
      wbgt.status === "unavailable" ||
      wbgt.stale ||
      wbgt.expectedStationCount === 0 ||
      wbgt.stationCount < wbgt.expectedStationCount ||
      alerts.heatAlert === "unavailable" ||
      alerts.specialHeatAlert === "unavailable",
    provider: "環境省 熱中症予防情報サイト",
    sourceUrl: ENVIRONMENT_WBGT_SOURCE_URL,
    dataServiceUrl: ENVIRONMENT_WBGT_DATA_SERVICE_URL,
  };
}
