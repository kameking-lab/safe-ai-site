import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isArticleQuarantined } from "@/lib/article-quarantine";

export type ArticleSection = {
  heading: string;
  body: string;
};

export type ArticleSource = {
  label: string;
  url: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  industry: string;
  tags: string[];
  keywords?: string[];
  publishedAt: string;
  /** 編集・データ更新日。人手による内容確認日とは限らない。 */
  lastReviewedAt: string;
  /** 公式URLの取得先・到達を確認した日。本文の専門確認とは分離する。 */
  sourceRetrievedAt?: string;
  /** 内容を人が確認した日。未確認はnull、旧記事の不明状態はundefined。 */
  humanReviewedAt?: string | null;
  author: { name: string; url: string };
  sections: ArticleSection[];
  sources: ArticleSource[];
  ctaSlot: { title: string; description: string; href: string; label: string };
};

export type ArticleIndexEntry = Pick<
  Article,
  | "slug"
  | "title"
  | "description"
  | "publishedAt"
  | "lastReviewedAt"
  | "sourceRetrievedAt"
  | "humanReviewedAt"
  | "category"
  | "industry"
  | "tags"
>;

const ARTICLES_DIR = join(process.cwd(), "src", "data", "articles");

function isPublished(publishedAt: string, now = new Date()): boolean {
  // 時限公開: publishedAt が未来なら未公開扱い
  if (!publishedAt) return false;
  const pub = new Date(publishedAt);
  if (Number.isNaN(pub.getTime())) return false;
  return pub.getTime() <= now.getTime();
}

let cached: Article[] | null = null;

function loadAll(): Article[] {
  if (cached) return cached;
  let entries: string[] = [];
  try {
    entries = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    cached = [];
    return cached;
  }
  const articles: Article[] = entries.map((f) => {
    const raw = readFileSync(join(ARTICLES_DIR, f), "utf-8");
    // 一部 .json ファイルが UTF-8 BOM 付きで保存されており JSON.parse が失敗する。
    // 入口で剥がす（BOM が無ければそのまま）。
    const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const parsed = JSON.parse(stripped) as Article;
    return {
      ...parsed,
      author: {
        name: "安全AIポータル編集部",
        url: "https://www.anzen-ai-portal.jp/about/project-story",
      },
    };
  });
  cached = articles;
  return articles;
}

/**
 * 公開済み記事のみを返す（時限公開: publishedAt > now() は除外）
 */
export function getPublishedArticles(now = new Date()): Article[] {
  return loadAll()
    .filter(
      (a) => !isArticleQuarantined(a.slug) && isPublished(a.publishedAt, now),
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * Explicitly pending human content review is not eligible for search-engine
 * indexing or sitemap inclusion. Legacy records without the new field keep
 * their existing treatment until their status is migrated deliberately.
 */
export function isArticleIndexable(
  article: Pick<Article, "humanReviewedAt">,
): boolean {
  return article.humanReviewedAt !== null;
}

/**
 * 公開済み記事のインデックスを返す（一覧画面用）
 */
export function getPublishedArticleIndex(now = new Date()): ArticleIndexEntry[] {
  return getPublishedArticles(now).map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    publishedAt: a.publishedAt,
    lastReviewedAt: a.lastReviewedAt,
    sourceRetrievedAt: a.sourceRetrievedAt,
    humanReviewedAt: a.humanReviewedAt,
    category: a.category,
    industry: a.industry,
    tags: a.tags,
  }));
}

/**
 * slug → 公開済み記事を取得。未公開（時限）または存在しない場合 null。
 */
export function getPublishedArticleBySlug(slug: string, now = new Date()): Article | null {
  const article = loadAll().find((a) => a.slug === slug);
  if (!article) return null;
  if (isArticleQuarantined(article.slug)) return null;
  if (!isPublished(article.publishedAt, now)) return null;
  return article;
}

/**
 * sitemap や generateStaticParams 向けの公開済み slug 一覧
 */
export function getPublishedArticleSlugs(now = new Date()): string[] {
  return getPublishedArticles(now).map((a) => a.slug);
}
