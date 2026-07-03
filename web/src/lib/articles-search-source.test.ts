import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  ARTICLE_SEARCH_ENTRIES,
  getPublishedArticleSearchEntries,
} from "./articles-search-source";

// このモジュールは横断検索(client)へ法改正記事を供給する **ブラウザ安全な静的 import 源**。
// 静的 import は列挙を自動追従しないため、data班が src/data/articles/*.json を追加/改名/削除
// すると本リストがドリフトする。以下の drift ガードは Node 環境（vitest）で実在ファイル集合と
// 本リストの slug 集合の一致を機械固定し、他班の記事追加を「横断検索へ結線し忘れる穴」を
// CI で発見性側へ強制する（sitemap ゴーストURL回帰ガードと同方針）。

const ARTICLES_DIR = join(process.cwd(), "src", "data", "articles");

function readArticleSlugsFromDisk(): string[] {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = readFileSync(join(ARTICLES_DIR, f), "utf-8");
      const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      return (JSON.parse(stripped) as { slug: string }).slug;
    });
}

describe("articles-search-source — 実在記事ファイルとのドリフト固定", () => {
  it("静的 import した slug 集合が src/data/articles/*.json の実在集合と完全一致する（追加/削除/改名の取り残しを検知）", () => {
    const onDisk = new Set(readArticleSlugsFromDisk());
    const inSource = new Set(ARTICLE_SEARCH_ENTRIES.map((a) => a.slug));
    // 双方向一致＝実在するのに未収載（発見性の穴）／収載したのに実在しない（幽霊）を両方検知
    expect(inSource).toEqual(onDisk);
    // 非空虚性（実データの存在サニティ）
    expect(inSource.size).toBeGreaterThanOrEqual(10);
  });

  it("slug は重複せず、索引フィールドが揃っている（本文フィールドは含まない軽量射影）", () => {
    const slugs = ARTICLE_SEARCH_ENTRIES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of ARTICLE_SEARCH_ENTRIES) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(a.tags)).toBe(true);
      expect(Array.isArray(a.keywords)).toBe(true);
      // 本文（sections/sources 等）はバンドルに乗せない＝軽量射影である
      expect(a).not.toHaveProperty("sections");
      expect(a).not.toHaveProperty("sources");
    }
  });

  it("getPublishedArticleSearchEntries は時限公開（publishedAt が未来）を除外する", () => {
    // 全記事が過去日で公開済みなら全件返る（現行データ）。
    const allPublished = getPublishedArticleSearchEntries(new Date("2999-12-31"));
    expect(allPublished.length).toBe(ARTICLE_SEARCH_ENTRIES.length);
    // 全記事より前の基準日では 1 件も公開されない（未来公開の除外ロジックが効くこと）。
    const earliest = getPublishedArticleSearchEntries(new Date("2000-01-01"));
    expect(earliest.length).toBe(0);
  });
});
