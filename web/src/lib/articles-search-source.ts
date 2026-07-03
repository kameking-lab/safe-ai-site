// 法改正記事（src/data/articles/*.json）のブラウザ安全な横断検索インデックス源。
//
// なぜこのモジュールが要るか:
//   正本 `@/lib/articles` の getPublishedArticleIndex は `node:fs`（readdirSync/
//   readFileSync）でディレクトリを走査するため **ブラウザ非安全**で、client 側の
//   横断検索インデックス（search-index.ts → CommandPalette は 'use client'）からは
//   import できない。そのため法改正記事は /articles 一覧と sitemap-articles.xml には
//   載っているのに、横断検索(/search・⌘K)から丸ごと 0 件ヒットだった（site-critique
//   01-seo-technical S-1「法改正記事という検索需要のあるコンテンツ枠が丸ごと死んでいる」）。
//
// 方式:
//   各 JSON を静的 import（fs 非依存＝ブラウザ安全）し、検索に必要な軽量フィールドだけを
//   射影する。JSON import は本文（sections）も含むが、本モジュールは search-index.ts から
//   **動的 import される**ため遅延検索チャンク側にのみ載り、メインバンドルは肥大しない
//   （court-cases 全件・compact.json 919 物質等を既に遅延ロードしている同じチャンク）。
//
// ドリフト防止:
//   静的 import は列挙を自動追従しない＝data班が 11 本目の記事 JSON を追加すると本リストが
//   取り残される。これを `articles-search-source.test.ts` の drift ガードで機械検知する
//   （テストは Node 環境なので readdirSync で実在ファイル集合と本 SLUG 集合の一致を固定）。
//   ＝sitemap ゴーストURL回帰ガードと同じ「他班の追加を CI で発見性へ強制結線する」方針。

import chemicalRaMandatorySubstances from "@/data/articles/chemical-ra-mandatory-substances.json";
import elearningTokubetsu12Types from "@/data/articles/elearning-tokubetsu-12-types.json";
import fallPreventionChecklistConstruction from "@/data/articles/fall-prevention-checklist-construction.json";
import freelanceRosai2024 from "@/data/articles/freelance-rosai-2024.json";
import fullharness2022Revision from "@/data/articles/fullharness-2022-revision.json";
import heatStroke2025Mandatory from "@/data/articles/heat-stroke-2025-mandatory.json";
import kyPaperlessImplementation from "@/data/articles/ky-paperless-implementation.json";
import scaffold3rdRail2024 from "@/data/articles/scaffold-3rd-rail-2024.json";
import stressCheck50Employee from "@/data/articles/stress-check-50-employee.json";
import vibrationIsohazardForestry from "@/data/articles/vibration-isohazard-forestry.json";

/** 記事本文（sections/sources 等）を除いた検索用の軽量射影。 */
export interface ArticleSearchEntry {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  lastReviewedAt: string;
  tags: string[];
  keywords: string[];
}

// JSON import の生の型（本文フィールドは検索で使わないため索引フィールドのみ受ける）。
interface RawArticle {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  lastReviewedAt: string;
  tags?: string[];
  keywords?: string[];
}

const RAW_ARTICLES: RawArticle[] = [
  chemicalRaMandatorySubstances,
  elearningTokubetsu12Types,
  fallPreventionChecklistConstruction,
  freelanceRosai2024,
  fullharness2022Revision,
  heatStroke2025Mandatory,
  kyPaperlessImplementation,
  scaffold3rdRail2024,
  stressCheck50Employee,
  vibrationIsohazardForestry,
];

/**
 * 検索インデックス用の全記事エントリ（本文除外の軽量射影）。
 * 時限公開（publishedAt が未来）の除外は search-index.ts 側の実行時 now で行う
 * （正本 getPublishedArticles と同じセマンティクス）。
 */
export const ARTICLE_SEARCH_ENTRIES: ArticleSearchEntry[] = RAW_ARTICLES.map((a) => ({
  slug: a.slug,
  title: a.title,
  description: a.description,
  publishedAt: a.publishedAt,
  lastReviewedAt: a.lastReviewedAt,
  tags: a.tags ?? [],
  keywords: a.keywords ?? [],
}));

/** publishedAt が now 以下（＝公開済み）のエントリのみを返す。 */
export function getPublishedArticleSearchEntries(now: Date = new Date()): ArticleSearchEntry[] {
  const nowMs = now.getTime();
  return ARTICLE_SEARCH_ENTRIES.filter((a) => {
    const pub = new Date(a.publishedAt).getTime();
    return !Number.isNaN(pub) && pub <= nowMs;
  });
}
