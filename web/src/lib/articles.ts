import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import heatArticleBody from "@/data/articles/bodies/heat-stroke-2025-mandatory.json";
import heatArticleMetadata from "@/data/articles/heat-stroke-2025-mandatory.json";
import { isArticlePublished } from "@/lib/article-quarantine";

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

function readArticle(file: string): Article {
  // 検索から参照するメタデータに、サーバー専用の本文を結合する。
  if (file === `${heatArticleMetadata.slug}.json`) {
    return { ...heatArticleMetadata, ...heatArticleBody };
  }

  const raw = readFileSync(join(ARTICLES_DIR, file), "utf-8");
  // 一部のファイルに付いている UTF-8 BOM を除去してから読み込む。
  const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(stripped) as Article;
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
  const articles = entries.map((file) => ({
    ...readArticle(file),
    author: {
      name: "安全AIポータル編集部",
      url: "https://www.anzen-ai-portal.jp/about/project-story",
    },
  }));
  cached = articles;
  return articles;
}

/**
 * 隔離中・確認待ち・時限公開前を除いた記事を返す。
 */
export function getPublishedArticles(now = new Date()): Article[] {
  return loadAll()
    .filter((a) => isArticlePublished(a, now))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * 一覧・サイトマップに掲載できる公開済み記事のインデックスを返す。
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
 * slug → 公開済み記事を取得。未公開または存在しない場合 null。
 */
export function getPublishedArticleBySlug(slug: string, now = new Date()): Article | null {
  const article = loadAll().find((a) => a.slug === slug);
  return article && isArticlePublished(article, now) ? article : null;
}

/**
 * sitemap や generateStaticParams 向けの公開済み slug 一覧
 */
export function getPublishedArticleSlugs(now = new Date()): string[] {
  return getPublishedArticles(now).map((a) => a.slug);
}
