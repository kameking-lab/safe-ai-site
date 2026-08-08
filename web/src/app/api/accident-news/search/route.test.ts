import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("accident-news search API", () => {
  it("任意キーワードをPOST bodyで受け、URLやLocationへ転送しない", async () => {
    const q = "タクシー待機所 山田太郎 新宿A現場";
    const request = new Request("http://localhost/api/accident-news/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q, page: 1 }),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(request.url).toBe("http://localhost/api/accident-news/search");
    expect(request.url).not.toContain(encodeURIComponent(q));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(json).toMatchObject({ page: 1 });
  });
});
