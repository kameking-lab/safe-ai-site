import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteRiskWeather } from "@/lib/types/domain";
import {
  HomeHeatRiskStatus,
  isHomeHeatWeatherStale,
} from "./home-heat-risk-status";

const mockState = vi.hoisted(() => ({
  result: null as unknown,
}));

vi.mock("@/lib/services/weather-risk-service", () => ({
  createApiWeatherRiskService: () => ({
    getTodaySiteRisk: vi.fn(async () => mockState.result),
  }),
}));

function todayJst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function liveData(fetchedAt = new Date().toISOString()): SiteRiskWeather {
  return {
    regionName: "東京都 新宿区",
    date: todayJst(),
    overview: "晴れ",
    temperatureCelsius: 34,
    windSpeedMs: 2,
    precipitationMm: 0,
    alerts: [],
    riskLevel: "高",
    primaryCautions: ["気温上昇"],
    riskEvidences: ["気温予報"],
    recommendedActions: ["現場実測"],
    dataOrigin: "live",
    forecastProvider: "open-meteo",
    forecastFetchedAt: fetchedAt,
    officialWarning: {
      status: "live",
      warnings: [],
      headline: null,
      fetchedAt,
      reportAt: fetchedAt,
      sourceUrl: "https://www.jma.go.jp/bosai/warning/",
    },
  };
}

describe("HomeHeatRiskStatus", () => {
  beforeEach(() => {
    mockState.result = { ok: true, data: liveData() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("正常取得でもWBGT未確認として要現場確認を維持する", async () => {
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await waitFor(() => {
      expect(screen.getByText("WBGT未確認・要現場確認")).toBeTruthy();
    });
    expect(screen.getByText("発表なし（取得済み）")).toBeTruthy();
    expect(screen.getByText(/気温予報：34℃/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("熱中症リスク：安全");
  });

  it("staleを判定保留にし、警報なしを表示しない", async () => {
    mockState.result = {
      ok: true,
      data: liveData(new Date(Date.now() - 60 * 60 * 1000).toISOString()),
    };
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await waitFor(() => {
      expect(screen.getByText("確認不能・判定保留")).toBeTruthy();
    });
    expect(screen.getByText("データが古いため確認不能")).toBeTruthy();
    expect(document.body.textContent).not.toContain("発表なし（取得済み）");
  });

  it("取得失敗を安全扱いせず、再取得操作を残す", async () => {
    mockState.result = {
      ok: false,
      error: { code: "NETWORK", message: "取得不能", retryable: true },
    };
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await waitFor(() => {
      expect(screen.getByText("確認不能・判定保留")).toBeTruthy();
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "取得できません。公式情報と現場の測定値を確認してください。",
    );
    expect(screen.getByRole("button", { name: "データを再取得" })).toBeTruthy();
  });

  it("予報を取得できてもJMAが取得不能なら全体を判定保留にする", async () => {
    const data = liveData();
    data.officialWarning = {
      status: "unavailable",
      warnings: [],
      headline: null,
      fetchedAt: null,
      reportAt: null,
      sourceUrl: "https://www.jma.go.jp/bosai/warning/",
    };
    mockState.result = { ok: true, data };
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await waitFor(() => {
      expect(screen.getByText("確認不能・判定保留")).toBeTruthy();
    });
    expect(screen.getByText("取得不能・要公式確認")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "取得できません。公式情報と現場の測定値を確認してください。",
    );
    expect(document.body.textContent).not.toContain("発表なし（取得済み）");
  });

  it("初回freshでも15分経過後は操作なしでstaleへ遷移する", async () => {
    vi.useFakeTimers();
    const fetchedAt = new Date("2026-07-29T03:00:00.000Z");
    vi.setSystemTime(fetchedAt);
    mockState.result = {
      ok: true,
      data: liveData(fetchedAt.toISOString()),
    };
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("WBGT未確認・要現場確認")).toBeTruthy();
    expect(screen.getByText("発表なし（取得済み）")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16 * 60 * 1000);
    });
    expect(screen.getByText("確認不能・判定保留")).toBeTruthy();
    expect(screen.getByText("データが古いため確認不能")).toBeTruthy();
    expect(document.body.textContent).not.toContain("発表なし（取得済み）");
  });

  it("予報失敗でも取得済みのlive JMA警報を古いデータへ上書きしない", async () => {
    const fetchedAt = new Date().toISOString();
    mockState.result = {
      ok: false,
      error: { code: "NETWORK", message: "予報取得不能", retryable: true },
      officialWarning: {
        status: "live",
        warnings: [
          {
            code: "03",
            status: "発表",
            level: "warning",
          },
        ],
        headline: "大雨警報",
        fetchedAt,
        reportAt: fetchedAt,
        sourceUrl: "https://www.jma.go.jp/bosai/warning/",
      },
    };
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await waitFor(() => {
      expect(screen.getByText("確認不能・判定保留")).toBeTruthy();
    });
    expect(screen.getByText("警報の発表あり")).toBeTruthy();
    expect(document.body.textContent).not.toContain(
      "データが古いため確認不能",
    );
  });

  it("予報失敗時のpartial JMA発表なしも15分後はstaleへ遷移する", async () => {
    vi.useFakeTimers();
    const fetchedAt = new Date("2026-07-29T03:00:00.000Z");
    vi.setSystemTime(fetchedAt);
    mockState.result = {
      ok: false,
      error: { code: "NETWORK", message: "予報取得不能", retryable: true },
      officialWarning: {
        status: "live",
        warnings: [],
        headline: null,
        fetchedAt: fetchedAt.toISOString(),
        reportAt: fetchedAt.toISOString(),
        sourceUrl: "https://www.jma.go.jp/bosai/warning/",
      },
    };
    render(<HomeHeatRiskStatus todayJstLabel="今日" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("発表なし（取得済み）")).toBeTruthy();
    expect(screen.getByText("確認不能・判定保留")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16 * 60 * 1000);
    });
    expect(screen.getByText("データが古いため確認不能")).toBeTruthy();
    expect(document.body.textContent).not.toContain("発表なし（取得済み）");
  });
});

describe("isHomeHeatWeatherStale", () => {
  it("synthetic、古い時刻、異なるJST日付をstaleにする", () => {
    const now = Date.now();
    expect(
      isHomeHeatWeatherStale(
        { ...liveData(), dataOrigin: "synthetic" },
        now,
      ),
    ).toBe(true);
    expect(
      isHomeHeatWeatherStale(
        liveData(new Date(now - 16 * 60 * 1000).toISOString()),
        now,
      ),
    ).toBe(true);
    expect(
      isHomeHeatWeatherStale({ ...liveData(), date: "2000-01-01" }, now),
    ).toBe(true);
  });
});
