/**
 * 全文スナップショット層のローダー（サーバー/ビルド専用）。
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §2-2(2)・§3-1。
 *
 * 【クライアントバンドル不可侵】
 * 全文（安衛則だけで curated の約7倍）を `allLawArticles` のようにクライアントへ
 * import すると初回 JS・sw.js プリキャッシュ・LCP が確実に劣化する。
 * よって本モジュールは:
 *   - 法令単位の JSON を「動的 import」でのみ読む（静的 import しない）。
 *     → webpack/turbopack は各法令 JSON を別チャンク化し、呼んだ経路だけに載る。
 *   - Server Component / Route Handler / ビルドスクリプトからのみ呼ぶ。
 *     クライアントコンポーネントから import しないこと（`server-only` パッケージは
 *     本リポジトリ未導入のため、規約＝doc とレビューで担保する。supabase/server.ts と同方針）。
 *
 * curated（`allLawArticles`）とは独立。RAG / クライアント横断検索の母集団は
 * 現行どおり curated のまま（本層は表示本文・条番号カバレッジの正本）。
 */

import type { FulltextArticle, FulltextLaw } from "./types";
import { normalizeFullwidthAlnum, normalizeKanjiNumbers } from "../article-number-normalize";

/** 全文層に収載済みの法令 ID。ここに無い lawId は fulltext 非対応（curated へフォールバック）。 */
export const FULLTEXT_LAW_IDS = ["347M50002000032"] as const;

export type FulltextLawId = (typeof FULLTEXT_LAW_IDS)[number];

export function hasFulltext(lawId: string): lawId is FulltextLawId {
  return (FULLTEXT_LAW_IDS as readonly string[]).includes(lawId);
}

// 法令 JSON の動的ローダー表。静的 import を避けるため関数で包む。
const LOADERS: Record<FulltextLawId, () => Promise<{ default: FulltextLaw }>> = {
  "347M50002000032": () =>
    import("../../data/laws-fulltext/347M50002000032.json") as Promise<{ default: FulltextLaw }>,
};

// 同一プロセス内での再読込を避ける軽量キャッシュ（ビルド時 SSG で多数条を引くため）。
const cache = new Map<string, FulltextLaw>();

/** 法令全文を読む。未収載なら null。 */
export async function loadFulltextLaw(lawId: string): Promise<FulltextLaw | null> {
  if (!hasFulltext(lawId)) return null;
  const cached = cache.get(lawId);
  if (cached) return cached;
  const mod = await LOADERS[lawId]();
  const law = mod.default;
  cache.set(lawId, law);
  return law;
}

/**
 * 条番号（"第577条の2" 等の表記ゆれ可）で1条を解決。未収載法令・存在しない条は null。
 * parseArticleNum で正規化キー化して突合するため "第577条の2"・"577条の2"・
 * 漢数字混在いずれでも解決できる（＝データ層で解決できる、の実体）。
 */
export async function resolveFulltextArticle(
  lawId: string,
  articleNum: string,
): Promise<FulltextArticle | null> {
  const law = await loadFulltextLaw(lawId);
  if (!law) return null;
  const target = keyOf(articleNum);
  if (!target) return null;
  for (const a of law.articles) {
    if (keyOf(a.articleNum) === target) return a;
  }
  return null;
}

/**
 * 条番号 → [条, 枝…] を "-" で連結した正規化キー（項/号は捨てる）。
 * 枝番を全階層で保持する（第34条の2の3 と 第34条の2 を区別）。
 * 共有の parseArticleNum は枝を1段しか持たないため、ここでは全文層専用に全階層を扱う。
 * kanji/全角/半角の表記ゆれは共有の正規化関数で吸収する。
 */
function keyOf(articleNum: string): string | null {
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(articleNum));
  const m = /^第?([0-9]+)条((?:の[0-9]+)*)/.exec(norm);
  if (!m) return null;
  const parts = [m[1]];
  if (m[2]) for (const b of m[2].split("の").filter(Boolean)) parts.push(b);
  return parts.join("-");
}

/** 収載条番号の一覧（表示ページの generateStaticParams 用）。 */
export async function listFulltextArticleNums(lawId: string): Promise<string[]> {
  const law = await loadFulltextLaw(lawId);
  return law ? law.articles.map((a) => a.articleNum) : [];
}
