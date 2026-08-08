import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reset } from "@/lib/external/circuit-breaker";
import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";
import { GET } from "./route";

vi.mock("@/lib/external/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

const fetchMock = vi.mocked(fetchWithTimeout);

describe("GET /api/weather-forecast fail-closed", () => {
  beforeEach(() => {
    reset("open-meteo");
    fetchMock.mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("外部API停止時にゼロ値の『異常なし』データを生成しない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("synthetic outage"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ degraded: true, regions: [] });
    expect(JSON.stringify(body)).not.toContain('"alertLevel":"none"');
  });

  it("欠落配列を正常予報として扱わない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ daily: { time: ["2026-07-22"] } }), { status: 200 }),
    );

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.regions).toEqual([]);
  });

  it("PF-037: 1地域だけ失敗しても取得済み7地域を保持して部分成功を明示する", async () => {
    const valid = {
      timezone: "Asia/Tokyo",
      utc_offset_seconds: 32400,
      daily: {
        time: ["2026-07-28"],
        weather_code: [1],
        temperature_2m_max: [30],
        temperature_2m_min: [22],
        precipitation_sum: [0],
        wind_speed_10m_max: [7.2],
      },
    };
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("latitude=43.0618")) {
        throw new Error("synthetic one-region outage");
      }
      return new Response(JSON.stringify(valid), { status: 200 });
    });

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(206);
    expect(body.regions).toHaveLength(7);
    expect(body).toMatchObject({
      degraded: true,
      degradedReason: "partial_region_failure",
      unavailableRegions: ["hokkaido"],
    });
    expect(body.regions.some((region: { regionId: string }) => region.regionId === "hokkaido")).toBe(false);
  });
});
