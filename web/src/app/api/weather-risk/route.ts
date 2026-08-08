import { NextRequest, NextResponse } from "next/server";
import { getSignageLocationById } from "@/data/signage-locations";
import type {
  ApiErrorResponse,
  WeatherRiskApiResponse,
  WeatherRiskPartialApiResponse,
} from "@/lib/types/api";
import type {
  OfficialWeatherWarningState,
  WeatherSnapshot,
} from "@/lib/types/domain";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { fetchWithTimeout, TimeoutError } from "@/lib/external/fetch-with-timeout";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { buildSignageJmaSnapshot } from "@/lib/signage/signage-jma-snapshot";
import {
  isActiveWarningStatus,
  levelFromWarningCode,
} from "@/lib/jma/parse-jma-warning";
import { resolveForecastTargetDate } from "@/lib/weather/forecast-target-date";
import {
  isOpenMeteoCurrentFresh,
  toOpenMeteoCurrent,
  toOpenMeteoSnapshot,
  type OpenMeteoDailyResponse,
} from "@/lib/weather/open-meteo-risk";

type RegionDefinition = {
  regionName: string;
  latitude: number;
  longitude: number;
  prefectureIso: string;
  jmaCityCode?: string;
};

const JMA_WARNING_URL = "https://www.jma.go.jp/bosai/warning/";
const MAX_FORECAST_DAYS = 6;
function unavailableOfficialWarning(
  status: OfficialWeatherWarningState["status"] = "unavailable",
): OfficialWeatherWarningState {
  return {
    status,
    warnings: [],
    headline: null,
    fetchedAt: null,
    reportAt: null,
    sourceUrl: JMA_WARNING_URL,
  };
}

async function loadOfficialWarning(
  region: RegionDefinition,
): Promise<OfficialWeatherWarningState> {
  // 市区町村コードが未登録の地点は、県内の別地域の警報を「当該地点なし」と
  // 誤認させない。公式ページでの地点確認が必要な unresolved とする。
  if (!region.jmaCityCode) {
    return unavailableOfficialWarning("unresolved");
  }

  try {
    const warnings = await getJmaWarningsRuntime();
    const snapshot = buildSignageJmaSnapshot(
      warnings,
      region.prefectureIso,
      region.jmaCityCode,
    );
    const activeWarnings = snapshot.selectedWarnings
      .filter((warning) => isActiveWarningStatus(warning.status))
      .flatMap((warning) => {
        // 新体系の「警報から注意報」は発表中の注意報として扱う。
        // 元コードが警報・特別警報でも、切替後を強い警報のまま表示しない。
        const level = warning.status.includes("警報から注意報")
          ? "advisory"
          : levelFromWarningCode(warning.code);
        if (!level || level === "none") return [];
        return [{ ...warning, level }];
      });

    return {
      status:
        snapshot.selectedWarningState === "live"
          ? "live"
          : "degraded",
      warnings: activeWarnings,
      headline: snapshot.jmaHeadline,
      fetchedAt: snapshot.sourceFetchedAt || null,
      reportAt: snapshot.jmaReportTime,
      sourceUrl: JMA_WARNING_URL,
    };
  } catch {
    return unavailableOfficialWarning();
  }
}

function errorResponse(
  status: number,
  code: ApiErrorResponse["error"]["code"],
  message: string,
  retryable = status >= 500
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code,
        message,
        retryable,
      },
    },
    { status }
  );
}

async function partialWeatherErrorResponse(
  status: number,
  message: string,
  officialWarningPromise: Promise<OfficialWeatherWarningState>,
) {
  const body: WeatherRiskPartialApiResponse = {
    partial: true,
    fetchedAt: new Date().toISOString(),
    unavailableSources: ["open-meteo"],
    officialWarning: await officialWarningPromise,
    error: {
      code: "UNAVAILABLE",
      message,
      retryable: true,
    },
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "x-weather-source": "partial:jma",
    },
  });
}

function resolveRegion(request: NextRequest): RegionDefinition | null {
  const areaId = request.nextUrl.searchParams.get("area");
  return areaId ? (getSignageLocationById(areaId) ?? null) : null;
}

export async function GET(request: NextRequest) {
  const region = resolveRegion(request);
  if (!region) {
    return errorResponse(400, "VALIDATION", "指定された地域には現在対応していません。", false);
  }
  const target = resolveForecastTargetDate(request.nextUrl.searchParams.get("date"));
  if (!target) {
    return errorResponse(
      400,
      "VALIDATION",
      `予報はJSTの今日から${MAX_FORECAST_DAYS}日先まで指定できます。現在値で代用しません。`,
      false,
    );
  }

  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", String(region.latitude));
  endpoint.searchParams.set("longitude", String(region.longitude));
  endpoint.searchParams.set("timezone", "Asia/Tokyo");
  if (target.daysAhead === 0) {
    endpoint.searchParams.set("forecast_days", "1");
    endpoint.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m",
    );
  } else {
    endpoint.searchParams.set("start_date", target.date);
    endpoint.searchParams.set("end_date", target.date);
  }
  endpoint.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,wind_speed_10m_max,precipitation_sum"
  );

  let snapshot: WeatherSnapshot | null = null;
  let current: WeatherRiskApiResponse["current"];
  const officialWarningPromise = loadOfficialWarning(region);

  try {
    const payload = await withCircuitBreaker(
      "open-meteo",
      async () => {
        const response = await fetchWithTimeout(endpoint.toString(), {
          headers: { Accept: "application/json" },
          cache: "no-store",
          timeoutMs: 6000,
        });
        if (!response.ok) {
          throw new Error(`open-meteo HTTP ${response.status}`);
        }
        return (await response.json()) as OpenMeteoDailyResponse;
      },
      { failureThreshold: 5, cooldownMs: 120_000 }
    );
    snapshot = toOpenMeteoSnapshot(region.regionName, payload);
    const parsedCurrent = target.daysAhead === 0 ? toOpenMeteoCurrent(payload) : null;
    current =
      parsedCurrent && isOpenMeteoCurrentFresh(parsedCurrent)
        ? parsedCurrent
        : undefined;
  } catch (err) {
    const failureKind = err instanceof CircuitOpenError
      ? "circuit_open"
      : err instanceof TimeoutError
        ? "timeout"
        : "source_unavailable";
    console.error("[weather-risk] degraded", { failureKind });
    return partialWeatherErrorResponse(
      503,
      "Open-Meteoの気象予測を取得できません。数値を0や「注意なし」とみなさず、気象庁の公式情報と現場計測を確認してください。",
      officialWarningPromise,
    );
  }

  if (!snapshot) {
    return partialWeatherErrorResponse(
      502,
      "Open-Meteoの応答に必要な対象日・気温・風速・降水量・天気コードがありません。安全判断には使用できません。",
      officialWarningPromise,
    );
  }
  if (snapshot.date !== target.date) {
    return partialWeatherErrorResponse(
      502,
      "Open-Meteoの予報対象日が指定したJST作業日と一致しません。別日の値で代用しません。",
      officialWarningPromise,
    );
  }

  const body: WeatherRiskApiResponse = {
    snapshot,
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
    officialWarning: await officialWarningPromise,
    ...(current ? { current } : {}),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "x-weather-source": "open-meteo",
    },
  });
}
