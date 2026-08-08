import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { isIndexableAccident } from "@/lib/seo/index-quality";

describe("GET /sitemap-accidents.xml quarantine boundary", () => {
  it("空のXML urlsetをno-storeで返す", async () => {
    const response = await GET();
    const xml = await response.text();
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-data-status")).toBe("quarantined");
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
    expect(xml).not.toContain("<loc>");
    expect(xml).not.toContain("<lastmod>");
  });

  it("ローカル事故個票は全件index品質ゲートで拒否される", () => {
    const dataset = getAccidentCasesDataset();
    expect(dataset.length).toBeGreaterThan(0);
    expect(dataset.filter(isIndexableAccident)).toEqual([]);
  });
});
