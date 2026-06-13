import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { mhlwNotices } from "@/data/mhlw-notices";
import { latestIsoDate } from "@/lib/sitemap/lastmod";

// 柱C-3-2: sitemap-circulars.xml の幽霊URL(soft404)是正の回帰テスト。
// 旧実装は officialNotices(notices-and-precedents・nt-* の別系統ID)を /circulars/<id> として
// 出力していたが、/circulars/[id] は generateStaticParams で mhlwNotices(mhlw-notice-NNNN)しか
// 解決しないため全URLが404だった。正本=mhlwNotices へ差し替え＝サイトマップの全URLが実在の
// 通達詳細ページに解決することを固定する（sitemap-equipment.xml と同型の是正）。

async function getXml(): Promise<string> {
  const res = await GET();
  return res.text();
}

function extractCircularIds(xml: string): string[] {
  return [...xml.matchAll(/\/circulars\/([^<]+)</g)].map((m) => m[1]);
}

describe("GET /sitemap-circulars.xml", () => {
  it("は application/xml の urlset を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("は mhlwNotices の全件を /circulars/<mhlw-notice-id> として出力する(件数一致)", async () => {
    const xml = await getXml();
    const ids = extractCircularIds(xml);
    const expected = mhlwNotices.map((n) => n.id);
    expect(ids.length).toBe(expected.length);
    expect(new Set(ids)).toEqual(new Set(expected));
  });

  it("の全URLは mhlwNotices に実在する通達IDに解決する(幽霊URLゼロ)", async () => {
    const xml = await getXml();
    const ids = extractCircularIds(xml);
    const known = new Set(mhlwNotices.map((n) => n.id));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(known.has(id), `${id} は /circulars/[id] で解決すべき`).toBe(true);
    }
  });

  it("には旧 officialNotices 系の別系統ID(nt-*)が一切含まれない", async () => {
    const xml = await getXml();
    expect(xml).not.toMatch(/\/circulars\/nt-/);
    // 全loc が mhlw-notice- プレフィックスであること
    const ids = extractCircularIds(xml);
    for (const id of ids) {
      expect(id.startsWith("mhlw-notice-"), `${id} は mhlw-notice- 始まりであるべき`).toBe(true);
    }
  });

  it("の lastmod は YYYY-MM-DD 形式かつ未来日を含まない(柱C-3-4)", async () => {
    const xml = await getXml();
    const today = new Date().toISOString().split("T")[0];
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods.length).toBe(mhlwNotices.length);
    for (const lm of lastmods) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(lm), `${lm} は YYYY-MM-DD であるべき`).toBe(true);
      expect(lm <= today, `${lm} は未来日`).toBe(true);
    }
  });

  it("の lastmod は各通達の発出日(issuedDate)に追従する", async () => {
    const xml = await getXml();
    const today = new Date().toISOString().split("T")[0];
    const sample = mhlwNotices.slice(0, 5);
    for (const n of sample) {
      const expected = latestIsoDate([n.issuedDate], "2026-04-28", today);
      expect(xml).toContain(
        `<loc>https://www.anzen-ai-portal.jp/circulars/${n.id}</loc>\n    <lastmod>${expected}</lastmod>`,
      );
    }
  });
});
