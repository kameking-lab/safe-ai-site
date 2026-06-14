import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { computeSitemapFreshness } from "@/lib/sitemap/freshness";

// 柱C-3-3 / A-3: 事故事例 個別詳細 /accidents/[id] のサイトマップ収載の回帰テスト。
// 事故DBはサイト最大級の独自コンテンツだが、本体 sitemap.xml には一覧 /accidents しか無く
// 個別ページが全sitemap不在だった（判例 /court-cases/[id] は収載済みなのに事故だけ漏れていた）。
// 正本 getAccidentCasesDataset() へ寄せ、全URLが実在の詳細ページに解決する（幽霊URLゼロ）ことを固定する。

const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function getXml(): Promise<string> {
  const res = await GET();
  return res.text();
}

function extractAccidentIds(xml: string): string[] {
  return [...xml.matchAll(/\/accidents\/([^<]+)</g)].map((m) => m[1]);
}

describe("GET /sitemap-accidents.xml", () => {
  it("は application/xml の urlset を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("は正本 getAccidentCasesDataset() の全ユニークIDを /accidents/<id> として出力する", async () => {
    const xml = await getXml();
    const ids = extractAccidentIds(xml);
    const expected = new Set(getAccidentCasesDataset().map((c) => c.id));
    expect(ids.length).toBeGreaterThan(0);
    // 重複なし＝出力ID集合が正本のユニークID集合と一致する。
    expect(new Set(ids)).toEqual(expected);
    expect(ids.length).toBe(expected.size);
  });

  it("の各URLは一覧トップ /accidents ではなく個別詳細へ深リンクする（裸 /accidents 不在）", async () => {
    const xml = await getXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc).toMatch(/\/accidents\/.+$/);
      expect(loc.endsWith("/accidents")).toBe(false);
    }
  });

  it("の lastmod は事故DBの実生成日（accidentsDataUpdated）で、当日固定でない", async () => {
    const xml = await getXml();
    const today = new Date().toISOString().slice(0, 10);
    const { accidentsDataUpdated } = computeSitemapFreshness(today);
    const mods = [...new Set([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]))];
    expect(mods).toEqual([accidentsDataUpdated]);
    for (const m of mods) expect(m).toMatch(ISO);
  });
});
