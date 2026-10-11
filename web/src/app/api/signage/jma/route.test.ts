import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  warnings: vi.fn(),
  weather: vi.fn(),
  earthquakes: vi.fn(),
}));

vi.mock("@/lib/jma/fetch-jma-runtime", () => ({
  getJmaWarningsRuntime: runtime.warnings,
  getJmaWeatherRuntime: runtime.weather,
  getJmaEarthquakesRuntime: runtime.earthquakes,
}));

import { GET } from "./route";

function isoMap(count: number): import("@/lib/jma/jma-data").JmaWarningsFile["byIso"] {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `JP-${String(index + 1).padStart(2, "0")}`,
    { level: "none", entries: [] },
  ]));
}

describe("GET /api/signage/jma freshness aggregation", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T03:00:00.000Z"));
    runtime.warnings.mockResolvedValue({
      fetchedAt: "2026-07-23T02:50:00Z",
      byIso: isoMap(47),
      quality: { status: "live", attempted: 47, succeeded: 47, failed: 0 },
    });
    runtime.weather.mockResolvedValue({
      fetchedAt: "2026-07-23T02:50:00Z",
      byIso: isoMap(7),
      quality: { status: "live", attempted: 7, succeeded: 7, failed: 0 },
    });
    runtime.earthquakes.mockResolvedValue({
      fetchedAt: "2026-07-23T02:50:00Z",
      items: [],
      quality: { status: "live", attempted: 1, succeeded: 1, failed: 0 },
    });
  });

  it("is live only after freshness, quality, and coverage checks and never enables CDN SWR", async () => {
    const response = await GET();
    expect((await response.json()).degraded).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("cache-control")).not.toContain("stale-while-revalidate");
  });

  it("reports expired cached HTTP responses consistently with region trust", async () => {
    const byIso = isoMap(47);
    byIso["JP-13"] = {
      level: "none",
      entries: [{
        sourceCode: "130000", level: "none", headline: null,
        reportDatetime: "2026-07-20T00:00:00+09:00", publishingOffice: "気象庁", warnings: [],
        sourceHttpDate: "Thu, 23 Jul 2026 02:44:00 GMT", sourceHttpAgeSeconds: 840,
      }],
      sourceStatus: "live", sourceFetchedAt: "2026-07-23T02:58:00Z",
    };
    runtime.warnings.mockResolvedValueOnce({
      fetchedAt: "2026-07-23T02:58:00Z", byIso,
      quality: { status: "live", attempted: 47, succeeded: 47, failed: 0 },
    });
    const response = await GET();
    const body = await response.json();
    expect(body.trust.warnings.status).toBe("degraded");
    expect(body.trust.warnings.reasons).toContain("coverage-partial");
    expect(body.degraded).toBe(true);
    expect(response.headers.get("x-data-source")).toBe("jma-runtime-degraded");
  });

  it("degrades stale and partial-region data despite quality.status=live", async () => {
    runtime.warnings.mockResolvedValueOnce({
      fetchedAt: "2026-07-23T02:44:59Z",
      byIso: isoMap(46),
      quality: { status: "live", attempted: 47, succeeded: 47, failed: 0 },
    });
    const response = await GET();
    expect((await response.json()).degraded).toBe(true);
    expect(response.headers.get("x-data-source")).toBe("jma-runtime-degraded");
  });
});
