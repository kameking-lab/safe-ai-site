import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import robots from "./robots";
import { GET as getAccidentsSitemap } from "./sitemap-accidents.xml/route";
import { GET as getCircularsSitemap } from "./sitemap-circulars.xml/route";
import { GET as getEquipmentSitemap } from "./sitemap-equipment.xml/route";
import { GET as getSitemapIndex } from "./sitemap-index.xml/route";
import { SITE_URL } from "@/lib/seo-metadata";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

/**
 * 柱C-3 / S DRY 回帰テスト:
 * sitemap（本体 + 子 sitemap 6本）と robots が出力する絶対URLのオリジンを、
 * seo-metadata.ts の SITE_URL 単一ソースへ集約した状態を固定する。
 *
 * 旧状態: 各ファイルが `https://www.anzen-ai-portal.jp` をドメイン直書きしており、
 * SITE_URL 変更時に sitemap の <loc> と robots の Sitemap 行が旧ドメインへ無言ドリフト
 * する構造だった（og-image・json-ld・page-json-ld は既に SITE_URL 集約済みで、
 * sitemap/robots だけ取り残されていた）。
 *
 * SITE_URL は末尾スラッシュ無し＝従来の直書き値と同値のため、出力は byte-identical。
 */

// vitest は web/ を cwd に実行する。
const readSrc = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

const bareDomain = SITE_URL.replace(/^https?:\/\//, "");

// SITE_URL 単一ソース化の対象ファイル（絶対URLのオリジンを直書きしていた全箇所）。
const GUARDED_SOURCES = [
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/app/sitemap-index.xml/route.ts",
  "src/app/sitemap-articles.xml/route.ts",
  "src/app/sitemap-chemicals.xml/route.ts",
  "src/app/sitemap-circulars.xml/route.ts",
  "src/app/sitemap-laws.xml/route.ts",
];

describe("sitemap/robots のドメイン SITE_URL 単一ソース化（柱C-3 / S DRY）", () => {
  it.each(GUARDED_SOURCES)("%s はドメイン直書きを持たず SITE_URL を import する", (rel) => {
    const src = readSrc(rel);
    // コメント含めドメイン文字列を一切埋め込まない（SITE_URL import 経由のみ）。
    expect(src).not.toContain(bareDomain);
    expect(src).toContain('@/lib/seo-metadata');
    expect(src).toContain("SITE_URL");
  });

  it("sitemap() の全 <loc> は SITE_URL オリジン始まり", () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    const paths = entries.map((entry) => new URL(entry.url).pathname);
    expect(paths).not.toContain("/accidents");
    expect(paths.some((path) => path.startsWith("/accidents/"))).toBe(false);
    expect(isPublicRouteAvailable("/accidents")).toBe(true);
    expect(isPublicRouteAvailable("/accidents/example-id")).toBe(false);
    for (const e of entries) {
      expect(e.url.startsWith(`${SITE_URL}/`) || e.url === SITE_URL).toBe(true);
      const url = new URL(e.url);
      expect(url.origin).toBe(new URL(SITE_URL).origin);
      expect(
        isPublicRouteAvailable(url.pathname),
        `${url.pathname} は公開可否ポリシーで隔離されている`,
      ).toBe(true);
    }
  });

  it("robots() の Sitemap 行は SITE_URL 由来", () => {
    const { sitemap: sitemapUrl } = robots();
    expect(sitemapUrl).toBe(`${SITE_URL}/sitemap-index.xml`);
  });

  it("隔離中の事故・商品 sitemap は空・no-store で、sitemap index に掲載しない", async () => {
    for (const getQuarantinedSitemap of [
      getAccidentsSitemap,
      getEquipmentSitemap,
    ]) {
      const response = await getQuarantinedSitemap();
      const xml = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Data-Status")).toMatch(
        /quarantined|human-review-pending/,
      );
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(xml).toContain("<urlset");
      expect(xml).not.toMatch(/<url(?:\s|>)/);
    }

    const indexResponse = await getSitemapIndex();
    const indexXml = await indexResponse.text();
    expect(indexResponse.status).toBe(200);
    expect(indexXml).not.toContain("sitemap-accidents.xml");
    expect(indexXml).not.toContain("sitemap-equipment.xml");
  });

  it("個別一次資料照合済みの通達 sitemap は1件を返し、indexから到達できる", async () => {
    const response = await getCircularsSitemap();
    const xml = await response.text();
    expect(response.headers.get("X-Data-Status")).toBe(
      "individually-verified",
    );
    expect(xml.match(/<url(?:\s|>)/g)).toHaveLength(1);
    expect(xml).toContain("/circulars/mhlw-notice-0014");

    const indexResponse = await getSitemapIndex();
    expect(await indexResponse.text()).toContain("sitemap-circulars.xml");
  });

  it("空の隔離 sitemap は絶対URLを生成せず、SITE_URL import も持たない", () => {
    for (const rel of [
      "src/app/sitemap-accidents.xml/route.ts",
      "src/app/sitemap-equipment.xml/route.ts",
    ]) {
      const src = readSrc(rel);
      expect(src).not.toContain(bareDomain);
      expect(src).not.toContain("SITE_URL");
    }
  });
});
