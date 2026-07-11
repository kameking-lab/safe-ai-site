import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

  it("は7つの子サイトマップ（本体/記事/事故/通達/保護具/化学物質/法令ナビ条文）を順に列挙する", async () => {
    const xml = await getXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      `${BASE}/sitemap.xml`,
      `${BASE}/sitemap-articles.xml`,
      `${BASE}/sitemap-accidents.xml`,
      `${BASE}/sitemap-circulars.xml`,
      `${BASE}/sitemap-equipment.xml`,
      `${BASE}/sitemap-chemicals.xml`,
      `${BASE}/sitemap-laws.xml`,
    ]);
  });

  it("の全 lastmod は YYYY-MM-DD 形式で7件", async () => {
    const xml = await getXml();
    const mods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(mods.length).toBe(7);
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
    expect(map[`${BASE}/sitemap-accidents.xml`]).toBe(f.accidentsDataUpdated);
    expect(map[`${BASE}/sitemap-circulars.xml`]).toBe(f.freshestNotice);
    expect(map[`${BASE}/sitemap-equipment.xml`]).toBe(f.equipmentDataUpdated);
    expect(map[`${BASE}/sitemap-chemicals.xml`]).toBe(f.chemicalsDataUpdated);
    // 法令ナビ条文はコーパス e-Gov 突合日ベースの固定日（sitemap-laws.xml/route.ts CORPUS_LASTMOD と同値）
    expect(map[`${BASE}/sitemap-laws.xml`]).toBe("2026-07-11");
  });
});

/**
 * 逆カバレッジガード（柱C-3-3 の逆方向・#750 の sitemap 逆カバレッジ／RSS フィード逆カバレッジ
 * と同型）: 実在する **子サイトマップルート** `sitemap-<slug>.xml/route.ts` が sitemap-index.xml
 * へ登録されているかを機械検知する。
 *
 * 上の "6つの子サイトマップを...列挙する" は forward（index が列挙する loc の面子・順序・lastmod）を
 * 固定するが、逆向き「実在する route → index への登録」は皆無だった＝当班/他班が新しい子サイトマップ
 * `src/app/sitemap-<slug>.xml/route.ts` を新設しても sitemap-index.xml/route.ts の `children` へ
 * 追加し忘れると、その子サイトマップは index から参照されず **クローラの入口（robots.ts の
 * `sitemap:` は index だけを指す）から到達不能な孤立サイトマップ** のまま放置される。子サイトマップ
 * 1 本は数千 URL（化学物質は約3,515物質）を束ねるため、登録漏れ 1 本＝その配下ページ群がまるごと
 * 発見されない大きな穴になる（RSS フィード 1 本より桁違いに影響が大きい）。
 *
 * これは純粋なガード（コード変更 0）で、現状の実在子サイトマップは全登録済み（緑）。将来の新設時に
 * 登録漏れを CI で赤化させる回帰固定のみ（水増し・捏造 0・既存破壊 0）。
 */
describe("sitemap-index.xml（逆カバレッジガード: 実在する子サイトマップの登録漏れ0）", () => {
  // このテスト = src/app/sitemap-index.xml/route.test.ts。親の親 = src/app。
  const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

  /**
   * src/app 直下を走査し、GET ハンドラを持つ子サイトマップルート `sitemap-<slug>.xml/route.ts` を
   * `/sitemap-<slug>.xml` へ射影する。sitemap-index.xml 自身は「子を列挙する側」なので除外。
   */
  function collectChildSitemapRoutes(): string[] {
    const out: string[] = [];
    for (const e of readdirSync(APP_DIR, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (!/^sitemap-.+\.xml$/.test(e.name)) continue;
      if (e.name === "sitemap-index.xml") continue; // index 自身は子ではない
      const routeFile = ["route.ts", "route.tsx", "route.js"]
        .map((f) => join(APP_DIR, e.name, f))
        .find((p) => existsSync(p));
      if (!routeFile) continue;
      if (!/export\s+(?:async\s+)?function\s+GET\b/.test(readFileSync(routeFile, "utf8"))) continue;
      out.push(`/${e.name}`);
    }
    return out;
  }

  const childRoutes = collectChildSitemapRoutes();

  it("実在する子サイトマップルートを十分に検出できている（走査のサニティ）", () => {
    // 既知の5本（記事/事故/通達/保護具/化学物質）以上を機械検出できていること。
    expect(childRoutes.length).toBeGreaterThanOrEqual(5);
    expect(childRoutes).toContain("/sitemap-chemicals.xml");
  });

  it("実在する全子サイトマップが sitemap-index.xml に登録されている＝孤立サイトマップ0", async () => {
    const xml = await getXml();
    const registered = new Set(
      [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname),
    );
    const missing = childRoutes.filter((r) => !registered.has(r));
    expect(
      missing,
      `実在するのに sitemap-index.xml へ未登録の子サイトマップ（route.ts を新設したら ` +
        `sitemap-index.xml/route.ts の children にも追加すること。未登録の子は robots.ts の ` +
        `sitemap: が指す index から参照されず、配下ページ群がクローラに発見されない）: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
