import type { SignageHourlyPoint } from "@/lib/types/signage-weather";

type HourlyPayload = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
  };
};

export function codeToOverview(code: number) {
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

export function buildSignageHourlyFromPayload(
  payload: HourlyPayload,
  now: Date,
  maxSlots = 48
): SignageHourlyPoint[] {
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

export async function fetchOpenMeteoHourlyPayload(lat: number, lon: number): Promise<HourlyPayload> {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("timezone", "Asia/Tokyo");
  u.searchParams.set("forecast_days", "3");
  u.searchParams.set("hourly", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error("open-meteo-hourly");
  return (await res.json()) as HourlyPayload;
}

export async function fetchSignageHourlySeries(lat: number, lon: number, maxSlots = 48): Promise<SignageHourlyPoint[]> {
  const payload = await fetchOpenMeteoHourlyPayload(lat, lon);
  return buildSignageHourlyFromPayload(payload, new Date(), maxSlots);
}
