import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { getPublishedArticleIndex, getPublishedArticleBySlug } from "@/lib/articles";
import sitemap from "../sitemap";
import { realLawRevisions } from "@/data/mock/real-law-revisions";

/**
 * 柱C-3-1 回帰テスト: sitemap-articles.xml の幽霊URL（soft404）再発防止。
 *
 * 旧バグ: sitemap-articles.xml が realLawRevisions の lr-real-* ID から
 * /articles/<id> を生成していたが、記事ルート（/articles/[slug]）は
 * src/data/articles/*.json の slug でしか解決せず、lr-real-* は notFound() = 404。
 * → sitemap に実在しないURLが大量掲載される soft404 群になっていた。
 */
describe("sitemap-articles.xml（柱C-3-1 soft404是正）", () => {
  it("実在の公開済み記事 slug のみを列挙する（lr-real-* 幽霊URLゼロ）", async () => {
    const res = await GET();
    const xml = await res.text();

    expect(xml).not.toContain("lr-real-");

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);

    const realSlugs = new Set(getPublishedArticleIndex().map((a) => a.slug));
    for (const loc of locs) {
      const slug = loc.replace(/^.*\/articles\//, "");
      // sitemap の全URLが実在の公開済み記事に解決すること
      expect(realSlugs.has(slug)).toBe(true);
      expect(getPublishedArticleBySlug(slug)).not.toBeNull();
    }

    // 公開済み記事の件数と一致（漏れなく掲載）
    expect(locs.length).toBe(realSlugs.size);
  });

  it("lr-real-* ID は記事ルートに存在しない（notFound対象＝サイトマップに載せてはならない）", () => {
    const sampleLrRealIds = realLawRevisions.slice(0, 5).map((r) => r.id);
    for (const id of sampleLrRealIds) {
      expect(id).toMatch(/^lr-real-/);
      expect(getPublishedArticleBySlug(id)).toBeNull();
    }
  });

  it("正しい XML（Content-Type application/xml）を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<urlset");
  });
});

describe("sitemap.xml（柱C-3-1 リダイレクトURL除外・記事重複排除）", () => {
  const urls = sitemap().map((e) => e.url);

  it("リダイレクトURL（/about/cases・/pdf）を掲載しない", () => {
    expect(urls.some((u) => u.endsWith("/about/cases"))).toBe(false);
    expect(urls.some((u) => u.endsWith("/pdf"))).toBe(false);
  });

  it("記事個別URL（/articles/<slug>）は専用 sitemap-articles.xml に集約し重複掲載しない", () => {
    expect(urls.some((u) => /\/articles\/[^/]+$/.test(u) && !u.endsWith("/articles"))).toBe(false);
  });

  it("lr-real-* 幽霊URLを含まない", () => {
    expect(urls.some((u) => u.includes("lr-real-"))).toBe(false);
  });
});
