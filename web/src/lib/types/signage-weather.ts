import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";

export type SignageHourlyPoint = {
  time: string;
  hourLabel: string;
  tempC: number;
  precipMm: number;
  windMs: number;
  weatherLabel: string;
};

export type SignageWeatherApiResponse = {
  mapLevels: Record<JapanRegionId, MapAlertLevel>;
  hourly: SignageHourlyPoint[];
  mapMode: "today" | "week";
  sourceRegionName: string;
  fetchedAt: string;
};
