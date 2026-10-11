import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JmaWarningsFile } from "@/lib/jma/jma-data";

const runtime = vi.hoisted(() => ({ warnings: vi.fn(), weather: vi.fn(), earthquakes: vi.fn() }));
vi.mock("@/lib/jma/fetch-jma-runtime", () => ({
  getJmaWarningsRuntime: runtime.warnings,
  getJmaWeatherRuntime: runtime.weather,
  getJmaEarthquakesRuntime: runtime.earthquakes,
}));
vi.mock("@/lib/server/bearer-auth", () => ({
  verifyBearerSecret: () => ({ ok: true }),
  bearerAuthError: vi.fn(),
}));
import { GET } from "./route";

function warningsFixture(): JmaWarningsFile {
  const byIso: JmaWarningsFile["byIso"] = Object.fromEntries(Array.from({ length: 47 }, (_, i) => [
    "JP-" + String(i + 1).padStart(2, "0"), { level: "none", entries: [] },
  ]));
  byIso["JP-13"] = {
    level: "none", sourceStatus: "live", sourceFetchedAt: "2026-07-23T02:58:00Z",
    entries: [{
      sourceCode: "130000", level: "none", headline: null,
      reportDatetime: "2026-07-20T00:00:00+09:00", publishingOffice: "気象庁", warnings: [],
      sourceHttpDate: "Thu, 23 Jul 2026 02:58:00 GMT", sourceHttpAgeSeconds: 0,
    }],
  };
  return { fetchedAt: "2026-07-23T02:58:00Z", byIso, quality: { status: "live", attempted: 47, succeeded: 47, failed: 0 } };
}

describe("GET /api/cron/signage-jma-health warning HTTP freshness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T03:00:00Z"));
    const fresh = { fetchedAt: "2026-07-23T02:58:00Z", quality: { status: "live", attempted: 1, succeeded: 1, failed: 0 } };
    runtime.weather.mockResolvedValue({ ...fresh, byIso: {} });
    runtime.earthquakes.mockResolvedValue({ ...fresh, items: [] });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("keeps a current response healthy despite an unchanged older announcement", async () => {
    runtime.warnings.mockResolvedValue(warningsFixture());
    const response = await GET(new Request("https://example.invalid/api/cron/signage-jma-health"));
    expect(response.status).toBe(200);
    expect((await response.json()).sources[0].degraded).toBe(false);
  });

  it("assesses freshness after a cache-miss fetch completes", async () => {
    runtime.warnings.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(1000);
      const data = warningsFixture();
      data.fetchedAt = new Date().toISOString();
      data.byIso["JP-13"].sourceFetchedAt = data.fetchedAt;
      data.byIso["JP-13"].entries[0].sourceHttpDate = new Date().toUTCString();
      return data;
    });
    const response = await GET(new Request("https://example.invalid/api/cron/signage-jma-health"));
    expect(response.status).toBe(200);
    expect((await response.json()).sources[0].degraded).toBe(false);
  });

  it("flags a cached warning response that expires after its successful fetch", async () => {
    const data = warningsFixture();
    data.byIso["JP-13"].entries[0].sourceHttpDate = "Thu, 23 Jul 2026 02:44:00 GMT";
    data.byIso["JP-13"].entries[0].sourceHttpAgeSeconds = 840;
    runtime.warnings.mockResolvedValue(data);
    const response = await GET(new Request("https://example.invalid/api/cron/signage-jma-health"));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.sources[0].degraded).toBe(true);
    expect(body.sources[0].stale).toBe(false);
  });
});
