import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import { GET } from "./route";

vi.mock("@/lib/heat-illness/environment-wbgt", () => ({
  loadEnvironmentWbgtStatus: vi.fn(),
}));

const mockLoad = vi.mocked(loadEnvironmentWbgtStatus);

beforeEach(() => {
  mockLoad.mockReset();
});

describe("GET /api/wbgt", () => {
  it.each([
    "",
    "?area=35.6938%2C139.7034",
    "?area=%E6%9D%B1%E4%BA%AC%E9%83%BD%20%E6%96%B0%E5%AE%BF%E5%8C%BA",
    "?area=..%2Ftokyo-shinjuku",
  ])("rejects non-allowlisted area input: %s", async (query) => {
    const response = await GET(
      new NextRequest(`https://example.test/api/wbgt${query}`),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it("loads only the canonical coarse area and marks the official source", async () => {
    mockLoad.mockResolvedValue({
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      prefectureIso: "JP-13",
      scopeLabel: "東京都内提供地点の最大",
      wbgt: {
        status: "estimated",
        mode: "official-estimated-current",
        valueCelsius: 31.4,
        targetAt: "2026-07-31T03:00:00.000Z",
        createdAt: null,
        stationCount: 11,
        expectedStationCount: 11,
        stale: false,
        label: "公式提供・実況推定（都道府県内最大）",
      },
      alerts: {
        heatAlert: "active",
        specialHeatAlert: "inactive",
        targetDate: "2026-07-31",
        reportAt: "2026-07-30T20:00:00.000Z",
      },
      retrievedAt: "2026-07-31T03:10:00.000Z",
      degraded: false,
      provider: "環境省 熱中症予防情報サイト",
      sourceUrl: "https://www.wbgt.env.go.jp/",
      dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
    });

    const response = await GET(
      new NextRequest(
        "https://example.test/api/wbgt?area=tokyo-shinjuku",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-wbgt-source")).toBe(
      "environment-ministry",
    );
    expect(body.wbgt.status).toBe("estimated");
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad.mock.calls[0]?.[0].location.id).toBe(
      "tokyo-shinjuku",
    );
  });

  it("single-flights concurrent reads for the same canonical area", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockLoad.mockImplementation(async ({ location }) => {
      await gate;
      return {
        areaId: location.id,
        areaLabel: location.label,
        prefectureIso: location.prefectureIso,
        scopeLabel: "取得できた提供地点の最大",
        wbgt: {
          status: "estimated",
          mode: "official-estimated-current",
          valueCelsius: 30,
          targetAt: "2026-07-31T03:00:00.000Z",
          createdAt: null,
          stationCount: 1,
          expectedStationCount: 1,
          stale: false,
          label: "公式提供・実況推定（提供地点内最大）",
        },
        alerts: {
          heatAlert: "inactive",
          specialHeatAlert: "inactive",
          targetDate: "2026-07-31",
          reportAt: "2026-07-31T01:00:00.000Z",
        },
        retrievedAt: "2026-07-31T03:10:00.000Z",
        degraded: false,
        provider: "環境省 熱中症予防情報サイト",
        sourceUrl: "https://www.wbgt.env.go.jp/",
        dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
      };
    });

    const first = GET(
      new NextRequest("https://example.test/api/wbgt?area=osaka-osaka"),
    );
    const second = GET(
      new NextRequest("https://example.test/api/wbgt?area=osaka-osaka"),
    );
    release();
    const responses = await Promise.all([first, second]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
