import { officialAreaCandidateById } from "@/lib/area/official-area-resolver";
import type {
  WeatherRiskApiResponse,
  WeatherRiskPartialApiResponse,
} from "@/lib/types/api";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import type { KyWeatherSnapshot } from "@/lib/ky/zero-friction-types";
import { jstDateTimeParts } from "@/lib/ky/zero-friction-types";
import { jmaWarningName } from "@/lib/jma/warning-label";

export type KyWeatherPrefillResult =
  | { ok: true; snapshot: KyWeatherSnapshot }
  | {
      ok: false;
      reason:
        | "area-invalid"
        | "forecast-out-of-range"
        | "unavailable";
      snapshot: KyWeatherSnapshot | null;
    };

type WeatherPayload = WeatherRiskApiResponse | WeatherRiskPartialApiResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function isWeatherPayload(value: unknown): value is WeatherPayload {
  if (!isRecord(value)) return false;
  if (!isRecord(value.officialWarning)) return false;
  const warningStatus = value.officialWarning.status;
  return (
    warningStatus === "live" ||
    warningStatus === "degraded" ||
    warningStatus === "unresolved" ||
    warningStatus === "unavailable"
  );
}

export function isEnvironmentWbgtPayload(
  value: unknown,
  areaId: string,
): value is EnvironmentWbgtStatus {
  if (!isRecord(value) || value.areaId !== areaId) return false;
  if (!isRecord(value.wbgt) || !isRecord(value.alerts)) return false;
  return (
    (value.wbgt.status === "estimated" ||
      value.wbgt.status === "unavailable") &&
    typeof value.retrievedAt === "string" &&
    value.provider === "環境省 熱中症予防情報サイト"
  );
}

function validNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function warningState(payload: WeatherPayload | null) {
  const warning = payload?.officialWarning;
  return {
    warningStatus: warning?.status ?? ("unavailable" as const),
    warnings: Array.isArray(warning?.warnings)
      ? warning.warnings.map((item) => ({
          ...item,
          name: jmaWarningName(item.code),
        }))
      : [],
  };
}

export function combineKyWeatherPayloads(input: {
  areaId: string;
  weather: WeatherPayload | null;
  wbgt: EnvironmentWbgtStatus | null;
  now?: Date;
}): KyWeatherSnapshot | null {
  const area = officialAreaCandidateById(input.areaId);
  if (!area) return null;
  const now = input.now ?? new Date();
  const retrievedAt = now.toISOString();
  const weather = input.weather;
  const weatherSnapshot =
    weather && "snapshot" in weather ? weather.snapshot : null;
  const current = weather && "current" in weather ? weather.current : null;
  const wbgt = input.wbgt;
  const wbgtValue = wbgt?.wbgt;
  const warning = warningState(weather);
  const weatherFetchedAt =
    validIso(weather?.fetchedAt) ?? retrievedAt;
  const weatherAgeMs = now.getTime() - Date.parse(weatherFetchedAt);
  const weatherStale =
    !Number.isFinite(weatherAgeMs) ||
    weatherAgeMs < -10 * 60 * 1000 ||
    weatherAgeMs > 2 * 60 * 60 * 1000;
  const wbgtStale = wbgtValue?.stale === true;
  const hasWeather = Boolean(weatherSnapshot || current);
  const hasWbgt =
    wbgtValue?.status === "estimated" &&
    typeof wbgtValue.valueCelsius === "number";
  const hasOfficialWarning = warning.warningStatus !== "unavailable";
  if (!hasWeather && !hasWbgt && !hasOfficialWarning) return null;

  const unavailableWeather = !weatherSnapshot && !current;
  const unavailableWbgt = !hasWbgt;
  const degraded =
    unavailableWeather ||
    unavailableWbgt ||
    !current ||
    warning.warningStatus !== "live" ||
    wbgt?.degraded === true;
  const stale = weatherStale || wbgtStale;
  const availability: KyWeatherSnapshot["availability"] = stale
    ? "stale"
    : degraded
      ? "degraded"
      : "estimated";

  return {
    areaId: area.id,
    areaLabel: area.label,
    resolutionLabel: area.resolutionLabel,
    weather: weatherSnapshot?.overview ?? null,
    temperatureCelsius:
      validNumber(current?.temperatureCelsius) ??
      validNumber(weatherSnapshot?.temperatureCelsius),
    relativeHumidityPercent: validNumber(current?.relativeHumidityPercent),
    windSpeedMs: validNumber(weatherSnapshot?.windSpeedMs),
    precipitationMm: validNumber(weatherSnapshot?.precipitationMm),
    wbgtCelsius: hasWbgt ? (wbgtValue?.valueCelsius ?? null) : null,
    wbgtKind: hasWbgt ? "estimated" : "unavailable",
    heatAlert: wbgt?.alerts.heatAlert ?? "unavailable",
    specialHeatAlert: wbgt?.alerts.specialHeatAlert ?? "unavailable",
    warningStatus: warning.warningStatus,
    warnings: warning.warnings,
    targetAt: validIso(current?.targetAt),
    targetDate: validIso(current?.targetAt) ? null : weatherSnapshot?.date ?? null,
    fetchedAt: weatherFetchedAt,
    wbgtTargetAt: validIso(wbgtValue?.targetAt),
    wbgtRetrievedAt: validIso(wbgt?.retrievedAt),
    providers: [
      ...(hasWeather ? ["Open-Meteo（気象グリッド推定）"] : []),
      ...(wbgt ? [wbgt.provider] : []),
      ...(hasOfficialWarning ? ["気象庁 防災情報"] : []),
    ],
    availability,
    stale,
    degraded,
    manuallyEditedFields: [],
  };
}

async function requestJson(
  url: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; value: unknown }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    const value = await response.json().catch(() => null);
    return { ok: response.ok, value };
  } catch {
    return { ok: false, value: null };
  }
}

export async function fetchKyWeatherPrefill(input: {
  areaId: string;
  workDate: string;
  signal?: AbortSignal;
  now?: Date;
}): Promise<KyWeatherPrefillResult> {
  const area = officialAreaCandidateById(input.areaId);
  if (!area) {
    return { ok: false, reason: "area-invalid", snapshot: null };
  }
  const now = input.now ?? new Date();
  const today = jstDateTimeParts(now).date;
  const workDateMs = Date.parse(`${input.workDate}T00:00:00+09:00`);
  const todayMs = Date.parse(`${today}T00:00:00+09:00`);
  const daysAhead = Math.round((workDateMs - todayMs) / 86_400_000);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(input.workDate) ||
    !Number.isFinite(workDateMs) ||
    daysAhead < 0 ||
    daysAhead > 6
  ) {
    return {
      ok: false,
      reason: "forecast-out-of-range",
      snapshot: null,
    };
  }

  const encodedArea = encodeURIComponent(area.id);
  const encodedDate = encodeURIComponent(input.workDate);
  const weatherPromise = requestJson(
    `/api/weather-risk?area=${encodedArea}&date=${encodedDate}`,
    input.signal,
  );
  const [weatherResult, wbgtResult] = daysAhead === 0
    ? await Promise.all([
        weatherPromise,
        requestJson(`/api/wbgt?area=${encodedArea}`, input.signal),
      ])
    : [await weatherPromise, { ok: false, value: null }];
  const weather = isWeatherPayload(weatherResult.value)
    ? weatherResult.value
    : null;
  const wbgt = isEnvironmentWbgtPayload(wbgtResult.value, area.id)
    ? wbgtResult.value
    : null;
  const snapshot = combineKyWeatherPayloads({
    areaId: area.id,
    weather,
    wbgt,
    now,
  });
  if (!snapshot) {
    return { ok: false, reason: "unavailable", snapshot: null };
  }
  if (!weatherResult.ok || !wbgtResult.ok || snapshot.degraded || snapshot.stale) {
    return { ok: false, reason: "unavailable", snapshot };
  }
  return { ok: true, snapshot };
}

export function overrideKyWeatherField(
  snapshot: KyWeatherSnapshot,
  field: "weather" | "temperature" | "humidity" | "wbgt",
  value: string,
): KyWeatherSnapshot {
  const numeric = Number(value);
  const edited = new Set(snapshot.manuallyEditedFields);
  edited.add(field);
  if (field === "weather") {
    return {
      ...snapshot,
      weather: value.trim() || null,
      manuallyEditedFields: [...edited],
    };
  }
  const safeNumber = value.trim() && Number.isFinite(numeric) ? numeric : null;
  return {
    ...snapshot,
    ...(field === "temperature"
      ? { temperatureCelsius: safeNumber }
      : field === "humidity"
        ? { relativeHumidityPercent: safeNumber }
        : { wbgtCelsius: safeNumber, wbgtKind: "estimated" as const }),
    manuallyEditedFields: [...edited],
  };
}
