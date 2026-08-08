import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jma/fetch-jma-runtime", () => ({
  getJmaWarningsRuntime: vi.fn(),
}));
vi.mock("@/lib/external/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
  TimeoutError: class TimeoutError extends Error {},
}));
vi.mock("@/lib/external/circuit-breaker", () => ({
  withCircuitBreaker: async (
    _key: string,
    operation: () => Promise<unknown>,
  ) => operation(),
  CircuitOpenError: class CircuitOpenError extends Error {},
}));
import {
  GET,
} from "./route";
import { resolveForecastTargetDate } from "@/lib/weather/forecast-target-date";
import {
  buildOpenMeteoRiskSignals,
  isOpenMeteoCurrentFresh,
  toOpenMeteoSnapshot,
} from "@/lib/weather/open-meteo-risk";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";

const mockJmaWarnings = vi.mocked(getJmaWarningsRuntime);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

beforeEach(() => {
  mockJmaWarnings.mockReset();
  mockFetchWithTimeout.mockReset();
});

describe("weather-risk Open-Meteo contract", () => {
  const valid = {
    timezone: "Asia/Tokyo",
    utc_offset_seconds: 32400,
    daily: {
      time: ["2026-07-23"],
      weather_code: [1],
      temperature_2m_max: [31.24],
      wind_speed_10m_max: [18],
      precipitation_sum: [0.04],
    },
  };

  it("keeps target date and units explicit without fabricating zero values", () => {
    expect(toOpenMeteoSnapshot("東京都 東京", valid)).toEqual({
      regionName: "東京都 東京",
      date: "2026-07-23",
      overview: "晴れ",
      temperatureCelsius: 31.2,
      windSpeedMs: 5,
      precipitationMm: 0,
      alerts: [],
    });
  });

  it("does not expose stale or future Open-Meteo current conditions", () => {
    const now = Date.parse("2026-07-31T03:40:00.000Z");
    const current = {
      temperatureCelsius: 31.5,
      relativeHumidityPercent: 62,
      targetAt: "2026-07-31T03:30:00.000Z",
    };
    expect(isOpenMeteoCurrentFresh(current, now)).toBe(true);
    expect(
      isOpenMeteoCurrentFresh(
        { ...current, targetAt: "2026-07-31T01:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isOpenMeteoCurrentFresh(
        { ...current, targetAt: "2026-07-31T04:00:01.000Z" },
        now,
      ),
    ).toBe(false);
  });

  it("allows only today through six days ahead and rejects past/out-of-range dates", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(resolveForecastTargetDate("2026-08-01", now)).toEqual({
      date: "2026-08-01",
      daysAhead: 0,
    });
    expect(resolveForecastTargetDate("2026-08-07", now)?.daysAhead).toBe(6);
    expect(resolveForecastTargetDate("2026-07-31", now)).toBeNull();
    expect(resolveForecastTargetDate("2026-08-08", now)).toBeNull();
    expect(resolveForecastTargetDate("中央区", now)).toBeNull();
  });

  it.each([
    { daily: {} },
    { daily: { ...valid.daily, time: [] } },
    { daily: { ...valid.daily, weather_code: [] } },
    { daily: { ...valid.daily, wind_speed_10m_max: [-1] } },
    { daily: { ...valid.daily, precipitation_sum: [Number.NaN] } },
    { daily: { ...valid.daily, time: ["2026/07/23"] } },
  ])("fails closed for missing or invalid provider fields: %#", (payload) => {
    expect(toOpenMeteoSnapshot("東京都 東京", payload)).toBeNull();
  });

  it("labels derived thresholds as independent guidance, not JMA alerts", () => {
    const signals = buildOpenMeteoRiskSignals(25, 16, 95);
    expect(signals).toHaveLength(2);
    expect(signals.every((item) => item.type.startsWith("独自目安:"))).toBe(true);
    expect(signals.some((item) => /警報相当|注意報相当/.test(item.type))).toBe(false);
    expect(signals.some((item) => item.type.includes("予想降水量合計"))).toBe(true);
    expect(signals.some((item) => item.type.includes("強い雨"))).toBe(false);
  });

  it("returns the verified JMA warning when Open-Meteo alone fails", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("synthetic Open-Meteo outage"));
    mockJmaWarnings.mockResolvedValue({
      fetchedAt: "2026-07-13T00:00:00.000Z",
      quality: { status: "degraded", attempted: 47, succeeded: 46, failed: 1 },
      byIso: {
        "JP-13": {
          level: "warning",
          sourceStatus: "live",
          sourceFetchedAt: new Date().toISOString(),
          entries: [
            {
              sourceCode: "130000",
              level: "warning",
              headline: "東京都に大雨警報",
              reportDatetime: new Date().toISOString(),
              publishingOffice: "気象庁",
              warnings: [
                {
                  areaCode: "1310400",
                  code: "03",
                  status: "発表",
                  level: "warning",
                },
              ],
            },
          ],
        },
      },
    });

    const response = await GET(
      new NextRequest(
        "https://example.test/api/weather-risk?area=tokyo-shinjuku",
      ),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      partial: true,
      unavailableSources: ["open-meteo"],
      officialWarning: {
        status: "live",
        warnings: [{ code: "03", status: "発表", level: "warning" }],
      },
    });
    expect(body.snapshot).toBeUndefined();
  });

  it.each(["警報から注意報", "危険警報から注意報"])(
    "%s は発表中の注意報として保持し、警報レベルへ戻さない",
    async (status) => {
      mockFetchWithTimeout.mockRejectedValue(
        new Error("synthetic Open-Meteo outage"),
      );
      const now = new Date().toISOString();
      mockJmaWarnings.mockResolvedValue({
        fetchedAt: now,
        quality: { status: "live", attempted: 47, succeeded: 47, failed: 0 },
        byIso: {
          "JP-13": {
            level: "warning",
            sourceStatus: "live",
            sourceFetchedAt: now,
            entries: [
              {
                sourceCode: "130000",
                level: "warning",
                headline: "東京都の警報を注意報へ切替",
                reportDatetime: now,
                publishingOffice: "気象庁",
                warnings: [
                  {
                    areaCode: "1310400",
                    code: "03",
                    status,
                    level: "warning",
                  },
                ],
              },
            ],
          },
        },
      });

      const response = await GET(
        new NextRequest(
          "https://example.test/api/weather-risk?area=tokyo-shinjuku",
        ),
      );
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.officialWarning).toMatchObject({
        status: "live",
        warnings: [{ code: "03", status, level: "advisory" }],
      });
      expect(body.officialWarning.warnings).not.toHaveLength(0);
      expect(body.officialWarning.warnings[0]?.level).not.toBe("warning");
    },
  );

  it("requires an allowlisted canonical area ID and never defaults to Tokyo", async () => {
    for (const url of [
      "https://example.test/api/weather-risk",
      "https://example.test/api/weather-risk?regionName=東京都%20新宿区",
      "https://example.test/api/weather-risk?area=35.69%2C139.70",
    ]) {
      const response = await GET(new NextRequest(url));
      expect(response.status).toBe(400);
    }
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });
});
