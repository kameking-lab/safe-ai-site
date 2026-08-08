import { describe, expect, it } from "vitest";
import {
  buildSignageHourlyFromPayload,
  parseOpenMeteoTargetTime,
} from "@/lib/weather/open-meteo-hourly";

describe("buildSignageHourlyFromPayload — 湿度(humidityPct)", () => {
  const now = new Date("2026-07-03T09:00:00+09:00");

  it("relative_humidity_2m を humidityPct として各コマに反映する", () => {
    const payload = {
      timezone: "Asia/Tokyo",
      utc_offset_seconds: 32400,
      hourly: {
        time: ["2026-07-03T09:00", "2026-07-03T10:00"],
        temperature_2m: [30, 31],
        precipitation: [0, 0],
        weather_code: [0, 0],
        wind_speed_10m: [5, 5],
        relative_humidity_2m: [65.4, 70],
      },
    };
    const out = buildSignageHourlyFromPayload(payload, now, 2);
    expect(out[0]!.humidityPct).toBe(65);
    expect(out[1]!.humidityPct).toBe(70);
  });

  it("relative_humidity_2m が欠測なら humidityPct は undefined（捏造しない）", () => {
    const payload = {
      timezone: "Asia/Tokyo",
      utc_offset_seconds: 32400,
      hourly: {
        time: ["2026-07-03T09:00"],
        temperature_2m: [30],
        precipitation: [0],
        weather_code: [0],
        wind_speed_10m: [5],
      },
    };
    const out = buildSignageHourlyFromPayload(payload, now, 1);
    expect(out[0]!.humidityPct).toBeUndefined();
  });
});

describe("Open-Meteo target time — JST contract", () => {
  const tokyo = { timezone: "Asia/Tokyo", utc_offset_seconds: 32400 };

  it.each([
    ["2026-07-23T00:00", "2026-07-22T15:00:00.000Z"],
    ["2026-07-23T23:59", "2026-07-23T14:59:00.000Z"],
    ["2026-12-31T23:59", "2026-12-31T14:59:00.000Z"],
    ["2027-01-01T00:00", "2026-12-31T15:00:00.000Z"],
    ["2026-08-01T12:00+09:00", "2026-08-01T03:00:00.000Z"],
  ])("%s をruntime TZに依存せず解釈する", (value, expected) => {
    expect(parseOpenMeteoTargetTime(value, tokyo)?.toISOString()).toBe(expected);
  });

  it("date-only、metadata欠落、異常offsetをfail-closedにする", () => {
    expect(parseOpenMeteoTargetTime("2026-07-23", tokyo)).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-23T09:00", {})).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-23T09:00Z", tokyo)).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-23T09:00+00:00", tokyo)).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-23T09:00+08:00", tokyo)).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-23T09:00+09:00", {})).toBeNull();
    expect(
      parseOpenMeteoTargetTime("2026-07-23T09:00", {
        timezone: "Asia/Tokyo",
        utc_offset_seconds: 0,
      })
    ).toBeNull();
  });

  it.each([
    "2026-02-30T12:00",
    "2026-13-01T00:00",
    "2026-07-23T24:00",
    "2026-07-23T23:60",
  ])("存在しない暦日・時刻をfail-closedにする: %s", (value) => {
    expect(parseOpenMeteoTargetTime(value, tokyo)).toBeNull();
  });

  it("期限超過・遠未来の対象時刻を参照時刻基準でfail-closedにする", () => {
    const referenceNow = new Date("2026-07-23T12:00:00+09:00");
    const options = {
      referenceNow,
      maxPastMs: 36 * 60 * 60 * 1_000,
      maxFutureMs: 80 * 60 * 60 * 1_000,
    };
    expect(parseOpenMeteoTargetTime("2026-07-21T00:00", tokyo, options)).toBeNull();
    expect(parseOpenMeteoTargetTime("2099-01-01T00:00", tokyo, options)).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-26T21:00", tokyo, options)).toBeNull();
    expect(parseOpenMeteoTargetTime("2026-07-23T23:59", tokyo, options)).not.toBeNull();
  });
});
