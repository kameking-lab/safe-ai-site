import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import article from "@/data/articles/heat-stroke-2025-mandatory.json";
import articleBody from "@/data/articles/bodies/heat-stroke-2025-mandatory.json";

const { slug } = article;
const path = `/articles/${slug}`;
const props = { params: Promise.resolve({ slug }) };

async function loadWithReviewDate(humanReviewedAt: string | null) {
  const fixture = { ...article, humanReviewedAt };
  vi.doMock("@/data/articles/heat-stroke-2025-mandatory.json", () => ({
    default: fixture,
  }));

  const [detail, list, search, sitemap, articles] = await Promise.all([
    import("./page"),
    import("../page"),
    import("@/lib/articles-search-source"),
    import("@/app/sitemap-articles.xml/route"),
    import("@/lib/articles"),
  ]);
  return { detail, list, search, sitemap, articles };
}

afterEach(() => {
  vi.doUnmock("@/data/articles/heat-stroke-2025-mandatory.json");
  vi.resetModules();
});

describe("熱中症記事の公開判定", () => {
  it("人手確認待ちは詳細を404・noindexとし、一覧・検索・サイトマップから除外する", async () => {
    const { detail, list, search, sitemap, articles } = await loadWithReviewDate(null);

    expect(detail.dynamic).toBe("force-dynamic");
    expect(await detail.generateMetadata(props)).toEqual({
      robots: { index: false, follow: true },
    });
    await expect(detail.default(props)).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(articles.getPublishedArticleSlugs()).not.toContain(slug);
    expect(renderToStaticMarkup(list.default())).not.toContain(`href="${path}"`);
    expect(search.getPublishedArticleSearchEntries().some((entry) => entry.slug === slug)).toBe(false);
    expect(await (await sitemap.GET()).text()).not.toContain(path);
  });

  it("人手確認日だけを記録すると本文と各導線が公開される", async () => {
    const { detail, list, search, sitemap, articles } = await loadWithReviewDate("2026-11-18");

    expect(await detail.generateMetadata(props)).toMatchObject({
      title: article.title,
      robots: { index: true, follow: true },
      alternates: { canonical: path },
    });
    expect(renderToStaticMarkup(await detail.default(props))).toContain(articleBody.sections[0].heading);
    expect(articles.getPublishedArticleSlugs()).toContain(slug);
    expect(renderToStaticMarkup(list.default())).toContain(`href="${path}"`);
    expect(search.getPublishedArticleSearchEntries()).toContainEqual(
      expect.objectContaining({ slug, title: article.title }),
    );
    expect(await (await sitemap.GET()).text()).toContain(path);
  });
});
