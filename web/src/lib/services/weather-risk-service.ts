import { weatherSnapshotsMock } from "@/data/mock/weather-risk";
import type {
  ApiErrorResponse,
  ServiceResult,
  WeatherRiskApiResponse,
} from "@/lib/types/api";
import type {
  SiteRiskWeather,
  WeatherRiskLevel,
  WeatherSnapshot,
} from "@/lib/types/domain";

export type WeatherRegionOption = {
  id: string;
  label: string;
  regionName: string;
};

export type WeatherRiskService = {
  getTodaySiteRisk: (input?: { regionName?: string }) => Promise<ServiceResult<SiteRiskWeather>>;
  getAvailableRegions: () => WeatherRegionOption[];
};

function scoreFromWeather(snapshot: WeatherSnapshot) {
  let score = 0;
  const cautions: string[] = [];
  const riskEvidences: string[] = [];
  const actions = new Set<string>([
    "朝礼で天候リスクと中止基準を30秒共有する",
  ]);

  if (snapshot.temperatureCelsius >= 33) {
    score += 3;
    cautions.push("危険な暑さ");
    riskEvidences.push(
      `気温${snapshot.temperatureCelsius}℃のため暑熱リスクが高いです`
    );
    actions.add("WBGTを確認し、30分ごとに給水休憩を入れる");
  } else if (snapshot.temperatureCelsius >= 30) {
    score += 2;
    cautions.push("暑熱リスク");
    riskEvidences.push(
      `気温${snapshot.temperatureCelsius}℃のため暑熱リスクに注意が必要です`
    );
    actions.add("送風・日陰を確保し、体調不良者を即申告させる");
  } else if (snapshot.temperatureCelsius >= 28) {
    score += 1;
    cautions.push("気温上昇");
    riskEvidences.push(
      `気温${snapshot.temperatureCelsius}℃で体調変化が出やすいため注意が必要です`
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
    cautions.push("強い雨");
    riskEvidences.push(
      `降水量${snapshot.precipitationMm}mmのため足場悪化・視界悪化に注意が必要です`
    );
    actions.add("滑りやすい導線を閉鎖し、排水確認後に再開判断する");
  } else if (snapshot.precipitationMm >= 10) {
    score += 2;
    cautions.push("降雨");
    riskEvidences.push(
      `降水量${snapshot.precipitationMm}mmのため足場悪化・感電リスクに注意が必要です`
    );
    actions.add("感電・転倒リスクのある工程を先に手順見直しする");
  } else if (snapshot.precipitationMm >= 1) {
    score += 1;
    cautions.push("小雨");
    riskEvidences.push(
      `降水量${snapshot.precipitationMm}mmのため足元の滑りに注意が必要です`
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

function toSiteRisk(snapshot: WeatherSnapshot): SiteRiskWeather {
  const scored = scoreFromWeather(snapshot);
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
      data: toSiteRisk(picked),
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

  async getTodaySiteRisk(input?: { regionName?: string }): Promise<ServiceResult<SiteRiskWeather>> {
    try {
      const query = new URLSearchParams();
      if (input?.regionName) {
        query.set("regionName", input.regionName);
      }
      const target = `${this.endpoint}?${query.toString()}`;
      const response = await this.fetchImpl(target, { timeoutMs: 4500 });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as unknown;
        return {
          ok: false,
          error: normalizeApiError(body, "天気・警報リスクを取得できませんでした。"),
        };
      }
      const payload = (await response.json()) as WeatherRiskApiResponse;
      const snapshot = toWeatherSnapshotFromApi(payload.snapshot);
      return {
        ok: true,
        data: toSiteRisk(snapshot),
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
