import { describe, expect, it } from "vitest";
import {
  getPublishedArticleBySlug,
  getPublishedArticleSlugs,
} from "@/lib/articles";
import { getPublishedArticleSearchEntries } from "@/lib/articles-search-source";
import { QUARANTINED_ARTICLE_SLUGS } from "@/lib/article-quarantine";

describe("high-risk article quarantine", () => {
  it("excludes every quarantined article from detail resolution, sitemap source, and search source", () => {
    const slugs = new Set(getPublishedArticleSlugs(new Date("2999-12-31")));
    const searchSlugs = new Set(
      getPublishedArticleSearchEntries(new Date("2999-12-31")).map(
        (entry) => entry.slug,
      ),
    );
    for (const slug of QUARANTINED_ARTICLE_SLUGS) {
      expect(getPublishedArticleBySlug(slug, new Date("2999-12-31"))).toBeNull();
      expect(slugs.has(slug)).toBe(false);
      expect(searchSlugs.has(slug)).toBe(false);
    }
  });
});
