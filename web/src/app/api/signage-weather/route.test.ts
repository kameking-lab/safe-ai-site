import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { reset } from "@/lib/external/circuit-breaker";
import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";
import { GET } from "./route";

vi.mock("@/lib/external/fetch-with-timeout", () => ({ fetchWithTimeout: vi.fn() }));

const fetchMock = vi.mocked(fetchWithTimeout);

describe("GET /api/signage-weather fail-closed", () => {
  beforeEach(() => {
    reset("open-meteo");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("外部API停止時に全地域noneの新鮮なデータを作らない", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("synthetic outage"));
    const response = await GET(new NextRequest("http://localhost/api/signage-weather?mapMode=today"));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ degraded: true, mapLevels: {}, hourly: [] });
    expect(JSON.stringify(body)).not.toContain('"none"');
  });

  it("欠落配列を正常値として解釈しない", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hourly: { time: [] } }), { status: 200 }));
    const response = await GET(new NextRequest("http://localhost/api/signage-weather"));
    expect(response.status).toBe(503);
  });

  it("UTC runtime相当でもoffset無しJSTの当日23時を正しい瞬間として返す", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T14:00:00.000Z")); // JST 23:00
    const payload = {
      timezone: "Asia/Tokyo",
      utc_offset_seconds: 32400,
      hourly: {
        time: ["2026-07-23T22:00", "2026-07-23T23:00", "2026-07-24T00:00"],
        temperature_2m: [29, 28, 27],
        precipitation: [0, 0, 0],
        weather_code: [0, 0, 0],
        wind_speed_10m: [3.6, 3.6, 3.6],
      },
    };
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify(payload), { status: 200 })
    );
    const response = await GET(new NextRequest("http://localhost/api/signage-weather?mapMode=today"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.sourceTimezone).toBe("Asia/Tokyo");
    expect(body.sourceUtcOffsetSeconds).toBe(32400);
    expect(body.hourly[0].time).toBe("2026-07-23T14:00:00.000Z");
    expect(body.forecastFrom).toBe("2026-07-23T14:00:00.000Z");
  });

  it("timezoneまたはUTC offsetが不一致ならfail-closed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          timezone: "UTC",
          utc_offset_seconds: 0,
          hourly: {
            time: ["2026-07-23T09:00"],
            temperature_2m: [30],
            precipitation: [0],
            weather_code: [0],
            wind_speed_10m: [5],
          },
        }),
        { status: 200 }
      )
    );
    const response = await GET(new NextRequest("http://localhost/api/signage-weather"));
    expect(response.status).toBe(503);
  });
});
