import { weatherSnapshotsMock } from "@/data/mock/weather-risk";
import { getSignageLocationByRegionName } from "@/data/signage-locations";
import type {
  ApiErrorResponse,
  WeatherRiskApiResponse,
  WeatherRiskPartialApiResponse,
} from "@/lib/types/api";
import type {
  OfficialWeatherWarningState,
  SiteRiskWeather,
  WeatherRiskLevel,
  WeatherSnapshot,
} from "@/lib/types/domain";

export type WeatherRegionOption = {
  id: string;
  label: string;
  regionName: string;
};

export type WeatherRiskServiceResult =
  | { ok: true; data: SiteRiskWeather }
  | {
      ok: false;
      error: ApiErrorResponse["error"];
      officialWarning?: OfficialWeatherWarningState;
      partialFetchedAt?: string;
    };

export type WeatherRiskService = {
  getTodaySiteRisk: (input?: {
    areaId?: string;
    regionName?: string;
  }) => Promise<WeatherRiskServiceResult>;
  getAvailableRegions: () => WeatherRegionOption[];
};

function scoreFromWeather(
  snapshot: WeatherSnapshot,
  officialWarning?: OfficialWeatherWarningState,
) {
  let score = 0;
  const cautions: string[] = [];
  const riskEvidences: string[] = [];
  const actions = new Set<string>([
    "朝礼で天候リスクと中止基準を30秒共有する",
  ]);

  if (snapshot.temperatureCelsius >= 35) {
    score += 7;
    cautions.push("予想最高気温35℃以上");
    riskEvidences.push(
      `本日の予想最高気温${snapshot.temperatureCelsius}℃です。気温だけでWBGTは確定できませんが、低リスクとは扱いません`,
    );
    actions.add(
      "環境省・厚生労働省のWBGT、作業強度、服装、順化状態を確認し、作業中止基準と計画的な休憩・水分塩分補給を決める",
    );
  } else if (snapshot.temperatureCelsius >= 33) {
    score += 4;
    cautions.push("予想最高気温33℃以上");
    riskEvidences.push(
      `本日の予想最高気温${snapshot.temperatureCelsius}℃です。WBGTを別に確認するまで暑熱判断を確定しません`,
    );
    actions.add(
      "WBGT、作業強度、服装、順化状態を確認し、計画的な休憩と水分塩分補給を決める",
    );
  } else if (snapshot.temperatureCelsius >= 30) {
    score += 2;
    cautions.push("暑熱リスク");
    riskEvidences.push(
      `本日の予想最高気温${snapshot.temperatureCelsius}℃です。気温だけでなくWBGTを確認してください`,
    );
    actions.add("送風・日陰を確保し、体調不良者を即申告させる");
  } else if (snapshot.temperatureCelsius >= 28) {
    score += 1;
    cautions.push("気温上昇");
    riskEvidences.push(
      `本日の予想最高気温${snapshot.temperatureCelsius}℃です。体調変化に注意してください`,
    );
    actions.add("小休止と声かけを増やし、無理な連続作業を避ける");
  }

  if (snapshot.windSpeedMs >= 15) {
    score += 3;
    cautions.push("強風");
    riskEvidences.push(
      `風速${snapshot.windSpeedMs}m/sのため飛来落下・高所作業に特に注意が必要です`
    );
    actions.add("高所・揚重作業を見合わせ、資材固定を再点検する");
  } else if (snapshot.windSpeedMs >= 10) {
    score += 2;
    cautions.push("風が強い");
    riskEvidences.push(
      `風速${snapshot.windSpeedMs}m/sのため飛来落下・高所作業に注意が必要です`
    );
    actions.add("足場とシートの緩みを作業前に再点検する");
  } else if (snapshot.windSpeedMs >= 7) {
    score += 1;
    cautions.push("やや強い風");
    riskEvidences.push(
      `風速${snapshot.windSpeedMs}m/sのため資材飛散リスクに注意が必要です`
    );
    actions.add("飛散しやすい資材を優先して固定・整理する");
  }

  if (snapshot.precipitationMm >= 20) {
    score += 3;
    cautions.push("予想降水量合計20mm以上");
    riskEvidences.push(
      `本日の予想降水量合計${snapshot.precipitationMm}mmです。時間雨量ではないため雨の強さは断定せず、足場・排水・視界を確認してください`
    );
    actions.add("滑りやすい導線を閉鎖し、排水確認後に再開判断する");
  } else if (snapshot.precipitationMm >= 10) {
    score += 2;
    cautions.push("予想降水量合計10mm以上");
    riskEvidences.push(
      `本日の予想降水量合計${snapshot.precipitationMm}mmです。降る時間帯を別に確認し、足場悪化・感電リスクに注意してください`
    );
    actions.add("感電・転倒リスクのある工程を先に手順見直しする");
  } else if (snapshot.precipitationMm >= 1) {
    score += 1;
    cautions.push("降雨の可能性");
    riskEvidences.push(
      `本日の予想降水量合計${snapshot.precipitationMm}mmです。時間帯を確認し、足元の滑りに注意してください`
    );
    actions.add("足元養生を追加し、滑りやすい場所を全員へ周知する");
  }

  const warningAlerts = snapshot.alerts.filter((alert) => alert.level === "warning");
  const advisoryAlerts = snapshot.alerts.filter((alert) => alert.level === "advisory");

  if (warningAlerts.length > 0) {
    score += 4;
    cautions.push("警報発表中");
    riskEvidences.push(
      `${warningAlerts.map((alert) => alert.type).join("・")}が発表中のため危険工程の停止判断が必要です`
    );
    actions.add("管理者が退避・中止判断者を明確にして即時判断する");
  } else if (advisoryAlerts.length > 0) {
    score += 2;
    cautions.push("注意報発表中");
    riskEvidences.push(
      `${advisoryAlerts.map((alert) => alert.type).join("・")}が出ているため現場監視の強化が必要です`
    );
    actions.add("注意報対象の災害シナリオを朝礼で共有して監視を強化する");
  }

  if (officialWarning?.status === "live") {
    const special = officialWarning.warnings.some(
      (warning) => warning.level === "special",
    );
    const warning = officialWarning.warnings.some(
      (item) => item.level === "warning",
    );
    const advisory = officialWarning.warnings.some(
      (item) => item.level === "advisory",
    );
    if (special) {
      score += 6;
      cautions.push("気象庁の特別警報発表中");
      riskEvidences.push("選択地域に気象庁の特別警報が発表されています");
      actions.add("公式発表と自治体の指示を確認し、退避・作業中止を即時判断する");
    } else if (warning) {
      score += 4;
      cautions.push("気象庁の警報発表中");
      riskEvidences.push("選択地域に気象庁の警報が発表されています");
      actions.add("気象庁の公式発表を開き、危険工程の停止・退避を判断する");
    } else if (advisory) {
      score += 2;
      cautions.push("気象庁の注意報発表中");
      riskEvidences.push("選択地域に気象庁の注意報が発表されています");
      actions.add("気象庁の公式発表を確認し、対象災害の監視を強化する");
    }
  }

  const riskLevel: WeatherRiskLevel = score >= 7 ? "高" : score >= 4 ? "中" : "低";
  const primaryCautions =
    cautions.length > 0 ? cautions : ["大きな気象リスクは低い見込み"];
  const normalizedRiskEvidences =
    riskEvidences.length > 0
      ? riskEvidences
      : ["大きな気象要因は少ない見込みのため通常の安全確認を継続してください"];

  return {
    riskLevel,
    primaryCautions,
    riskEvidences: normalizedRiskEvidences,
    recommendedActions: Array.from(actions).slice(0, 4),
  };
}

function toSiteRisk(
  snapshot: WeatherSnapshot,
  metadata: {
    dataOrigin: "live" | "synthetic";
    forecastProvider: "open-meteo" | "synthetic";
    forecastFetchedAt: string | null;
    officialWarning: OfficialWeatherWarningState;
    current?: WeatherRiskApiResponse["current"];
  },
): SiteRiskWeather {
  const scored = scoreFromWeather(snapshot, metadata.officialWarning);
  return {
    regionName: snapshot.regionName,
    date: snapshot.date,
    overview: snapshot.overview,
    temperatureCelsius: snapshot.temperatureCelsius,
    windSpeedMs: snapshot.windSpeedMs,
    precipitationMm: snapshot.precipitationMm,
    alerts: snapshot.alerts,
    riskLevel: scored.riskLevel,
    primaryCautions: scored.primaryCautions,
    riskEvidences: scored.riskEvidences,
    recommendedActions: scored.recommendedActions,
    dataOrigin: metadata.dataOrigin,
    forecastProvider: metadata.forecastProvider,
    forecastFetchedAt: metadata.forecastFetchedAt,
    officialWarning: metadata.officialWarning,
    ...(metadata.current
      ? {
          currentTemperatureCelsius: metadata.current.temperatureCelsius,
          relativeHumidityPercent: metadata.current.relativeHumidityPercent,
          weatherTargetAt: metadata.current.targetAt,
        }
      : {}),
  };
}

function toWeatherSnapshotFromApi(snapshot: WeatherSnapshot): WeatherSnapshot {
  return {
    regionName: snapshot.regionName,
    date: snapshot.date,
    overview: snapshot.overview,
    temperatureCelsius: snapshot.temperatureCelsius,
    windSpeedMs: snapshot.windSpeedMs,
    precipitationMm: snapshot.precipitationMm,
    alerts: snapshot.alerts,
  };
}

function pickSnapshotByRegion(
  snapshots: WeatherSnapshot[],
  regionName?: string
): WeatherSnapshot | null {
  if (snapshots.length === 0) {
    return null;
  }
  if (!regionName) {
    return snapshots[0];
  }
  const exact = snapshots.find((item) => item.regionName === regionName);
  if (exact) {
    return exact;
  }
  return snapshots.find((item) => item.regionName.includes(regionName)) ?? snapshots[0];
}

function toRegionId(regionName: string) {
  const compact = regionName.replace(/[都道府県市区町村\s]/g, "");
  return compact.toLowerCase();
}

function toRegionLabel(regionName: string) {
  const [prefecture = regionName, city] = regionName.split(" ");
  if (!city) {
    return prefecture;
  }
  return `${prefecture} (${city})`;
}

function buildRegionOptions(snapshots: WeatherSnapshot[]): WeatherRegionOption[] {
  const used = new Set<string>();
  return snapshots
    .map((snapshot) => {
      const id = toRegionId(snapshot.regionName);
      if (!id || used.has(id)) {
        return null;
      }
      used.add(id);
      return {
        id,
        label: toRegionLabel(snapshot.regionName),
        regionName: snapshot.regionName,
      } satisfies WeatherRegionOption;
    })
    .filter((item): item is WeatherRegionOption => item !== null);
}

const regionOptions = buildRegionOptions(weatherSnapshotsMock);

export const mockWeatherRiskService: WeatherRiskService = {
  async getTodaySiteRisk(input) {
    const picked = pickSnapshotByRegion(weatherSnapshotsMock, input?.regionName);
    if (!picked) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "天気・警報データが見つかりませんでした。",
          retryable: false,
        },
      };
    }

    return {
      ok: true,
      data: toSiteRisk(picked, {
        dataOrigin: "synthetic",
        forecastProvider: "synthetic",
        forecastFetchedAt: null,
        officialWarning: {
          status: "unavailable",
          warnings: [],
          headline: null,
          fetchedAt: null,
          reportAt: null,
          sourceUrl: "https://www.jma.go.jp/bosai/warning/",
        },
      }),
    };
  },
  getAvailableRegions() {
    return regionOptions;
  },
};

function normalizeApiError(payload: unknown, fallbackMessage: string): ApiErrorResponse["error"] {
  if (payload && typeof payload === "object" && "error" in payload) {
    const maybe = payload as ApiErrorResponse;
    if (maybe.error?.code && maybe.error?.message) {
      return {
        code: maybe.error.code,
        message: maybe.error.message,
        retryable: maybe.error.retryable ?? true,
      };
    }
  }
  return {
    code: "NETWORK",
    message: fallbackMessage,
    retryable: true,
  };
}

const OFFICIAL_WARNING_STATUSES = new Set([
  "live",
  "degraded",
  "unresolved",
  "unavailable",
]);
const OFFICIAL_WARNING_LEVELS = new Set(["advisory", "warning", "special"]);

export function parseWeatherRiskApiPayload(
  value: unknown,
): WeatherRiskApiResponse | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<WeatherRiskApiResponse>;
  const snapshot = payload.snapshot as Partial<WeatherSnapshot> | undefined;
  const official = payload.officialWarning as
    | Partial<OfficialWeatherWarningState>
    | undefined;

  if (
    payload.provider !== "open-meteo" ||
    typeof payload.fetchedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.fetchedAt)) ||
    !snapshot ||
    typeof snapshot.regionName !== "string" ||
    typeof snapshot.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date) ||
    typeof snapshot.overview !== "string" ||
    typeof snapshot.temperatureCelsius !== "number" ||
    !Number.isFinite(snapshot.temperatureCelsius) ||
    typeof snapshot.windSpeedMs !== "number" ||
    !Number.isFinite(snapshot.windSpeedMs) ||
    snapshot.windSpeedMs < 0 ||
    typeof snapshot.precipitationMm !== "number" ||
    !Number.isFinite(snapshot.precipitationMm) ||
    snapshot.precipitationMm < 0 ||
    !Array.isArray(snapshot.alerts) ||
    !snapshot.alerts.every(
      (alert) =>
        alert &&
        typeof alert.type === "string" &&
        (alert.level === "advisory" || alert.level === "warning"),
    ) ||
    !official ||
    typeof official.status !== "string" ||
    !OFFICIAL_WARNING_STATUSES.has(official.status) ||
    !Array.isArray(official.warnings) ||
    !official.warnings.every(
      (warning) =>
        warning &&
        typeof warning.code === "string" &&
        typeof warning.status === "string" &&
        OFFICIAL_WARNING_LEVELS.has(warning.level),
    ) ||
    !(
      official.headline === null || typeof official.headline === "string"
    ) ||
    !(official.fetchedAt === null || typeof official.fetchedAt === "string") ||
    !(official.reportAt === null || typeof official.reportAt === "string") ||
    typeof official.sourceUrl !== "string" ||
    !official.sourceUrl.startsWith("https://www.jma.go.jp/") ||
    (payload.current !== undefined &&
      (!payload.current ||
        typeof payload.current.temperatureCelsius !== "number" ||
        !Number.isFinite(payload.current.temperatureCelsius) ||
        typeof payload.current.relativeHumidityPercent !== "number" ||
        !Number.isFinite(payload.current.relativeHumidityPercent) ||
        payload.current.relativeHumidityPercent < 0 ||
        payload.current.relativeHumidityPercent > 100 ||
        typeof payload.current.targetAt !== "string" ||
        !Number.isFinite(Date.parse(payload.current.targetAt))))
  ) {
    return null;
  }

  return payload as WeatherRiskApiResponse;
}

export function parseWeatherRiskPartialApiPayload(
  value: unknown,
): WeatherRiskPartialApiResponse | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<WeatherRiskPartialApiResponse>;
  const error = payload.error as Partial<ApiErrorResponse["error"]> | undefined;
  if (
    payload.partial !== true ||
    typeof payload.fetchedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.fetchedAt)) ||
    !Array.isArray(payload.unavailableSources) ||
    payload.unavailableSources.length !== 1 ||
    payload.unavailableSources[0] !== "open-meteo" ||
    !error ||
    !["NETWORK", "NOT_FOUND", "UNAVAILABLE", "VALIDATION", "UNKNOWN"].includes(
      String(error.code),
    ) ||
    typeof error.message !== "string" ||
    typeof error.retryable !== "boolean"
  ) {
    return null;
  }

  const officialValidation = parseWeatherRiskApiPayload({
    snapshot: {
      regionName: "validation-only",
      date: "2000-01-01",
      overview: "validation-only",
      temperatureCelsius: 0,
      windSpeedMs: 0,
      precipitationMm: 0,
      alerts: [],
    },
    provider: "open-meteo",
    fetchedAt: payload.fetchedAt,
    officialWarning: payload.officialWarning,
  });
  if (!officialValidation) return null;

  return {
    ...(payload as WeatherRiskPartialApiResponse),
    officialWarning: officialValidation.officialWarning,
  };
}

type FetchWithTimeout = (
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
) => Promise<Response>;

export class ApiWeatherRiskService implements WeatherRiskService {
  constructor(
    private readonly fetchImpl: FetchWithTimeout,
    private readonly endpoint = "/api/weather-risk"
  ) {}

  getAvailableRegions(): WeatherRegionOption[] {
    return regionOptions;
  }

  async getTodaySiteRisk(input?: {
    areaId?: string;
    regionName?: string;
  }): Promise<WeatherRiskServiceResult> {
    try {
      const query = new URLSearchParams();
      const areaId =
        input?.areaId ??
        (input?.regionName
          ? getSignageLocationByRegionName(input.regionName)?.id
          : undefined);
      if (areaId) {
        query.set("area", areaId);
      }
      const target = query.size
        ? `${this.endpoint}?${query.toString()}`
        : this.endpoint;
      const response = await this.fetchImpl(target, { timeoutMs: 4500 });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as unknown;
        const partial = parseWeatherRiskPartialApiPayload(body);
        return {
          ok: false,
          error: normalizeApiError(body, "天気・警報リスクを取得できませんでした。"),
          officialWarning: partial?.officialWarning,
          partialFetchedAt: partial?.fetchedAt,
        };
      }
      const payload = parseWeatherRiskApiPayload(
        await response.json().catch(() => null),
      );
      if (!payload) {
        return {
          ok: false,
          error: {
            code: "UNAVAILABLE",
            message:
              "気象データの応答形式または公式警報状態を確認できません。安全判断には使用できません。",
            retryable: true,
          },
        };
      }
      const snapshot = toWeatherSnapshotFromApi(payload.snapshot);
      return {
        ok: true,
        data: toSiteRisk(snapshot, {
          dataOrigin: "live",
          forecastProvider: "open-meteo",
          forecastFetchedAt: payload.fetchedAt,
          officialWarning: payload.officialWarning,
          current: payload.current,
        }),
      };
    } catch {
      return {
        ok: false,
        error: {
          code: "NETWORK",
          message: "天気・警報リスクの取得がタイムアウトしました。再試行してください。",
          retryable: true,
        },
      };
    }
  }
}

export function createMockWeatherRiskService(): WeatherRiskService {
  return mockWeatherRiskService;
}

export function createApiWeatherRiskService(
  fetchImpl: FetchWithTimeout = (input, init) => fetch(input, init),
  endpoint?: string
): WeatherRiskService {
  return new ApiWeatherRiskService(fetchImpl, endpoint);
}
