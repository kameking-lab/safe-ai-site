import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildWeatherEvidenceRecord,
  buildRiskKyWeatherSnapshot,
  isRiskKyWeatherHandoffReady,
  isWeatherRiskStale,
  riskUrlWithArea,
  shouldShowRiskKyHandoff,
  shouldShowRiskResultActions,
  WbgtMeasurementStatus,
} from "./today-safety-panel";
import type { SiteRiskWeather } from "@/lib/types/domain";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";

const NOW = Date.parse("2026-07-24T03:00:00.000Z");

function liveData(
  forecastFetchedAt: string | null,
  officialFetchedAt: string | null,
): SiteRiskWeather {
  return {
    regionName: "東京都 新宿区",
    date: "2026-07-24",
    overview: "晴れ",
    temperatureCelsius: 30,
    windSpeedMs: 2,
    precipitationMm: 0,
    alerts: [],
    riskLevel: "低",
    primaryCautions: [],
    riskEvidences: [],
    recommendedActions: [],
    dataOrigin: "live",
    forecastProvider: "open-meteo",
    forecastFetchedAt,
    officialWarning: {
      status: "live",
      warnings: [],
      headline: null,
      fetchedAt: officialFetchedAt,
      reportAt: officialFetchedAt,
      sourceUrl: "https://www.jma.go.jp/bosai/warning/",
    },
  };
}

describe("today safety freshness boundary", () => {
  it("予報と公式警報が15分以内ならfresh", () => {
    const value = liveData(
      "2026-07-24T02:50:00.000Z",
      "2026-07-24T02:50:00.000Z",
    );
    expect(isWeatherRiskStale(value, NOW)).toBe(false);
  });

  it("古い予報・古い公式警報・欠損・syntheticをstaleとして保留", () => {
    expect(
      isWeatherRiskStale(
        liveData(
          "2026-07-24T02:44:59.000Z",
          "2026-07-24T02:50:00.000Z",
        ),
        NOW,
      ),
    ).toBe(true);
    expect(
      isWeatherRiskStale(
        liveData(
          "2026-07-24T02:50:00.000Z",
          "2026-07-24T02:44:59.000Z",
        ),
        NOW,
      ),
    ).toBe(true);
    expect(isWeatherRiskStale(liveData(null, null), NOW)).toBe(true);
    expect(
      isWeatherRiskStale(
        { ...liveData(null, null), dataOrigin: "synthetic" },
        NOW,
      ),
    ).toBe(true);
  });

  it("5分を超える未来時刻を時計ずれとして保留", () => {
    expect(
      isWeatherRiskStale(
        liveData(
          "2026-07-24T03:05:01.000Z",
          "2026-07-24T02:55:00.000Z",
        ),
        NOW,
      ),
    ).toBe(true);
  });

  it("PF-017: 取得時刻が新しくても古い日・未来日・異常日付の予報は保留", () => {
    const fetchedAt = "2026-07-24T02:55:00.000Z";
    for (const date of ["2026-07-23", "2026-07-25", "2026-02-30", "invalid"]) {
      expect(
        isWeatherRiskStale(
          {
            ...liveData(fetchedAt, fetchedAt),
            date,
          },
          NOW,
        ),
        date,
      ).toBe(true);
    }
  });
});

describe("today safety back-state URL", () => {
  it("keeps only the canonical coarse area and preserves unrelated safe query state", () => {
    expect(
      riskUrlWithArea(
        "https://www.anzen-ai-portal.jp/risk?view=morning#today-safety",
        "osaka-osaka",
      ),
    ).toBe("/risk?view=morning&area=osaka-osaka#today-safety");
  });
});

describe("today safety result-first disclosure", () => {
  it("地域未選択・取得中・取得失敗ではWBGTとKY操作を先出ししない", () => {
    const data = liveData(
      "2026-07-24T02:50:00.000Z",
      "2026-07-24T02:50:00.000Z",
    );
    expect(shouldShowRiskResultActions(null, "idle", null)).toBe(false);
    expect(
      shouldShowRiskResultActions("tokyo-shinjuku", "loading", null),
    ).toBe(false);
    expect(
      shouldShowRiskResultActions("tokyo-shinjuku", "error", null),
    ).toBe(false);
    expect(
      shouldShowRiskResultActions("tokyo-shinjuku", "success", data),
    ).toBe(true);
    expect(
      shouldShowRiskKyHandoff("tokyo-shinjuku", "success", data, false),
    ).toBe(true);
    expect(
      shouldShowRiskKyHandoff("tokyo-shinjuku", "success", data, true),
    ).toBe(false);
  });
});

describe("today safety WBGT fail-closed state", () => {
  it("気温予報をWBGTに変換せず、実測・推定が未確認と常時表示する", () => {
    render(<WbgtMeasurementStatus />);

    expect(
      screen.getByRole("heading", {
        name: "WBGTは実測・推定とも未確認",
      }),
    ).not.toBeNull();
    expect(screen.getByText("公式情報と現場の測定値を確認してください。")).not.toBeNull();
    expect(screen.queryByText(/データ状態: 未取得/)).toBeNull();
    expect(screen.queryByText(/判断保留/)).toBeNull();
    expect(
      screen
        .getByRole("link", {
          name: /環境省 熱中症予防情報サイト/,
        })
        .getAttribute("href"),
    ).toBe("https://www.wbgt.env.go.jp/");
    expect(screen.queryByText(/WBGT参考計算を開く/)).toBeNull();
  });
});

describe("today safety shared evidence", () => {
  it("JMAを一次資料、Open-Meteoを補助予報として分離する", () => {
    const evidence = buildWeatherEvidenceRecord({
      data: liveData(
        "2026-07-24T02:50:00.000Z",
        "2026-07-24T02:50:00.000Z",
      ),
      status: "success",
      stale: false,
      regionName: "東京都 新宿区",
    });

    expect(evidence.informationKind).toBe("estimate");
    expect(evidence.primarySources[0]).toMatchObject({
      registryId: "jma-warning",
      publisher: "気象庁",
    });
    expect(evidence.secondarySources[0]).toMatchObject({
      registryId: "open-meteo",
      publisher: "Open-Meteo",
    });
    expect(evidence.aiGenerated).toBe(false);
    expect(evidence.humanReviewRequired).toBe(true);
    expect(evidence.verification).toBe("sourceLocated");
    expect(evidence.freshness).toBe("current");
    expect(evidence.exclusions.join(" ")).toContain("WBGT");
  });

  it("取得失敗を警報なしにせず、unavailableかつ未検証にする", () => {
    const evidence = buildWeatherEvidenceRecord({
      data: null,
      status: "error",
      stale: false,
      regionName: "東京都 新宿区",
    });

    expect(evidence.freshness).toBe("unavailable");
    expect(evidence.verification).toBe("unverified");
    expect(evidence.retrievedAt).toBeNull();
  });
});

describe("today safety to KY weather handoff", () => {
  it("passes the displayed coarse area, temperature, humidity, WBGT and timestamps", () => {
    const data: SiteRiskWeather = {
      ...liveData(
        "2026-07-24T02:50:00.000Z",
        "2026-07-24T02:50:00.000Z",
      ),
      currentTemperatureCelsius: 31.2,
      relativeHumidityPercent: 71,
      weatherTargetAt: "2026-07-24T02:45:00.000Z",
      officialWarning: {
        ...liveData(null, null).officialWarning!,
        warnings: [{ code: "14", status: "発表", level: "advisory" }],
      },
    };
    const wbgt: EnvironmentWbgtStatus = {
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      prefectureIso: "JP-13",
      scopeLabel: "東京都内提供地点",
      wbgt: {
        status: "estimated",
        mode: "official-estimated-current",
        valueCelsius: 29.1,
        targetAt: "2026-07-24T02:40:00.000Z",
        createdAt: "2026-07-24T02:40:00.000Z",
        stationCount: 2,
        expectedStationCount: 2,
        stale: false,
        label: "推定値",
      },
      alerts: {
        heatAlert: "active",
        specialHeatAlert: "inactive",
        targetDate: "2026-07-24",
        reportAt: "2026-07-24T02:30:00.000Z",
      },
      retrievedAt: "2026-07-24T02:50:00.000Z",
      degraded: false,
      provider: "環境省 熱中症予防情報サイト",
      sourceUrl: "https://www.wbgt.env.go.jp/",
      dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
    };
    const snapshot = buildRiskKyWeatherSnapshot({
      areaId: "tokyo-shinjuku",
      data,
      wbgt,
      stale: false,
    });
    expect(snapshot).toMatchObject({
      areaId: "tokyo-shinjuku",
      temperatureCelsius: 31.2,
      relativeHumidityPercent: 71,
      wbgtCelsius: 29.1,
      wbgtKind: "estimated",
      wbgtRetrievedAt: "2026-07-24T02:50:00.000Z",
      availability: "estimated",
    });
    expect(snapshot?.warnings[0]?.name).toBe("雷注意報");
    expect(isRiskKyWeatherHandoffReady(snapshot)).toBe(true);
  });

  it("does not pass synthetic or unresolved weather as a live snapshot", () => {
    expect(
      buildRiskKyWeatherSnapshot({
        areaId: "tokyo-shinjuku",
        data: { ...liveData(null, null), dataOrigin: "synthetic" },
        wbgt: null,
        stale: true,
      }),
    ).toBeNull();
  });

  it("keeps the KY handoff hidden when warning or WBGT state is unresolved", () => {
    const degraded = buildRiskKyWeatherSnapshot({
      areaId: "tokyo-shinjuku",
      data: {
        ...liveData(
          "2026-07-24T02:50:00.000Z",
          "2026-07-24T02:50:00.000Z",
        ),
        officialWarning: {
          ...liveData(null, null).officialWarning!,
          status: "degraded",
        },
      },
      wbgt: null,
      stale: false,
    });

    expect(degraded?.availability).toBe("degraded");
    expect(isRiskKyWeatherHandoffReady(degraded)).toBe(false);
    expect(isRiskKyWeatherHandoffReady(null)).toBe(false);
  });
});
