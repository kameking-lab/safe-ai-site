/**
 * web/src/data/jma/ に保存された JMA バッチ結果の型と読み込みヘルパー。
 */

export type JmaMapLevel = "none" | "advisory" | "warning" | "special";

export type JmaSourceIssue =
  | "fetch-failed"
  | "schema-mismatch"
  | "future-datetime"
  | "abnormal-datetime"
  | "stale"
  | "unverified";

export type JmaFetchQuality = {
  status: "live" | "degraded" | "fallback";
  attempted: number;
  succeeded: number;
  failed: number;
  /** Distinct fail-closed reasons; never infer "no warning" from these. */
  issues?: JmaSourceIssue[];
};

export type JmaWarningEntry = {
  sourceCode: string;
  level: JmaMapLevel;
  headline: string | null;
  reportDatetime: string | null;
  publishingOffice: string | null;
  warnings: Array<{
    areaCode: string | null;
    code: string | null;
    status: string | null;
    level: JmaMapLevel | null;
  }>;
};

export type JmaWarningRegionSource = "live" | "fallback";

export type JmaWarningsByIso = Record<
  string,
  {
    level: JmaMapLevel;
    entries: JmaWarningEntry[];
    /**
     * Runtime acquisition provenance for this prefecture.
     * Omitted in legacy/static snapshots, which must not be treated as current
     * when the dataset quality is degraded or fallback.
     */
    sourceStatus?: JmaWarningRegionSource;
    sourceFetchedAt?: string | null;
    sourceIssue?: JmaSourceIssue;
  }
>;

export type JmaWarningsFile = {
  fetchedAt: string;
  byIso: JmaWarningsByIso;
  quality?: JmaFetchQuality;
};

export type JmaWeatherEntry = {
  label: string;
  reportDatetime: string | null;
  publishingOffice: string | null;
  todayWeatherCode: string | null;
  todayWeatherText: string | null;
};

export type JmaWeatherFile = {
  fetchedAt: string;
  byIso: Record<string, JmaWeatherEntry>;
  quality?: JmaFetchQuality;
};

export type JmaEarthquake = {
  eventId: string | null;
  reportDatetime: string | null;
  occurredAt: string | null;
  hypocenter: string | null;
  magnitude: string | null;
  maxIntensity: string | null;
  title: string | null;
  /** モックでのみ提供。本番は地点情報なしのこともある。 */
  lat?: number;
  lng?: number;
  depth?: string;
};

export type JmaEarthquakesFile = {
  fetchedAt: string;
  items: JmaEarthquake[];
  quality?: JmaFetchQuality;
};

export type JmaIndexFile = {
  fetchedAt: string;
  source: string;
  sourceUrl: string;
  license: string;
  counts: { warningsPrefectures: number; forecastOffices: number; earthquakes: number };
  errors: { warnings: unknown[]; forecast: unknown[]; earthquakes: unknown };
};

const SEVERE_INTENSITY = new Set(["5-", "5+", "6-", "6+", "7"]);

export function isSevereIntensity(maxInt: string | null | undefined): boolean {
  return Boolean(maxInt) && SEVERE_INTENSITY.has(String(maxInt));
}

export function levelLabel(level: JmaMapLevel): string {
  switch (level) {
    case "special":
      return "特別警報";
    case "warning":
      return "警報";
    case "advisory":
      return "注意報";
    default:
      return "発表なし";
  }
}

/** 凡例色（4段階）：注意報=黄、警報=赤、特別警報=紫、なし=灰 */
export const LEVEL_COLOR: Record<JmaMapLevel, string> = {
  none: "#cbd5e1",
  advisory: "#facc15",
  warning: "#ef4444",
  special: "#a855f7",
};
