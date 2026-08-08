import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /sitemap-equipment.xml — 商品カタログ隔離", () => {
  it("XMLとして空のurlsetを返す", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Data-Status")).toBe("quarantined");
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
    expect(xml).not.toContain("/equipment/");
  });
});
