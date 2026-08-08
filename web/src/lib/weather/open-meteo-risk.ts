import type { WeatherRiskApiResponse } from "@/lib/types/api";
import type { WeatherAlert, WeatherSnapshot } from "@/lib/types/domain";
import { parseOpenMeteoTargetTime } from "@/lib/weather/open-meteo-hourly";

export type OpenMeteoDailyResponse = {
  timezone?: string;
  utc_offset_seconds?: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    wind_speed_10m_max?: number[];
    precipitation_sum?: number[];
  };
};

const CURRENT_STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const CURRENT_FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

function codeToOverview(code: number) {
  if (code <= 1) return "晴れ";
  if (code <= 3) return "くもり";
  if (code >= 51 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 95) return "雷雨";
  return "天気変化あり";
}

export function buildOpenMeteoRiskSignals(
  precipitationMm: number,
  windSpeedMs: number,
  weatherCode: number,
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  if (windSpeedMs >= 15) {
    alerts.push({ type: "独自目安: 強風（危険工程の中止基準を確認）", level: "warning" });
  } else if (windSpeedMs >= 10) {
    alerts.push({ type: "独自目安: 強風に注意", level: "advisory" });
  }
  if (precipitationMm >= 20 || weatherCode >= 95) {
    alerts.push({
      type:
        weatherCode >= 95
          ? "独自目安: 雷のおそれ・予想降水量合計を確認（危険工程の中止基準を確認）"
          : "独自目安: 予想降水量合計20mm以上（降る時間帯と中止基準を確認）",
      level: "warning",
    });
  } else if (precipitationMm >= 10) {
    alerts.push({
      type: "独自目安: 予想降水量合計10mm以上（降る時間帯を確認）",
      level: "advisory",
    });
  }
  return alerts;
}

export function toOpenMeteoSnapshot(
  regionName: string,
  payload: OpenMeteoDailyResponse,
): WeatherSnapshot | null {
  const daily = payload.daily;
  const date = daily?.time?.[0];
  const temperature = daily?.temperature_2m_max?.[0];
  const windKmh = daily?.wind_speed_10m_max?.[0];
  const precipitation = daily?.precipitation_sum?.[0];
  const weatherCode = daily?.weather_code?.[0];
  const targetTime =
    typeof date === "string"
      ? parseOpenMeteoTargetTime(date, payload, { allowDateOnly: true })
      : null;

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !targetTime ||
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    typeof windKmh !== "number" ||
    !Number.isFinite(windKmh) ||
    windKmh < 0 ||
    typeof precipitation !== "number" ||
    !Number.isFinite(precipitation) ||
    precipitation < 0 ||
    typeof weatherCode !== "number" ||
    !Number.isInteger(weatherCode) ||
    weatherCode < 0 ||
    weatherCode > 99
  ) {
    return null;
  }

  const windSpeedMs = Math.round((windKmh / 3.6) * 10) / 10;
  const precipitationMm = Math.round(precipitation * 10) / 10;
  const alerts = buildOpenMeteoRiskSignals(precipitationMm, windSpeedMs, weatherCode);

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

export function toOpenMeteoCurrent(
  payload: OpenMeteoDailyResponse,
): WeatherRiskApiResponse["current"] | null {
  const current = payload.current;
  const targetAt =
    typeof current?.time === "string"
      ? parseOpenMeteoTargetTime(current.time, payload)
      : null;
  const temperature = current?.temperature_2m;
  const humidity = current?.relative_humidity_2m;
  if (
    !targetAt ||
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    typeof humidity !== "number" ||
    !Number.isFinite(humidity) ||
    humidity < 0 ||
    humidity > 100
  ) {
    return null;
  }
  return {
    temperatureCelsius: Math.round(temperature * 10) / 10,
    relativeHumidityPercent: Math.round(humidity),
    targetAt: targetAt.toISOString(),
  };
}

export function isOpenMeteoCurrentFresh(
  current: WeatherRiskApiResponse["current"],
  nowMs = Date.now(),
): boolean {
  if (!current) return false;
  const targetMs = Date.parse(current.targetAt);
  if (!Number.isFinite(targetMs)) return false;
  const age = nowMs - targetMs;
  return age >= -CURRENT_FUTURE_TOLERANCE_MS && age <= CURRENT_STALE_AFTER_MS;
}
