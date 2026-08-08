import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky/scenarios";
import type {
  VisualKyCategory,
  VisualKyScenario,
} from "@/data/visual-ky/schema";

export type VisualKyWeatherSignal = "heat" | "rain" | "wind" | null;

export type DailyVisualKySelection = {
  dateKey: string;
  scenario: VisualKyScenario;
  selectionMode: "calendar-seasonal" | "weather-assisted";
  weatherFallback: boolean;
};

const JST_TIME_ZONE = "Asia/Tokyo";
const DAY_MS = 86_400_000;
const ROTATION_ANCHOR = "2025-01-01";
const COOLDOWN_DAYS = 7;
const RAIN_CATEGORIES = new Set<VisualKyCategory>([
  "trip",
  "traffic",
  "electrical",
  "load-handling",
]);
const WIND_CATEGORIES = new Set<VisualKyCategory>([
  "traffic",
  "scaffold",
  "fall",
  "load-handling",
]);

const jstDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: JST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getJstDateKey(date = new Date()): string {
  const parts = jstDateFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyToOrdinal(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return Math.floor(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) /
      DAY_MS,
  );
}

function ordinalToDateKey(ordinal: number): string {
  return new Date(ordinal * DAY_MS).toISOString().slice(0, 10);
}

function stableUnitInterval(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) + 1) / 4_294_967_297;
}

function weatherCategoryMultiplier(
  scenario: VisualKyScenario,
  signal: VisualKyWeatherSignal,
): number {
  if (signal === "heat") {
    return scenario.categoryTags.includes("heat") ? 2.4 : 1;
  }
  if (signal === "rain") {
    return scenario.categoryTags.some((category) =>
      RAIN_CATEGORIES.has(category),
    )
      ? 1.8
      : 1;
  }
  if (signal === "wind") {
    return scenario.categoryTags.some((category) =>
      WIND_CATEGORIES.has(category),
    )
      ? 1.8
      : 1;
  }
  return 1;
}

export function getSeasonalWeight(
  scenario: VisualKyScenario,
  dateKey: string,
  weatherSignal: VisualKyWeatherSignal = null,
): number {
  const month = Number(dateKey.slice(5, 7));
  let weight = scenario.seasonalWeights.default;

  if (month >= 6 && month <= 9) {
    weight *= scenario.seasonalWeights.summer;
  }
  if (month === 6 || month === 7) {
    weight *= scenario.seasonalWeights.rainy;
  }
  if (month >= 8 && month <= 10) {
    weight *= scenario.seasonalWeights.typhoon;
  }
  if (month === 12 || month <= 2) {
    weight *= scenario.seasonalWeights.winter;
  }

  return Math.max(
    0.01,
    weight * weatherCategoryMultiplier(scenario, weatherSignal),
  );
}

function chooseForDay(
  dateKey: string,
  recentIds: readonly string[],
  weatherSignal: VisualKyWeatherSignal,
): VisualKyScenario {
  const recent = new Set(recentIds.slice(-COOLDOWN_DAYS));
  const eligible = PUBLIC_VISUAL_KY_SCENARIOS.filter(
    (scenario) => !recent.has(scenario.id),
  );
  const candidates =
    eligible.length > 0 ? eligible : [...PUBLIC_VISUAL_KY_SCENARIOS];

  return candidates
    .map((scenario) => {
      const unit = stableUnitInterval(`${dateKey}|${scenario.id}`);
      const weight = getSeasonalWeight(scenario, dateKey, weatherSignal);
      return {
        scenario,
        // Deterministic weighted exponential race. Smaller wins.
        score: -Math.log(unit) / weight,
      };
    })
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.scenario.id.localeCompare(right.scenario.id),
    )[0].scenario;
}

export function selectDailyVisualKy(input?: {
  date?: Date;
  weatherSignal?: VisualKyWeatherSignal;
  weatherDataAvailable?: boolean;
}): DailyVisualKySelection {
  if (PUBLIC_VISUAL_KY_SCENARIOS.length === 0) {
    throw new Error("No reviewed visual KY scenarios are available");
  }

  const date = input?.date ?? new Date();
  const dateKey = getJstDateKey(date);
  const targetOrdinal = dateKeyToOrdinal(dateKey);
  const anchorOrdinal = dateKeyToOrdinal(ROTATION_ANCHOR);
  const canUseWeather =
    input?.weatherDataAvailable === true &&
    input.weatherSignal !== undefined &&
    input.weatherSignal !== null;
  const targetWeatherSignal = canUseWeather
    ? (input?.weatherSignal ?? null)
    : null;
  const weatherFallback =
    input?.weatherDataAvailable === false &&
    input.weatherSignal !== undefined &&
    input.weatherSignal !== null;

  if (targetOrdinal < anchorOrdinal) {
    return {
      dateKey,
      scenario: chooseForDay(dateKey, [], targetWeatherSignal),
      selectionMode: canUseWeather
        ? "weather-assisted"
        : "calendar-seasonal",
      weatherFallback,
    };
  }

  const recentIds: string[] = [];
  let selected = PUBLIC_VISUAL_KY_SCENARIOS[0];

  for (
    let ordinal = anchorOrdinal;
    ordinal <= targetOrdinal;
    ordinal += 1
  ) {
    const currentDateKey = ordinalToDateKey(ordinal);
    const signal =
      ordinal === targetOrdinal ? targetWeatherSignal : null;
    selected = chooseForDay(currentDateKey, recentIds, signal);
    recentIds.push(selected.id);
    if (recentIds.length > COOLDOWN_DAYS) recentIds.shift();
  }

  return {
    dateKey,
    scenario: selected,
    selectionMode: canUseWeather ? "weather-assisted" : "calendar-seasonal",
    weatherFallback,
  };
}

export function getNextVisualKyScenario(
  currentId: string,
): VisualKyScenario {
  const index = PUBLIC_VISUAL_KY_SCENARIOS.findIndex(
    (scenario) => scenario.id === currentId,
  );
  const nextIndex =
    index < 0 ? 0 : (index + 1) % PUBLIC_VISUAL_KY_SCENARIOS.length;
  return PUBLIC_VISUAL_KY_SCENARIOS[nextIndex];
}

export function getDeterministicRandomScenario(
  seed: string,
  excludeId?: string,
): VisualKyScenario {
  const candidates = excludeId
    ? PUBLIC_VISUAL_KY_SCENARIOS.filter(
        (scenario) => scenario.id !== excludeId,
      )
    : [...PUBLIC_VISUAL_KY_SCENARIOS];
  const index = Math.floor(stableUnitInterval(seed) * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}
