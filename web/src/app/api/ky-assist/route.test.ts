import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/ky-assist retirement boundary", () => {
  it("does not parse, echo, cache, or score a submitted work context", async () => {
    const marker = "TEST-CONFIDENTIAL-SITE-CONTEXT";
    const response = await POST(
      new Request("https://example.test/api/ky-assist", {
        method: "POST",
        body: JSON.stringify({ mode: "table", workContext: marker }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-feature-status")).toBe("retired");
    expect(body).toMatchObject({
      ok: false,
      reason: "legacy_ky_assist_retired",
      replacement: "/api/ky/suggest",
    });
    expect(JSON.stringify(body)).not.toContain(marker);
    expect(body).not.toHaveProperty("riskRows");
    expect(body).not.toHaveProperty("likelihood");
    expect(body).not.toHaveProperty("severity");
  });
});
