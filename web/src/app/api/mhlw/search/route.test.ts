import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/mhlw/search quarantine boundary", () => {
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("GETを405で拒否し、URL入力・転送・キャッシュを許可しない", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-placeholder-not-a-secret";
    const request = new Request("https://example.test/api/mhlw/search");
    const response = GET();
    const body = await response.json();

    expect(request.url).toBe("https://example.test/api/mhlw/search");
    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-data-status")).toBe("quarantined");
    expect(response.headers.get("allow")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(body).toMatchObject({
      ok: false,
      sourceStatus: "quarantined",
      reason: "mhlw_accident_corpus_quarantined",
      total: 0,
      records: [],
    });
  });
});
