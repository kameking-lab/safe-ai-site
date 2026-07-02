import { describe, it, expect } from "vitest";
import { buildWeatherEntry, type JmaForecastReport } from "./parse-jma-forecast";

describe("buildWeatherEntry", () => {
  it("先頭レポート・先頭timeSeries・先頭areaの当日天気を抽出", () => {
    const reports: JmaForecastReport[] = [
      {
        reportDatetime: "2026-07-02T17:00:00+09:00",
        publishingOffice: "気象庁",
        timeSeries: [
          {
            areas: [{ weatherCodes: ["200", "201"], weathers: ["くもり時々雨", "晴れ"] }],
          },
        ],
      },
    ];
    const entry = buildWeatherEntry("東京都", reports);
    expect(entry).toEqual({
      label: "東京都",
      reportDatetime: "2026-07-02T17:00:00+09:00",
      publishingOffice: "気象庁",
      todayWeatherCode: "200",
      todayWeatherText: "くもり時々雨",
    });
  });

  it("reports が空・欠落しても例外にならず null 埋めで返す", () => {
    expect(buildWeatherEntry("宮城県", [])).toEqual({
      label: "宮城県",
      reportDatetime: null,
      publishingOffice: null,
      todayWeatherCode: null,
      todayWeatherText: null,
    });
    expect(buildWeatherEntry("宮城県", undefined)).toEqual({
      label: "宮城県",
      reportDatetime: null,
      publishingOffice: null,
      todayWeatherCode: null,
      todayWeatherText: null,
    });
  });
});
