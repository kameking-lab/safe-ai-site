import { NextRequest, NextResponse } from "next/server";
import { signageMeteoRegions } from "@/data/signage-locations";
import type { ApiErrorResponse, WeatherRiskApiResponse } from "@/lib/types/api";
import type { WeatherAlert, WeatherSnapshot } from "@/lib/types/domain";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { fetchWithTimeout, TimeoutError } from "@/lib/external/fetch-with-timeout";

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    wind_speed_10m_max?: number[];
    precipitation_sum?: number[];
  };
};

type RegionDefinition = {
  regionName: string;
  latitude: number;
  longitude: number;
};

const WEATHER_REGIONS: RegionDefinition[] = signageMeteoRegions;

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

function resolveRegion(request: NextRequest): RegionDefinition | null {
  const input = request.nextUrl.searchParams.get("regionName");
  if (!input) {
    return WEATHER_REGIONS[0];
  }
  const exact = WEATHER_REGIONS.find((item) => item.regionName === input);
  if (exact) {
    return exact;
  }
  const partial = WEATHER_REGIONS.find((item) => item.regionName.includes(input));
  return partial ?? null;
}

function codeToOverview(code: number) {
  if (code <= 1) {
    return "晴れ";
  }
  if (code <= 3) {
    return "くもり";
  }
  if (code >= 51 && code <= 67) {
    return "雨";
  }
  if (code >= 71 && code <= 77) {
    return "雪";
  }
  if (code >= 95) {
    return "雷雨";
  }
  return "天気変化あり";
}

function buildAlerts(
  precipitationMm: number,
  windSpeedMs: number,
  weatherCode: number
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  if (windSpeedMs >= 15) {
    alerts.push({ type: "強風警報相当", level: "warning" });
  } else if (windSpeedMs >= 10) {
    alerts.push({ type: "強風注意報相当", level: "advisory" });
  }
  if (precipitationMm >= 20 || weatherCode >= 95) {
    alerts.push({ type: "大雨警報相当", level: "warning" });
  } else if (precipitationMm >= 10) {
    alerts.push({ type: "大雨注意報相当", level: "advisory" });
  }
  return alerts;
}

function toSnapshot(regionName: string, payload: OpenMeteoDailyResponse): WeatherSnapshot | null {
  const daily = payload.daily;
  const date = daily?.time?.[0];
  const temperature = daily?.temperature_2m_max?.[0];
  const windKmh = daily?.wind_speed_10m_max?.[0];
  const precipitation = daily?.precipitation_sum?.[0];
  const weatherCode = daily?.weather_code?.[0] ?? 0;

  if (
    typeof date !== "string" ||
    typeof temperature !== "number" ||
    typeof windKmh !== "number" ||
    typeof precipitation !== "number"
  ) {
    return null;
  }

  const windSpeedMs = Math.round((windKmh / 3.6) * 10) / 10;
  const precipitationMm = Math.round(precipitation * 10) / 10;
  const alerts = buildAlerts(precipitationMm, windSpeedMs, weatherCode);

  return {
    regionName,
    date,
    overview: codeToOverview(weatherCode),
    temperatureCelsius: Math.round(temperature * 10) / 10,
    windSpeedMs,
    precipitationMm,
    alerts,
  };
}

function buildFallbackSnapshot(regionName: string): WeatherSnapshot {
  return {
    regionName,
    date: new Date().toISOString().slice(0, 10),
    overview: "情報なし",
    temperatureCelsius: 0,
    windSpeedMs: 0,
    precipitationMm: 0,
    alerts: [],
  };
}

export async function GET(request: NextRequest) {
  const region = resolveRegion(request);
  if (!region) {
    return errorResponse(400, "VALIDATION", "指定された地域には現在対応していません。", false);
  }

  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", String(region.latitude));
  endpoint.searchParams.set("longitude", String(region.longitude));
  endpoint.searchParams.set("timezone", "Asia/Tokyo");
  endpoint.searchParams.set("forecast_days", "1");
  endpoint.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,wind_speed_10m_max,precipitation_sum"
  );

  let snapshot: WeatherSnapshot | null = null;
  let provider: WeatherRiskApiResponse["provider"] = "open-meteo";

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
    snapshot = toSnapshot(region.regionName, payload);
  } catch (err) {
    const reason = err instanceof CircuitOpenError
      ? "open-meteo circuit open"
      : err instanceof TimeoutError
        ? "open-meteo timeout"
        : err instanceof Error
          ? err.message
          : "open-meteo unknown error";
    console.error("[weather-risk] degraded:", reason);
    snapshot = buildFallbackSnapshot(region.regionName);
    provider = "mock-fallback";
  }

  if (!snapshot) {
    snapshot = buildFallbackSnapshot(region.regionName);
    provider = "mock-fallback";
  }

  const body: WeatherRiskApiResponse = {
    snapshot,
    provider,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "x-weather-source": provider },
  });
}
