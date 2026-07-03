import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import robots from "./robots";
import { SITE_URL } from "@/lib/seo-metadata";

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
  "src/app/sitemap-accidents.xml/route.ts",
  "src/app/sitemap-chemicals.xml/route.ts",
  "src/app/sitemap-circulars.xml/route.ts",
  "src/app/sitemap-equipment.xml/route.ts",
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
    for (const e of entries) {
      expect(e.url.startsWith(`${SITE_URL}/`) || e.url === SITE_URL).toBe(true);
    }
  });

  it("robots() の Sitemap 行は SITE_URL 由来", () => {
    const { sitemap: sitemapUrl } = robots();
    expect(sitemapUrl).toBe(`${SITE_URL}/sitemap-index.xml`);
  });
});
