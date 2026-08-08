import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("ky-suggestion API privacy", () => {
  it("GET queryを405で拒否し、本文を別URLへ転送しない", async () => {
    const response = GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({ error: "method_not_allowed" });
  });

  it("POST bodyで候補を返し、作業本文をrequest URLへ含めない", async () => {
    const q = "足場の組立作業";
    const request = new Request("http://localhost/api/ky-suggestion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q, limit: 3 }),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(request.url).toBe("http://localhost/api/ky-suggestion");
    expect(request.url).not.toContain(encodeURIComponent(q));
    expect(json.results.length).toBeLessThanOrEqual(3);
    expect(json.query.freeText).toBe(q);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
