import { describe, expect, it } from "vitest";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import type { WeatherRiskApiResponse } from "@/lib/types/api";
import {
  combineKyWeatherPayloads,
  fetchKyWeatherPrefill,
  overrideKyWeatherField,
} from "./weather-prefill-v2";

const NOW = new Date("2026-08-01T00:05:00.000Z");

function weatherPayload(
  overrides: Partial<WeatherRiskApiResponse> = {},
): WeatherRiskApiResponse {
  return {
    provider: "open-meteo",
    fetchedAt: "2026-08-01T00:04:00.000Z",
    snapshot: {
      regionName: "東京都 新宿区",
      date: "2026-08-01",
      overview: "雨",
      temperatureCelsius: 34,
      windSpeedMs: 11,
      precipitationMm: 8,
      alerts: [],
    },
    current: {
      temperatureCelsius: 31.2,
      relativeHumidityPercent: 72,
      targetAt: "2026-08-01T09:00:00+09:00",
    },
    officialWarning: {
      status: "live",
      warnings: [
        { code: "14", status: "発表", level: "advisory" },
      ],
      headline: "雷注意報",
      fetchedAt: "2026-08-01T00:04:00.000Z",
      reportAt: "2026-08-01T00:00:00.000Z",
      sourceUrl: "https://www.jma.go.jp/bosai/warning/",
    },
    ...overrides,
  };
}

function wbgtPayload(
  overrides: Partial<EnvironmentWbgtStatus> = {},
): EnvironmentWbgtStatus {
  return {
    areaId: "tokyo-shinjuku",
    areaLabel: "東京都 新宿区",
    prefectureIso: "JP-13",
    scopeLabel: "東京都内提供地点",
    provider: "環境省 熱中症予防情報サイト",
    sourceUrl: "https://www.wbgt.env.go.jp/",
    dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
    retrievedAt: "2026-08-01T00:04:00.000Z",
    degraded: false,
    wbgt: {
      status: "estimated",
      mode: "official-estimated-current",
      valueCelsius: 29.1,
      label: "推定値",
      targetAt: "2026-08-01T09:00:00+09:00",
      createdAt: "2026-08-01T00:00:00.000Z",
      stale: false,
      stationCount: 2,
      expectedStationCount: 2,
    },
    alerts: {
      heatAlert: "active",
      specialHeatAlert: "inactive",
      targetDate: "2026-08-01",
      reportAt: "2026-08-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("KY weather prefill", () => {
  it("combines temperature, humidity, WBGT, JMA warnings and provenance", () => {
    const snapshot = combineKyWeatherPayloads({
      areaId: "tokyo-shinjuku",
      weather: weatherPayload(),
      wbgt: wbgtPayload(),
      now: NOW,
    });
    expect(snapshot).toMatchObject({
      areaId: "tokyo-shinjuku",
      temperatureCelsius: 31.2,
      relativeHumidityPercent: 72,
      wbgtCelsius: 29.1,
      wbgtKind: "estimated",
      warningStatus: "live",
      availability: "estimated",
      stale: false,
      degraded: false,
    });
    expect(snapshot?.providers).toEqual([
      "Open-Meteo（気象グリッド推定）",
      "環境省 熱中症予防情報サイト",
      "気象庁 防災情報",
    ]);
    expect(snapshot?.warnings[0]).toMatchObject({
      code: "14",
      status: "発表",
      name: "雷注意報",
    });
  });

  it("preserves partial weather instead of converting missing WBGT to low risk", () => {
    const snapshot = combineKyWeatherPayloads({
      areaId: "tokyo-shinjuku",
      weather: weatherPayload(),
      wbgt: null,
      now: NOW,
    });
    expect(snapshot?.availability).toBe("degraded");
    expect(snapshot?.wbgtCelsius).toBeNull();
    expect(snapshot?.wbgtKind).toBe("unavailable");
    expect(snapshot?.degraded).toBe(true);
  });

  it("preserves official warning when Open-Meteo is unavailable", () => {
    const partial = weatherPayload();
    const snapshot = combineKyWeatherPayloads({
      areaId: "tokyo-shinjuku",
      weather: {
        partial: true,
        fetchedAt: partial.fetchedAt,
        unavailableSources: ["open-meteo"],
        officialWarning: partial.officialWarning,
        error: { code: "UNAVAILABLE", message: "unavailable", retryable: true },
      },
      wbgt: null,
      now: NOW,
    });
    expect(snapshot?.warningStatus).toBe("live");
    expect(snapshot?.warnings).toHaveLength(1);
    expect(snapshot?.weather).toBeNull();
    expect(snapshot?.availability).toBe("degraded");
  });

  it("marks old data stale with timestamps intact", () => {
    const snapshot = combineKyWeatherPayloads({
      areaId: "tokyo-shinjuku",
      weather: weatherPayload({ fetchedAt: "2026-07-31T18:00:00.000Z" }),
      wbgt: wbgtPayload({
        wbgt: { ...wbgtPayload().wbgt, stale: true },
      }),
      now: NOW,
    });
    expect(snapshot?.availability).toBe("stale");
    expect(snapshot?.stale).toBe(true);
    expect(snapshot?.fetchedAt).toBe("2026-07-31T18:00:00.000Z");
  });

  it("marks every manual override and does not call it measured", () => {
    const base = combineKyWeatherPayloads({
      areaId: "tokyo-shinjuku",
      weather: weatherPayload(),
      wbgt: wbgtPayload(),
      now: NOW,
    });
    expect(base).not.toBeNull();
    const changed = overrideKyWeatherField(
      overrideKyWeatherField(base!, "temperature", "32.5"),
      "wbgt",
      "30.2",
    );
    expect(changed.temperatureCelsius).toBe(32.5);
    expect(changed.wbgtCelsius).toBe(30.2);
    expect(changed.manuallyEditedFields).toEqual(["temperature", "wbgt"]);
    expect(changed.wbgtKind).toBe("estimated");
  });

  it("rejects a non-allowlisted area", () => {
    expect(
      combineKyWeatherPayloads({
        areaId: "raw-user-location",
        weather: weatherPayload(),
        wbgt: null,
        now: NOW,
      }),
    ).toBeNull();
  });

  it("uses a dated weather forecast but never reuses current WBGT for future work", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      return new Response(JSON.stringify(weatherPayload({ current: undefined })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const result = await fetchKyWeatherPrefill({
        areaId: "tokyo-shinjuku",
        workDate: "2026-08-02",
        now: NOW,
      });
      expect(calls).toEqual([
        "/api/weather-risk?area=tokyo-shinjuku&date=2026-08-02",
      ]);
      expect(result.snapshot?.wbgtCelsius).toBeNull();
      expect(result.snapshot?.wbgtKind).toBe("unavailable");
      expect(result.snapshot?.availability).toBe("degraded");
      expect(result.snapshot?.targetAt).toBeNull();
      expect(result.snapshot?.targetDate).toBe("2026-08-01");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not substitute current conditions outside the forecast range", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("{}", { status: 500 });
    }) as typeof fetch;
    try {
      const result = await fetchKyWeatherPrefill({
        areaId: "tokyo-shinjuku",
        workDate: "2026-08-08",
        now: NOW,
      });
      expect(result).toEqual({
        ok: false,
        reason: "forecast-out-of-range",
        snapshot: null,
      });
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
