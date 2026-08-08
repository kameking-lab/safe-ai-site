import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/accidents/analyze quarantine boundary", () => {
  it("fails closed without parsing or echoing submitted site information", async () => {
    const sensitiveMarker = "TEST-SITE-CONFIDENTIAL-DO-NOT-ECHO";
    const response = await POST(
      new Request("http://localhost/api/accidents/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workContent: sensitiveMarker,
          category: "建設業",
        }),
      }),
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-data-status")).toBe("quarantined");
    expect(response.headers.get("x-ai-used")).toBe("false");
    expect(body).toMatchObject({
      ok: false,
      reason: "accident_corpus_quarantined",
      sourceStatus: "quarantined",
      advice: null,
      relatedCases: [],
    });
    expect(body.officialSearchUrl).toBe(
      "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx",
    );
    expect(serialized).not.toContain(sensitiveMarker);
  });

  it("does not expose quarantined accident records even for malformed input", async () => {
    const response = await POST(
      new Request("http://localhost/api/accidents/analyze", {
        method: "POST",
        body: "{not valid json",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.relatedCases).toEqual([]);
  });
});
