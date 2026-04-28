import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
  lastReviewedAt: string;
  author: { name: string; url: string };
  sections: ArticleSection[];
  sources: ArticleSource[];
  ctaSlot: { title: string; description: string; href: string; label: string };
};

export type ArticleIndexEntry = Pick<
  Article,
  "slug" | "title" | "description" | "publishedAt" | "lastReviewedAt" | "category" | "industry" | "tags"
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
    return JSON.parse(raw) as Article;
  });
  cached = articles;
  return articles;
}

/**
 * 公開済み記事のみを返す（時限公開: publishedAt > now() は除外）
 */
export function getPublishedArticles(now = new Date()): Article[] {
  return loadAll()
    .filter((a) => isPublished(a.publishedAt, now))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
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
  if (!isPublished(article.publishedAt, now)) return null;
  return article;
}

/**
 * sitemap や generateStaticParams 向けの公開済み slug 一覧
 */
export function getPublishedArticleSlugs(now = new Date()): string[] {
  return getPublishedArticles(now).map((a) => a.slug);
}
