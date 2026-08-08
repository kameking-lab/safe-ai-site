/**
 * /api/weather-forecast
 * 8 地域ブロックの向こう7日間の日別予報を返す。
 * Open-Meteo の無料API を使用（既存インフラと同じ）。
 */
import { NextResponse } from "next/server";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";
import {
  hasExpectedTokyoMetadata,
  parseOpenMeteoTargetTime,
} from "@/lib/weather/open-meteo-hourly";

export type ForecastDay = {
  date: string;          // "2026-04-11"
  weatherLabel: string;
  weatherCode: number;
  maxTempC: number;
  minTempC: number;
  precipMm: number;
  maxWindMs: number;
  alertLevel: "none" | "advisory" | "warning";
};

export type RegionForecast = {
  regionId: string;
  regionLabel: string;
  days: ForecastDay[];
};

export type WeatherForecastApiResponse = {
  regions: RegionForecast[];
  fetchedAt: string;
  /** Open-Meteo 取得に失敗してフォールバック挙動になった場合 true */
  degraded?: boolean;
  degradedReason?: string;
  unavailableRegions?: string[];
};

type DailyPayload = {
  timezone?: string;
  utc_offset_seconds?: number;
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
};

const REGIONS: { id: string; label: string; lat: number; lon: number }[] = [
  { id: "hokkaido", label: "北海道",  lat: 43.0618, lon: 141.3545 },
  { id: "tohoku",   label: "東北",    lat: 38.2682, lon: 140.8694 },
  { id: "kanto",    label: "関東",    lat: 35.6938, lon: 139.7034 },
  { id: "chubu",    label: "中部",    lat: 35.1815, lon: 136.9066 },
  { id: "kinki",    label: "近畿",    lat: 34.6937, lon: 135.5023 },
  { id: "chugoku",  label: "中国",    lat: 34.3853, lon: 132.4553 },
  { id: "shikoku",  label: "四国",    lat: 34.3403, lon: 134.0439 },
  { id: "kyushu",   label: "九州",    lat: 33.5902, lon: 130.4017 },
];

function codeToLabel(code: number): string {
  if (code <= 1) return "晴れ";
  if (code <= 3) return "くもり";
  if (code >= 51 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 95) return "雷雨";
  return "変化あり";
}

function windKmhToMs(kmh: number) {
  return Math.round((kmh / 3.6) * 10) / 10;
}

function alertLevel(maxWindMs: number, precipMm: number, code: number): ForecastDay["alertLevel"] {
  if (maxWindMs >= 15 || precipMm >= 20 || code >= 95) return "warning";
  if (maxWindMs >= 10 || precipMm >= 5) return "advisory";
  return "none";
}

async function fetchRegionForecast(region: (typeof REGIONS)[number]): Promise<RegionForecast> {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(region.lat));
  u.searchParams.set("longitude", String(region.lon));
  u.searchParams.set("timezone", "Asia/Tokyo");
  u.searchParams.set("forecast_days", "7");
  u.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
  );

  const res = await fetchWithTimeout(u.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
    timeoutMs: 6000,
  });
  if (!res.ok) throw new Error(`open-meteo HTTP ${res.status} for ${region.id}`);
  const payload = (await res.json()) as DailyPayload;
  const daily = payload.daily;
  const times = daily?.time;
  const numericSeries = [
    daily?.weather_code,
    daily?.temperature_2m_max,
    daily?.temperature_2m_min,
    daily?.precipitation_sum,
    daily?.wind_speed_10m_max,
  ];
  if (
    !hasExpectedTokyoMetadata(payload) ||
    !Array.isArray(times) ||
    times.length === 0 ||
    numericSeries.some(
      (series) =>
        !Array.isArray(series) ||
        series.length < times.length ||
        series.slice(0, times.length).some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error(`open-meteo invalid daily payload for ${region.id}`);
  }
  if (times.some((time) => !parseOpenMeteoTargetTime(time, payload, { allowDateOnly: true }))) {
    throw new Error(`open-meteo invalid daily time for ${region.id}`);
  }

  const days: ForecastDay[] = times.map((date, i) => {
    const code = daily?.weather_code?.[i] ?? 0;
    const maxTemp = daily?.temperature_2m_max?.[i] ?? 0;
    const minTemp = daily?.temperature_2m_min?.[i] ?? 0;
    const precip = daily?.precipitation_sum?.[i] ?? 0;
    const windKmh = daily?.wind_speed_10m_max?.[i] ?? 0;
    const windMs = windKmhToMs(windKmh);
    return {
      date,
      weatherLabel: codeToLabel(code),
      weatherCode: code,
      maxTempC: Math.round(maxTemp * 10) / 10,
      minTempC: Math.round(minTemp * 10) / 10,
      precipMm: Math.round(precip * 10) / 10,
      maxWindMs: windMs,
      alertLevel: alertLevel(windMs, precip, code),
    };
  });

  return { regionId: region.id, regionLabel: region.label, days };
}

export async function GET() {
  try {
    const settled = await withCircuitBreaker(
      "open-meteo",
      async () => {
        const results = await Promise.allSettled(
          REGIONS.map(fetchRegionForecast),
        );
        if (results.every((result) => result.status === "rejected")) {
          throw new Error("all Open-Meteo regions unavailable");
        }
        return results;
      },
      { failureThreshold: 5, cooldownMs: 120_000 }
    );
    const regions = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const unavailableRegions = settled.flatMap((result, index) =>
      result.status === "rejected" ? [REGIONS[index]!.id] : [],
    );
    const degraded = unavailableRegions.length > 0;
    const body: WeatherForecastApiResponse = {
      regions,
      fetchedAt: new Date().toISOString(),
      ...(degraded
        ? {
            degraded: true,
            degradedReason: "partial_region_failure",
            unavailableRegions,
          }
        : {}),
    };
    return NextResponse.json(body, {
      status: degraded ? 206 : 200,
      headers: {
        "Cache-Control": "no-store",
        "x-weather-source": degraded ? "open-meteo-partial" : "open-meteo",
      },
    });
  } catch (err) {
    const failureKind = err instanceof CircuitOpenError ? "circuit_open" : "source_error";
    console.error("[weather-forecast] source unavailable", { failureKind });
    return NextResponse.json<WeatherForecastApiResponse>({
      regions: [],
      fetchedAt: new Date().toISOString(),
      degraded: true,
      degradedReason: "weather_source_unavailable",
    }, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "60",
        "x-weather-source": "unavailable",
      },
    });
  }
}
