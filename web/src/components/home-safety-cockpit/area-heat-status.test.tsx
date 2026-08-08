import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AreaHeatStatus } from "./area-heat-status";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function weatherPayload() {
  const now = new Date().toISOString();
  return {
    snapshot: {
      regionName: "東京都 新宿区",
      date: "2026-07-31",
      overview: "晴れ",
      temperatureCelsius: 34,
      windSpeedMs: 2,
      precipitationMm: 0,
      alerts: [],
    },
    provider: "open-meteo",
    fetchedAt: now,
    officialWarning: {
      status: "live",
      warnings: [],
      headline: null,
      fetchedAt: now,
      reportAt: now,
      sourceUrl: "https://www.jma.go.jp/bosai/warning/",
    },
    current: {
      temperatureCelsius: 32.1,
      relativeHumidityPercent: 62,
      targetAt: now,
    },
  };
}

function wbgtPayload({
  stale = false,
  heatAlert = "active",
}: {
  stale?: boolean;
  heatAlert?: "active" | "inactive" | "unavailable";
} = {}) {
  const now = new Date().toISOString();
  return {
    areaId: "tokyo-shinjuku",
    areaLabel: "東京都 新宿区",
    prefectureIso: "JP-13",
    scopeLabel:
      "東京都内の提供地点最大。作業地点のJIS適合計による実測ではありません。",
    wbgt: {
      status: "estimated",
      mode: "official-estimated-current",
      valueCelsius: 31.4,
      targetAt: now,
      createdAt: null,
      stationCount: 11,
      expectedStationCount: 11,
      stale,
      label: "公式提供・実況推定（都道府県内最大）",
    },
    alerts: {
      heatAlert,
      specialHeatAlert: heatAlert === "unavailable" ? "unavailable" : "inactive",
      targetDate: "2026-07-31",
      reportAt: now,
    },
    retrievedAt: now,
    degraded: stale || heatAlert === "unavailable",
    provider: "環境省 熱中症予防情報サイト",
    sourceUrl: "https://www.wbgt.env.go.jp/",
    dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AreaHeatStatus", () => {
  it("shows official alert, official estimated WBGT, and separate Open-Meteo values", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const payload = String(input).startsWith("/api/wbgt")
        ? wbgtPayload()
        : weatherPayload();
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <AreaHeatStatus areaId="tokyo-shinjuku" compact headingLevel={2} />,
    );

    await screen.findByText("31.4℃");
    expect(screen.getByText("公式提供・実況推定（都道府県内最大）")).toBeTruthy();
    expect(screen.getByText(/実測: 未確認 ／ 推定: 表示中/)).toBeTruthy();
    expect(screen.getByText("32.1℃")).toBeTruthy();
    expect(screen.getByText("62%")).toBeTruthy();
    expect(screen.getByText("発表中")).toBeTruthy();
    expect(container.querySelector("[data-wbgt-kind]")?.getAttribute(
      "data-wbgt-kind",
    )).toBe("estimated");
    const heatPanel = container.querySelector("[data-heat-status]");
    expect(heatPanel?.classList.contains("h-full")).toBe(false);
    expect(heatPanel?.classList.contains("lg:h-full")).toBe(true);
    expect(
      container.querySelector("#area-heat-status-tokyo-shinjuku")?.tagName,
    ).toBe("H2");
    expect(
      container.querySelector("#heat-actions-tokyo-shinjuku")?.tagName,
    ).toBe("H3");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not present a stale WBGT as a current or low-risk value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify(
            String(input).startsWith("/api/wbgt")
              ? wbgtPayload({ stale: true })
              : weatherPayload(),
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(<AreaHeatStatus areaId="tokyo-shinjuku" compact />);

    await screen.findByText("情報が古いため現在値に使いません");
    expect(screen.getByText("情報が古いため、公式情報を確認してください。")).toBeTruthy();
    expect(screen.queryByText("31.4℃")).toBeNull();
    expect(screen.getByText("未確認")).toBeTruthy();
    expect(screen.queryByText(/stale/)).toBeNull();
    expect(screen.queryByText(/安全です|低リスクです|基準値内です/)).toBeNull();
    expect(screen.queryByRole("link", { name: "この暑さでKYを作る" })).toBeNull();
  });

  it("keeps the official WBGT when JMA/Open-Meteo fails and marks the panel degraded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith("/api/weather-risk")) {
          return new Response(JSON.stringify({ ok: false }), { status: 503 });
        }
        return new Response(JSON.stringify(wbgtPayload()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const { container } = render(
      <AreaHeatStatus areaId="tokyo-shinjuku" compact />,
    );

    await screen.findByText("31.4℃");
    await waitFor(() =>
      expect(
        container.querySelector("[data-heat-status]")?.getAttribute(
          "data-heat-status",
        ),
      ).toBe("degraded"),
    );
    expect(screen.getByText("JMA警報・注意報").parentElement?.textContent).toContain(
      "取得不能",
    );
  });

  it("fails closed when both sources are unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), { status: 503 }),
      ),
    );
    const { container } = render(
      <AreaHeatStatus areaId="tokyo-shinjuku" compact />,
    );

    await waitFor(() =>
      expect(
        container.querySelector("[data-heat-status]")?.getAttribute(
          "data-heat-status",
        ),
      ).toBe("unavailable"),
    );
    expect(screen.getByText("取得できません。公式情報を確認してください。")).toBeTruthy();
    expect(screen.queryByText(/判断保留/)).toBeNull();
    expect(screen.queryByText(/安全です|低リスクです|基準値内です/)).toBeNull();
    expect(screen.queryByRole("link", { name: "この暑さでKYを作る" })).toBeNull();
  });
});
