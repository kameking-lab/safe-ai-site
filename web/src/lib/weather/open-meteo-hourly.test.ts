import { describe, expect, it } from "vitest";
import { buildSignageHourlyFromPayload } from "@/lib/weather/open-meteo-hourly";

describe("buildSignageHourlyFromPayload — 湿度(humidityPct)", () => {
  const now = new Date("2026-07-03T09:00:00+09:00");

  it("relative_humidity_2m を humidityPct として各コマに反映する", () => {
    const payload = {
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
