import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApiWeatherRiskService,
  createMockWeatherRiskService,
  parseWeatherRiskApiPayload,
  parseWeatherRiskPartialApiPayload,
} from "./weather-risk-service";
import { createServices } from "./service-factory";

const validPayload = {
  snapshot: {
    regionName: "東京都 新宿区",
    date: "2026-07-24",
    overview: "晴れ",
    temperatureCelsius: 31,
    windSpeedMs: 4,
    precipitationMm: 0,
    alerts: [],
  },
  provider: "open-meteo",
  fetchedAt: "2026-07-24T00:00:00.000Z",
  officialWarning: {
    status: "live",
    warnings: [],
    headline: null,
    fetchedAt: "2026-07-24T00:00:00.000Z",
    reportAt: "2026-07-24T00:00:00+09:00",
    sourceUrl: "https://www.jma.go.jp/bosai/warning/",
  },
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("weather risk safety boundary", () => {
  it("productionでは未設定・明示mockのどちらもliveへfail-closedする", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_WEATHER_API_MODE", "mock");

    expect(createServices().mode).toBe("live");
    expect(createServices("mock").mode).toBe("live");
  });

  it("開発用mockはsyntheticかつ公式警報未確認と明示する", async () => {
    const result = await createMockWeatherRiskService().getTodaySiteRisk();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dataOrigin).toBe("synthetic");
      expect(result.data.officialWarning?.status).toBe("unavailable");
    }
  });

  it("公式警報フィールドがない200応答を低リスクへ変換しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...validPayload,
          officialWarning: undefined,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const service = createApiWeatherRiskService(
      fetchMock as unknown as typeof fetch,
    );

    const result = await service.getTodaySiteRisk();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAVAILABLE");
  });

  it.each([
    null,
    {},
    { ...validPayload, fetchedAt: "invalid" },
    {
      ...validPayload,
      snapshot: { ...validPayload.snapshot, windSpeedMs: -1 },
    },
    {
      ...validPayload,
      officialWarning: { ...validPayload.officialWarning, status: "none" },
    },
  ])("異常JSONを拒否する: %#", (payload) => {
    expect(parseWeatherRiskApiPayload(payload)).toBeNull();
  });

  it("公式警報状態を含む検証済み応答だけを受理する", () => {
    expect(parseWeatherRiskApiPayload(validPayload)).toEqual(validPayload);
  });

  it("本日の予想最高気温35.1℃を低リスク表示にしない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...validPayload,
          snapshot: {
            ...validPayload.snapshot,
            temperatureCelsius: 35.1,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const service = createApiWeatherRiskService(
      fetchMock as unknown as typeof fetch,
    );

    const result = await service.getTodaySiteRisk();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.riskLevel).toBe("高");
      expect(result.data.riskEvidences.join(" ")).toContain(
        "本日の予想最高気温35.1℃",
      );
      expect(result.data.recommendedActions.join(" ")).not.toContain(
        "30分ごと",
      );
    }
  });

  it("Open-Meteo失敗のpartial応答から検証済みJMA警報を保持する", async () => {
    const partial = {
      partial: true,
      fetchedAt: "2026-07-26T03:00:00.000Z",
      unavailableSources: ["open-meteo"],
      officialWarning: {
        ...validPayload.officialWarning,
        warnings: [{ code: "03", status: "発表", level: "warning" }],
      },
      error: {
        code: "UNAVAILABLE",
        message: "Open-Meteo unavailable",
        retryable: true,
      },
    };
    expect(parseWeatherRiskPartialApiPayload(partial)).toEqual(partial);

    const service = createApiWeatherRiskService(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(partial), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ) as unknown as typeof fetch,
    );
    const result = await service.getTodaySiteRisk();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.officialWarning?.warnings).toEqual([
        { code: "03", status: "発表", level: "warning" },
      ]);
      expect(result.error.code).toBe("UNAVAILABLE");
    }
  });
});
