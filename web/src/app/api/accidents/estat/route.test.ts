import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/accidents/estat quarantine boundary", () => {
  afterEach(() => {
    delete process.env.E_STAT_API_KEY;
    vi.restoreAllMocks();
  });

  it("never calls a keyed external API or echoes a query when credentials exist", async () => {
    process.env.E_STAT_API_KEY = "test-placeholder-not-a-secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const marker = "TEST-CONFIDENTIAL-ESTAT-QUERY";

    const response = await GET(
      new Request(
        `https://example.test/api/accidents/estat?q=${encodeURIComponent(marker)}`,
      ),
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-data-status")).toBe("quarantined");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: false,
      sourceStatus: "quarantined",
      reason: "estat_keyed_integration_not_permitted",
      total: 0,
      tables: [],
    });
    expect(body.officialCatalogUrl).toBe(
      "https://www.e-stat.go.jp/stat-search/database",
    );
    expect(serialized).not.toContain(marker);
  });
});
