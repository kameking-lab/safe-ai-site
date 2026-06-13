import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { computeSitemapFreshness } from "@/lib/sitemap/freshness";

// 柱C-3-4 / A-3: sitemap-index.xml の子サイトマップ lastmod を「実データ最新日」に揃えた
// 回帰テスト。旧実装は全子サイトマップに当日（new Date()）を打っており、中身不変でも
// lastmod が毎日動く lastmod スパムだった点を是正している。

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const BASE = "https://www.anzen-ai-portal.jp";

async function getXml(): Promise<string> {
  const res = await GET();
  return res.text();
}

describe("GET /sitemap-index.xml", () => {
  it("は application/xml の sitemapindex を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("は4つの子サイトマップ（本体/記事/通達/保護具）を順に列挙する", async () => {
    const xml = await getXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      `${BASE}/sitemap.xml`,
      `${BASE}/sitemap-articles.xml`,
      `${BASE}/sitemap-circulars.xml`,
      `${BASE}/sitemap-equipment.xml`,
    ]);
  });

  it("の全 lastmod は YYYY-MM-DD 形式で4件", async () => {
    const xml = await getXml();
    const mods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(mods.length).toBe(4);
    for (const m of mods) expect(m).toMatch(ISO);
  });

  it("の各子 lastmod は対応セクションの実データ最新日に一致する（当日固定でない）", async () => {
    const xml = await getXml();
    const today = new Date().toISOString().slice(0, 10);
    const f = computeSitemapFreshness(today);
    const pairs = [
      ...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g),
    ].map((m) => [m[1], m[2]] as const);
    const map = Object.fromEntries(pairs);
    expect(map[`${BASE}/sitemap.xml`]).toBe(f.siteFreshest);
    expect(map[`${BASE}/sitemap-articles.xml`]).toBe(f.freshestArticle);
    expect(map[`${BASE}/sitemap-circulars.xml`]).toBe(f.freshestNotice);
    expect(map[`${BASE}/sitemap-equipment.xml`]).toBe(f.equipmentDataUpdated);
  });
});
