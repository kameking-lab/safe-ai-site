import type { SignageHourlyPoint } from "@/lib/types/signage-weather";

type HourlyPayload = {
  timezone?: string;
  utc_offset_seconds?: number;
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
    relative_humidity_2m?: number[];
  };
};

export type OpenMeteoTimeMetadata = {
  timezone?: unknown;
  utc_offset_seconds?: unknown;
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

/** Open-Meteo（timezone=Asia/Tokyo）の時刻文字列を JST の瞬間として解釈する */
export function hasExpectedTokyoMetadata(metadata: OpenMeteoTimeMetadata): boolean {
  return metadata.timezone === "Asia/Tokyo" && metadata.utc_offset_seconds === 9 * 60 * 60;
}

/**
 * Parse Open-Meteo target time without depending on the Node/browser local TZ.
 * Offset-less values are accepted only with explicit Asia/Tokyo/+09:00
 * metadata. Date-only values are accepted only when the caller opts in.
 */
export function parseOpenMeteoTargetTime(
  value: string,
  metadata: OpenMeteoTimeMetadata,
  options: {
    allowDateOnly?: boolean;
    referenceNow?: Date;
    maxPastMs?: number;
    maxFutureMs?: number;
  } = {}
): Date | null {
  const parts = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(?:Z|[+-]\d{2}:\d{2})?)?$/,
  );
  if (!parts) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = hourText === undefined ? 0 : Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  const second = secondText === undefined ? 0 : Number(secondText);
  if (
    year < 1970 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return null;
  }

  // The requested upstream contract is timezone=Asia/Tokyo.  Accepting a
  // different explicit offset together with Tokyo metadata would silently
  // reinterpret inconsistent data, so every representation must satisfy both.
  if (!hasExpectedTokyoMetadata(metadata)) return null;

  let candidate = "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+09:00$/.test(value)) {
    candidate = value;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    candidate = `${value}${value.length === 16 ? ":00" : ""}+09:00`;
  } else if (options.allowDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    candidate = `${value}T00:00:00+09:00`;
  } else {
    return null;
  }
  const parsed = new Date(candidate);
  if (!Number.isFinite(parsed.getTime())) return null;
  if (options.referenceNow) {
    const nowMs = options.referenceNow.getTime();
    if (!Number.isFinite(nowMs)) return null;
    if (
      typeof options.maxPastMs === "number" &&
      parsed.getTime() < nowMs - options.maxPastMs
    ) {
      return null;
    }
    if (
      typeof options.maxFutureMs === "number" &&
      parsed.getTime() > nowMs + options.maxFutureMs
    ) {
      return null;
    }
  }
  return parsed;
}

function tokyoYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function startOfHourTokyo(now: Date): Date {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = f.formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  const h = parts.find((p) => p.type === "hour")!.value;
  return new Date(`${y}-${m}-${day}T${h}:00:00+09:00`);
}

/** 東京の「翌日」の暦日（yyyy-mm-dd）。当日23時台でも翌日を返す */
function tokyoTomorrowYmd(now: Date): string {
  const today = tokyoYmd(now);
  const anchor = new Date(`${today}T12:00:00+09:00`);
  return tokyoYmd(new Date(anchor.getTime() + 30 * 3600000));
}

/**
 * 現在時刻の属する時台を先頭に、東京暦で「明日」の23時台まで（最大 maxSlots、既定48）。
 * サイネージは折り返しグリッド表示向け（横スクロール不要）。
 */
export function buildSignageHourlyFromPayload(
  payload: HourlyPayload,
  now: Date,
  maxSlots = 48
): SignageHourlyPoint[] {
  const hourly = payload.hourly;
  const times = hourly?.time ?? [];
  if (!hasExpectedTokyoMetadata(payload)) return [];
  const out: SignageHourlyPoint[] = [];
  // ja-JP の numeric hour は "14時" を返すため、末尾の「時」を付けると「14時時」と
  // 二重表示になる。en-US で純粋な数値に寄せる。
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    hour12: false,
  });
  const dayFmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  });

  const startHour = startOfHourTokyo(now);
  const tomorrowYmd = tokyoTomorrowYmd(now);
  let prevDayKey = "";

  for (let i = 0; i < times.length && out.length < maxSlots; i += 1) {
    const iso = times[i]!;
    const t = parseOpenMeteoTargetTime(iso, payload, {
      referenceNow: now,
      maxPastMs: 36 * 60 * 60 * 1_000,
      maxFutureMs: 80 * 60 * 60 * 1_000,
    });
    if (!t) return [];
    if (t < startHour) continue;

    const slotYmd = tokyoYmd(t);
    if (slotYmd > tomorrowYmd) break;

    const temp = hourly?.temperature_2m?.[i];
    const precip = hourly?.precipitation?.[i];
    const code = hourly?.weather_code?.[i] ?? 0;
    const wind = hourly?.wind_speed_10m?.[i];
    const humidity = hourly?.relative_humidity_2m?.[i];
    if (typeof temp !== "number" || typeof wind !== "number" || typeof precip !== "number") continue;

    let dayPrefix = "";
    if (slotYmd !== prevDayKey) {
      prevDayKey = slotYmd;
      dayPrefix = `${dayFmt.format(t)} `;
    }

    out.push({
      time: t.toISOString(),
      hourLabel: `${dayPrefix}${hourFmt.format(t)}時`.trim(),
      tempC: Math.round(temp * 10) / 10,
      precipMm: Math.round(precip * 10) / 10,
      windMs: windKmhToMs(wind),
      weatherLabel: codeToOverview(code),
      weatherCode: code,
      humidityPct: typeof humidity === "number" ? Math.round(humidity) : undefined,
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
  u.searchParams.set("hourly", "temperature_2m,precipitation,weather_code,wind_speed_10m,relative_humidity_2m");
  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json" },
    // 1h: 上流データ更新が 1h サイクル (docs/perf/isr-followup.md)
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("open-meteo-hourly");
  return (await res.json()) as HourlyPayload;
}

export async function fetchSignageHourlySeries(lat: number, lon: number, maxSlots = 48): Promise<SignageHourlyPoint[]> {
  const payload = await fetchOpenMeteoHourlyPayload(lat, lon);
  return buildSignageHourlyFromPayload(payload, new Date(), maxSlots);
}
