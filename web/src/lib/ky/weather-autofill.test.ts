import { describe, it, expect } from "vitest";
import {
  todayLocalISO,
  pickForecast,
  toWeatherFields,
  WEATHER_REGIONS,
  type WeatherForecastLite,
} from "./weather-autofill";

const SAMPLE: WeatherForecastLite = {
  regions: [
    {
      regionId: "kanto",
      regionLabel: "関東",
      days: [
        { date: "2026-05-25", weatherLabel: "晴れ", maxTempC: 24.6, minTempC: 15.1 },
        { date: "2026-05-26", weatherLabel: "雨", maxTempC: 19.2, minTempC: 14.0 },
      ],
    },
    {
      regionId: "kinki",
      regionLabel: "近畿",
      days: [{ date: "2026-05-25", weatherLabel: "くもり", maxTempC: 26.0, minTempC: 17.0 }],
    },
  ],
};

describe("todayLocalISO", () => {
  it("yyyy-mm-dd でゼロ埋め", () => {
    expect(todayLocalISO(new Date(2026, 4, 5))).toBe("2026-05-05");
  });
});

describe("pickForecast", () => {
  it("地域・日付一致で取り出す", () => {
    const d = pickForecast(SAMPLE, "kanto", "2026-05-26");
    expect(d?.weatherLabel).toBe("雨");
  });
  it("日付未一致なら地域の先頭日にフォールバック", () => {
    const d = pickForecast(SAMPLE, "kanto", "2099-01-01");
    expect(d?.date).toBe("2026-05-25");
  });
  it("地域未一致なら先頭地域にフォールバック", () => {
    const d = pickForecast(SAMPLE, "unknown", "2026-05-25");
    expect(d?.weatherLabel).toBe("晴れ");
  });
  it("null/空は null", () => {
    expect(pickForecast(null, "kanto", "2026-05-25")).toBeNull();
    expect(pickForecast({ regions: [] }, "kanto", "2026-05-25")).toBeNull();
  });
});

describe("toWeatherFields", () => {
  it("最高気温を四捨五入して文字列化", () => {
    expect(toWeatherFields({ date: "x", weatherLabel: "晴れ", maxTempC: 24.6, minTempC: 0 })).toEqual({
      weather: "晴れ",
      temperature: "25",
    });
  });
  it("null は null", () => {
    expect(toWeatherFields(null)).toBeNull();
  });
});

describe("WEATHER_REGIONS", () => {
  it("8地域", () => {
    expect(WEATHER_REGIONS.length).toBe(8);
    expect(WEATHER_REGIONS.map((r) => r.id)).toContain("kanto");
  });
});
