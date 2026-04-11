/**
 * /api/weather-forecast
 * 8 地域ブロックの向こう7日間の日別予報を返す。
 * Open-Meteo の無料API を使用（既存インフラと同じ）。
 */
import { NextResponse } from "next/server";

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
};

type DailyPayload = {
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

  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }, // 1時間キャッシュ
  });
  if (!res.ok) throw new Error(`open-meteo error for ${region.id}`);
  const payload = (await res.json()) as DailyPayload;
  const daily = payload.daily;
  const times = daily?.time ?? [];

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
    const regions = await Promise.all(REGIONS.map(fetchRegionForecast));
    const body: WeatherForecastApiResponse = {
      regions,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(body, {
      status: 200,
      headers: { "x-weather-source": "open-meteo" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UNAVAILABLE", message: "天気予報の取得に失敗しました。" } },
      { status: 503 }
    );
  }
}
