import { signageLocations } from "@/data/signage-locations";
import type { WeatherSnapshot } from "@/lib/types/domain";

function mockForRegion(regionName: string, i: number): WeatherSnapshot {
  const t = 12 + (i % 12);
  return {
    regionName,
    date: new Date().toISOString().slice(0, 10),
    overview: i % 3 === 0 ? "晴れ" : i % 3 === 1 ? "くもり" : "雨のちくもり",
    temperatureCelsius: t,
    windSpeedMs: 4 + (i % 8),
    precipitationMm: (i * 3) % 15,
    alerts: i % 5 === 0 ? [{ type: "強風注意報", level: "advisory" }] : [],
  };
}

export const weatherSnapshotsMock: WeatherSnapshot[] = signageLocations.map((loc, i) =>
  mockForRegion(loc.regionName, i)
);
