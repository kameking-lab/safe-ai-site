import { NextRequest, NextResponse } from "next/server";
import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";
import type { SignageHourlyPoint, SignageWeatherApiResponse } from "@/lib/types/signage-weather";

type HourlyPayload = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
  };
};

type DailyPayload = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    wind_speed_10m_max?: number[];
    precipitation_sum?: number[];
  };
};

const REGION_POINTS: Record<
  JapanRegionId,
  { lat: number; lon: number; representativeName: string }
> = {
  hokkaido: { lat: 43.0618, lon: 141.3545, representativeName: "北海道 札幌市" },
  tohoku: { lat: 38.2682, lon: 140.8694, representativeName: "宮城県 仙台市" },
  kanto: { lat: 35.6938, lon: 139.7034, representativeName: "東京都 新宿区" },
  chubu: { lat: 35.1815, lon: 136.9066, representativeName: "愛知県 名古屋市" },
  kinki: { lat: 34.6937, lon: 135.5023, representativeName: "大阪府 大阪市" },
  chugoku: { lat: 34.3853, lon: 132.4553, representativeName: "広島県 広島市" },
  shikoku: { lat: 34.3403, lon: 134.0439, representativeName: "香川県 高松市" },
  kyushu: { lat: 33.5902, lon: 130.4017, representativeName: "福岡県 福岡市" },
};

const REGION_ORDER: JapanRegionId[] = [
  "hokkaido",
  "tohoku",
  "kanto",
  "chubu",
  "kinki",
  "chugoku",
  "shikoku",
  "kyushu",
];

function codeToOverview(code: number) {
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

function levelFromMetrics(maxWindMs: number, precipMm: number, maxWeatherCode: number): MapAlertLevel {
  const thunder = maxWeatherCode >= 95;
  if (maxWindMs >= 15 || precipMm >= 20 || thunder) {
    return "warning";
  }
  if (maxWindMs >= 10 || precipMm >= 5) {
    return "advisory";
  }
  return "none";
}

function levelFromDailyPayload(payload: DailyPayload): MapAlertLevel {
  const daily = payload.daily;
  const times = daily?.time ?? [];
  if (times.length === 0) return "none";
  let maxWind = 0;
  let maxPrecip = 0;
  let maxCode = 0;
  for (let i = 0; i < times.length; i += 1) {
    const w = daily?.wind_speed_10m_max?.[i];
    const p = daily?.precipitation_sum?.[i];
    const c = daily?.weather_code?.[i];
    if (typeof w === "number" && w > maxWind) maxWind = w;
    if (typeof p === "number" && p > maxPrecip) maxPrecip = p;
    if (typeof c === "number" && c > maxCode) maxCode = c;
  }
  return levelFromMetrics(windKmhToMs(maxWind), maxPrecip, maxCode);
}

function levelFromHourlyToday(payload: HourlyPayload, now: Date): MapAlertLevel {
  const hourly = payload.hourly;
  const times = hourly?.time ?? [];
  if (times.length === 0) return "none";

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  let maxWindMs = 0;
  let sumPrecip = 0;
  let maxCode = 0;

  for (let i = 0; i < times.length; i += 1) {
    const t = new Date(times[i]!);
    if (t < now || t > endOfDay) continue;
    const w = hourly?.wind_speed_10m?.[i];
    const p = hourly?.precipitation?.[i];
    const c = hourly?.weather_code?.[i];
    if (typeof w === "number") {
      const ms = windKmhToMs(w);
      if (ms > maxWindMs) maxWindMs = ms;
    }
    if (typeof p === "number") sumPrecip += p;
    if (typeof c === "number" && c > maxCode) maxCode = c;
  }

  if (maxWindMs === 0 && sumPrecip === 0 && maxCode === 0) {
    for (let i = 0; i < times.length; i += 1) {
      const t = new Date(times[i]!);
      if (t < now) continue;
      const w = hourly?.wind_speed_10m?.[i];
      const p = hourly?.precipitation?.[i];
      const c = hourly?.weather_code?.[i];
      if (typeof w === "number") {
        const ms = windKmhToMs(w);
        if (ms > maxWindMs) maxWindMs = ms;
      }
      if (typeof p === "number") sumPrecip += p;
      if (typeof c === "number" && c > maxCode) maxCode = c;
      if (i > 24) break;
    }
  }

  return levelFromMetrics(maxWindMs, sumPrecip, maxCode);
}

function buildHourlySeries(payload: HourlyPayload, now: Date, maxSlots = 48): SignageHourlyPoint[] {
  const hourly = payload.hourly;
  const times = hourly?.time ?? [];
  const out: SignageHourlyPoint[] = [];
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  });

  for (let i = 0; i < times.length && out.length < maxSlots; i += 1) {
    const t = new Date(times[i]!);
    if (t < now) continue;
    const temp = hourly?.temperature_2m?.[i];
    const precip = hourly?.precipitation?.[i];
    const code = hourly?.weather_code?.[i] ?? 0;
    const wind = hourly?.wind_speed_10m?.[i];
    if (typeof temp !== "number" || typeof wind !== "number" || typeof precip !== "number") continue;
    out.push({
      time: times[i]!,
      hourLabel: formatter.format(t),
      tempC: Math.round(temp * 10) / 10,
      precipMm: Math.round(precip * 10) / 10,
      windMs: windKmhToMs(wind),
      weatherLabel: codeToOverview(code),
      weatherCode: code,
    });
  }
  return out;
}

function resolveRegionId(regionName: string | null): JapanRegionId {
  if (!regionName) return "kanto";
  const hit = REGION_ORDER.find((id) => {
    const name = REGION_POINTS[id].representativeName;
    return name === regionName || name.includes(regionName) || regionName.includes(name.split(" ")[1] ?? "");
  });
  return hit ?? "kanto";
}

async function fetchHourly(lat: number, lon: number) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("timezone", "Asia/Tokyo");
  u.searchParams.set("forecast_days", "3");
  u.searchParams.set("hourly", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error("hourly");
  return (await res.json()) as HourlyPayload;
}

async function fetchDailyWeek(lat: number, lon: number) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("timezone", "Asia/Tokyo");
  u.searchParams.set("forecast_days", "7");
  u.searchParams.set("daily", "weather_code,wind_speed_10m_max,precipitation_sum");
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error("daily");
  return (await res.json()) as DailyPayload;
}

export async function GET(request: NextRequest) {
  const mapMode = request.nextUrl.searchParams.get("mapMode") === "week" ? "week" : "today";
  const regionName = request.nextUrl.searchParams.get("regionName");
  const selectedId = resolveRegionId(regionName);
  const now = new Date();

  try {
    const mapLevels = {} as Record<JapanRegionId, MapAlertLevel>;
    let selectedHourlyPayload: HourlyPayload;

    if (mapMode === "today") {
      const hourlyPayloads = await Promise.all(
        REGION_ORDER.map((id) => fetchHourly(REGION_POINTS[id].lat, REGION_POINTS[id].lon))
      );
      REGION_ORDER.forEach((id, idx) => {
        mapLevels[id] = levelFromHourlyToday(hourlyPayloads[idx]!, now);
      });
      const selectedIdx = REGION_ORDER.indexOf(selectedId);
      selectedHourlyPayload = hourlyPayloads[selectedIdx] ?? hourlyPayloads[2]!;
    } else {
      const dailyPayloads = await Promise.all(
        REGION_ORDER.map((id) => fetchDailyWeek(REGION_POINTS[id].lat, REGION_POINTS[id].lon))
      );
      REGION_ORDER.forEach((id, idx) => {
        mapLevels[id] = levelFromDailyPayload(dailyPayloads[idx]!);
      });
      const { lat, lon } = REGION_POINTS[selectedId];
      selectedHourlyPayload = await fetchHourly(lat, lon);
    }

    const hourly = buildHourlySeries(selectedHourlyPayload, now, 48);

    const body: SignageWeatherApiResponse = {
      mapLevels,
      hourly,
      mapMode,
      sourceRegionName: REGION_POINTS[selectedId].representativeName,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      status: 200,
      headers: { "x-signage-weather": "open-meteo" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UNAVAILABLE", message: "サイネージ用天気の取得に失敗しました。" } },
      { status: 503 }
    );
  }
}
