import type { WeatherSnapshot } from "@/lib/types/domain";

export const weatherSnapshotsMock: WeatherSnapshot[] = [
  {
    regionName: "東京都 新宿区",
    date: "2026-03-31",
    overview: "晴れ時々くもり",
    temperatureCelsius: 31,
    windSpeedMs: 9,
    precipitationMm: 2,
    alerts: [{ type: "強風注意報", level: "advisory" }],
  },
  {
    regionName: "大阪府 大阪市",
    date: "2026-03-31",
    overview: "くもり一時雨",
    temperatureCelsius: 24,
    windSpeedMs: 6,
    precipitationMm: 11,
    alerts: [{ type: "大雨注意報", level: "advisory" }],
  },
  {
    regionName: "愛知県 名古屋市",
    date: "2026-03-31",
    overview: "晴れ時々雨",
    temperatureCelsius: 29,
    windSpeedMs: 8,
    precipitationMm: 6,
    alerts: [{ type: "雷注意報", level: "advisory" }],
  },
  {
    regionName: "福岡県 福岡市",
    date: "2026-03-31",
    overview: "暴風雨",
    temperatureCelsius: 27,
    windSpeedMs: 16,
    precipitationMm: 24,
    alerts: [
      { type: "暴風警報", level: "warning" },
      { type: "大雨警報", level: "warning" },
    ],
  },
  {
    regionName: "北海道 札幌市",
    date: "2026-03-31",
    overview: "雪まじりの雨",
    temperatureCelsius: 4,
    windSpeedMs: 12,
    precipitationMm: 13,
    alerts: [{ type: "風雪注意報", level: "advisory" }],
  },
];
