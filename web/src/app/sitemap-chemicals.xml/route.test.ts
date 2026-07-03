import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { CONCENTRATION_LIMITS } from "@/lib/mhlw-chemicals";
import { computeSitemapFreshness } from "@/lib/sitemap/freshness";

// 柱C-3-3 追補5 / A-3: 化学物質 個別詳細 /chemical-database/[cas] のサイトマップ収載の回帰テスト。
// 濃度基準DB（約3,515物質）はサイト最大級の独自コンテンツだが、本体 sitemap.xml には一覧
// /chemical-database しか無く、個別ページが全sitemap不在だった（事故 /accidents/[id]・保護具
// /equipment/[id] は子サイトマップ収載済みなのに、より大きい化学物質DBだけ漏れていた発見性の穴）。
// 正本 CONCENTRATION_LIMITS.substances のキー集合へ寄せ、全URLが実在の詳細ページ（notFound() を
// 弾く CAS 集合＝そのもの）に解決する（幽霊URLゼロ）ことを固定する。

const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function getXml(): Promise<string> {
  const res = await GET();
  return res.text();
}

function extractCas(xml: string): string[] {
  return [...xml.matchAll(/\/chemical-database\/([^<]+)</g)].map((m) => m[1]);
}

describe("GET /sitemap-chemicals.xml", () => {
  it("は application/xml の urlset を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("は正本 CONCENTRATION_LIMITS.substances の全CASキーを /chemical-database/<cas> として出力する", async () => {
    const xml = await getXml();
    const cas = extractCas(xml);
    const expected = new Set(Object.keys(CONCENTRATION_LIMITS.substances));
    // データ規模の非空虚性（サイト最大級の独自コンテンツ）。
    expect(cas.length).toBeGreaterThan(1000);
    // 出力CAS集合＝正本のキー集合と完全一致（欠落・幽霊URLともにゼロ）。
    expect(new Set(cas)).toEqual(expected);
    expect(cas.length).toBe(expected.size);
  });

  it("の各URLは一覧トップ /chemical-database ではなく個別詳細へ深リンクする（裸 /chemical-database 不在）", async () => {
    const xml = await getXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc).toMatch(/\/chemical-database\/.+$/);
      expect(loc.endsWith("/chemical-database")).toBe(false);
    }
  });

  it("の全CASキーはURL安全（数字とハイフンのみ）＝詳細ページの decodeURIComponent canonical と 1:1 一致しエンコード乖離しない", () => {
    // 詳細ページ canonical は `/chemical-database/${cas}`（decodeURIComponent(param)・非エンコード）。
    // キーに %/? 等が含まれると sitemap の loc（要エンコード）と canonical が乖離し重複判定になる。
    // 全キーが [0-9-] のみであることを固定し、エンコード不要＝canonical と一致することを保証する。
    for (const cas of Object.keys(CONCENTRATION_LIMITS.substances)) {
      expect(cas).toMatch(/^[0-9-]+$/);
    }
  });

  it("の lastmod は濃度基準DBの実生成日（chemicalsDataUpdated）で、当日固定でない", async () => {
    const xml = await getXml();
    const today = new Date().toISOString().slice(0, 10);
    const { chemicalsDataUpdated } = computeSitemapFreshness(today);
    const mods = [...new Set([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]))];
    expect(mods).toEqual([chemicalsDataUpdated]);
    for (const m of mods) expect(m).toMatch(ISO);
  });
});
