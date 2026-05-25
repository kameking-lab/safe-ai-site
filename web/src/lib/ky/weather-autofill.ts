/**
 * KY全面再設計 Phase 2: 天気・気温の自動取得。
 *
 * 社長要件: 天気・気温・日付を自動取得する。
 * 新しい外部APIは導入せず、既存の `/api/weather-forecast`（Open-Meteo・無料）を
 * 再利用する。マッピングは純粋関数として単体テスト可能にしている。
 */

/** /api/weather-forecast のレスポンス形のうち本機能が使う部分のみ（routeへの結合を避ける） */
export type ForecastDayLite = {
  date: string;
  weatherLabel: string;
  maxTempC: number;
  minTempC: number;
};
export type RegionForecastLite = {
  regionId: string;
  regionLabel: string;
  days: ForecastDayLite[];
};
export type WeatherForecastLite = {
  regions: RegionForecastLite[];
  fetchedAt?: string;
  degraded?: boolean;
};

/** 地域プルダウン用（/api/weather-forecast の REGIONS と同じID体系） */
export const WEATHER_REGIONS: readonly { id: string; label: string }[] = Object.freeze([
  { id: "hokkaido", label: "北海道" },
  { id: "tohoku", label: "東北" },
  { id: "kanto", label: "関東" },
  { id: "chubu", label: "中部" },
  { id: "kinki", label: "近畿" },
  { id: "chugoku", label: "中国" },
  { id: "shikoku", label: "四国" },
  { id: "kyushu", label: "九州" },
]);

export const DEFAULT_WEATHER_REGION = "kanto";

/** 今日のISO日付（端末ローカルタイム）。yyyy-mm-dd */
export function todayLocalISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** レスポンスから指定地域・指定日の予報を取り出す。無ければ地域の先頭日にフォールバック。 */
export function pickForecast(
  res: WeatherForecastLite | null | undefined,
  regionId: string,
  dateISO: string
): ForecastDayLite | null {
  if (!res || !Array.isArray(res.regions)) return null;
  const region =
    res.regions.find((r) => r.regionId === regionId) ?? res.regions[0];
  if (!region || !Array.isArray(region.days) || region.days.length === 0) return null;
  return region.days.find((d) => d.date === dateISO) ?? region.days[0];
}

export type WeatherFields = { weather: string; temperature: string };

/** 予報日を KY の {weather, temperature(℃, 最高気温)} へ変換 */
export function toWeatherFields(day: ForecastDayLite | null): WeatherFields | null {
  if (!day) return null;
  const temp = Number.isFinite(day.maxTempC) ? String(Math.round(day.maxTempC)) : "";
  return { weather: day.weatherLabel || "", temperature: temp };
}

/**
 * 既存 /api/weather-forecast を叩いて当日の天気・気温を返す。
 * 取得失敗時は null（呼び出し側はフォールバックして手入力を促す）。
 */
export async function fetchWeatherAutofill(
  regionId: string = DEFAULT_WEATHER_REGION,
  now: Date = new Date()
): Promise<WeatherFields | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/weather-forecast", { method: "GET" });
    if (!res.ok) return null;
    const json = (await res.json()) as WeatherForecastLite;
    const day = pickForecast(json, regionId, todayLocalISO(now));
    return toWeatherFields(day);
  } catch {
    return null;
  }
}
