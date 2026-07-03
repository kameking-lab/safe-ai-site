import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";

export type SignageHourlyPoint = {
  time: string;
  hourLabel: string;
  tempC: number;
  precipMm: number;
  windMs: number;
  weatherLabel: string;
  /** WMO Open-Meteo weathercode */
  weatherCode: number;
  /** 相対湿度(%)。WBGT常掲値の算出に使用（S5）。上流欠測時は undefined */
  humidityPct?: number;
};

export type SignageWeatherApiResponse = {
  mapLevels: Record<JapanRegionId, MapAlertLevel>;
  hourly: SignageHourlyPoint[];
  mapMode: "today" | "week";
  sourceRegionName: string;
  fetchedAt: string;
};
