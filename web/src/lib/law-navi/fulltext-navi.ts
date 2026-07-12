/**
 * 法令ナビ 全文層エントリ（FT-D2 表示統合）。**server / ビルド専用**。
 *
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2・§5-3。
 *
 * 役割: FT-D1 で取り込んだ全文スナップショット層（laws-fulltext）を法令ナビの
 * 表示・URL 生成へ橋渡しする。表示の正本解決順は **fulltext > curated ではなく
 * curated > fulltext**（＝既存 curated 条を正本に据え置き、全文は curated に無い条の
 * ギャップだけを埋める）。これにより:
 *   - 既存 717 URL は 1 件も変わらない（追加のみ・§5-2「既存712 URL は不変」）。
 *   - curated 条の表示本文・plain 鮮度・itemNumberMap 等の付加価値が一切後退しない
 *     （plain の sourceTextHash は curated 抄録に対して計算されているため、curated 条を
 *      全文本文へ差し替えると全 stale する。差し替えず据え置くことで stale 増分 0）。
 *
 * 【クライアントバンドル不可侵】本モジュールは loader.ts（server-only・dynamic import）
 * 経由でのみ全文 JSON を読む。Server Component / Route Handler / generateStaticParams
 * からのみ import すること（クライアントコンポーネントから import しない）。
 */
import { LAW_METADATA } from "@/data/law-metadata";
import type { LawArticle } from "@/data/laws";
import {
  FULLTEXT_LAW_IDS,
  loadFulltextLaw,
} from "@/lib/laws-fulltext/loader";
import type { FulltextArticle } from "@/lib/laws-fulltext/types";
import { LAW_NAVI_ENTRIES, type LawNaviEntry } from "@/lib/law-navi/permalink";

/**
 * sortKey → artSlug。全階層の枝番を保持する（"第34条の2の3" → "34-2-3"）。
 * 共有の articleNumToSlug（parseArticleNum 由来）は枝を 1 段しか持たず多段枝番を潰すため
 * （"第34条の2の7" → "34-2"）、全文層は sortKey（[条,枝1,枝2,…]）を正本に slug 化する。
 * curated と共有する単段の条・枝番では両者が一致する（"第577条の2" → "577-2"）。
 */
export function fulltextArtSlug(sortKey: readonly number[]): string {
  return sortKey.join("-");
}

/** caption（"（見出し）"）の外側全角括弧を外して curated の articleTitle 表記に合わせる。 */
function captionToTitle(caption: string): string {
  const t = caption.trim();
  const m = /^（([\s\S]*)）$/.exec(t);
  return m ? m[1] : t;
}

/** egovLawId → { lawShort, fullName }（LAW_METADATA 逆引き）。 */
const META_BY_EGOV: ReadonlyMap<string, { lawShort: string; fullName: string }> = (() => {
  const map = new Map<string, { lawShort: string; fullName: string }>();
  for (const m of Object.values(LAW_METADATA)) {
    if (m.egovLawId) map.set(m.egovLawId, { lawShort: m.lawShort, fullName: m.fullName });
  }
  return map;
})();

/** 全文由来の法令ナビエントリ（LawNaviEntry 互換＋元 FulltextArticle・出典情報）。 */
export type FulltextNaviEntry = LawNaviEntry & {
  /** 全文由来であることの明示（curated と識別）。seo-gate は curated=false と評価する。 */
  readonly origin: "fulltext";
  /** 「削除」条か（欠番ではなく削除条として明示採録）。 */
  readonly isDeleted: boolean;
  /** 元の全文条（paragraphs 等の描画に使う）。 */
  readonly fulltextArticle: FulltextArticle;
  /** e-Gov 履歴 ID（出典表示・取得日）。 */
  readonly revisionId: string;
};

// 法令単位のメモ化（ビルド SSG で多数ページが同一法令を引くため）。
const gapCache = new Map<string, FulltextNaviEntry[]>();

/**
 * 指定 egovLawId の「全文由来のみ（curated に無い）」ギャップ充填エントリを返す。
 *
 * dual-exclusion（二重除外）で既存 URL を保護する:
 *   1. articleNum が curated 収録済み → 除外（既存 curated 条が正本・URL 不変）。
 *   2. slug が curated に占有済み → 除外（例: "第34条の2" の slug "34-2" は
 *      legacy の articleNumToSlug バグで "第34条の2の7" が既に占有している。既存 URL を
 *      壊さないため、占有された slug には全文ページを作らない）。
 * → 追加のみ・slug 衝突ゼロ・同一条の二重 URL ゼロ。除外された条は listGapSkipped で可視化。
 */
export async function getFulltextNaviEntries(egovLawId: string): Promise<FulltextNaviEntry[]> {
  const cached = gapCache.get(egovLawId);
  if (cached) return cached;

  const meta = META_BY_EGOV.get(egovLawId);
  const law = await loadFulltextLaw(egovLawId);
  if (!law || !meta) {
    gapCache.set(egovLawId, []);
    return [];
  }

  const curatedForLaw = LAW_NAVI_ENTRIES.filter((e) => e.egovLawId === egovLawId);
  const curatedArticleNums = new Set(curatedForLaw.map((e) => e.article.articleNum));
  const curatedSlugs = new Set(curatedForLaw.map((e) => e.artSlug));

  const out: FulltextNaviEntry[] = [];
  for (const fa of law.articles) {
    if (curatedArticleNums.has(fa.articleNum)) continue;
    const artSlug = fulltextArtSlug(fa.sortKey);
    if (curatedSlugs.has(artSlug)) continue;
    const article: LawArticle = {
      law: meta.fullName,
      lawShort: meta.lawShort,
      articleNum: fa.articleNum,
      articleTitle: captionToTitle(fa.caption),
      text: fa.text,
      keywords: [],
    };
    out.push({
      article,
      egovLawId,
      artSlug,
      path: `/law-navi/${egovLawId}/${artSlug}`,
      origin: "fulltext",
      isDeleted: fa.isDeleted,
      fulltextArticle: fa,
      revisionId: law.revisionId,
    });
  }
  gapCache.set(egovLawId, out);
  return out;
}

/**
 * 全文収載されているが slug 占有で法令ナビページを持てない条（黙って欠かさない記録）。
 * 現状は "第34条の2"（slug "34-2" が legacy の "第34条の2の7" に占有）のみ。
 */
export async function listGapSkipped(
  egovLawId: string,
): Promise<{ articleNum: string; slug: string; heldBy: string }[]> {
  const law = await loadFulltextLaw(egovLawId);
  if (!law) return [];
  const curatedForLaw = LAW_NAVI_ENTRIES.filter((e) => e.egovLawId === egovLawId);
  const curatedArticleNums = new Set(curatedForLaw.map((e) => e.article.articleNum));
  const slugToArticle = new Map(curatedForLaw.map((e) => [e.artSlug, e.article.articleNum]));
  const skipped: { articleNum: string; slug: string; heldBy: string }[] = [];
  for (const fa of law.articles) {
    if (curatedArticleNums.has(fa.articleNum)) continue;
    const slug = fulltextArtSlug(fa.sortKey);
    const heldBy = slugToArticle.get(slug);
    if (heldBy) skipped.push({ articleNum: fa.articleNum, slug, heldBy });
  }
  return skipped;
}

/** 全 fulltext 法令のギャップ充填エントリ（generateStaticParams・sitemap 用）。 */
export async function getAllFulltextNaviEntries(): Promise<FulltextNaviEntry[]> {
  const all: FulltextNaviEntry[] = [];
  for (const id of FULLTEXT_LAW_IDS) {
    all.push(...(await getFulltextNaviEntries(id)));
  }
  return all;
}

/** slug → 全文由来エントリ（ページ解決用。curated 優先解決の後に呼ぶ）。 */
export async function resolveFulltextNaviEntry(
  egovLawId: string,
  artSlug: string,
): Promise<FulltextNaviEntry | undefined> {
  const entries = await getFulltextNaviEntries(egovLawId);
  return entries.find((e) => e.artSlug === artSlug);
}

/** 前後条ナビの 1 リンク（実条連続・canonical ページへ着地）。 */
export type ReadingOrderLink = {
  readonly path: string;
  readonly articleNum: string;
  readonly articleTitle: string;
};

// 法令単位の「実条 reading order」メモ化。
const orderCache = new Map<string, ReadingOrderLink[]>();

/**
 * fulltext 法令の実条連続の並び（sortKey 昇順）を、各条の canonical ページへ解決した配列。
 * 各条は curated ページ（あれば正本）→ 無ければ全文ギャップページへ着地する。
 * slug 占有でページを持てない条（第34条の2）は並びから除く（着地先が無いため）。
 * これを使うのは全文ギャップページの前後ナビのみ（既存 curated ページの前後ナビは不変）。
 */
async function getReadingOrder(egovLawId: string): Promise<ReadingOrderLink[]> {
  const cached = orderCache.get(egovLawId);
  if (cached) return cached;
  const law = await loadFulltextLaw(egovLawId);
  if (!law) {
    orderCache.set(egovLawId, []);
    return [];
  }
  const curatedForLaw = LAW_NAVI_ENTRIES.filter((e) => e.egovLawId === egovLawId);
  const curatedByNum = new Map(curatedForLaw.map((e) => [e.article.articleNum, e]));
  const gap = await getFulltextNaviEntries(egovLawId);
  const gapByNum = new Map(gap.map((e) => [e.article.articleNum, e]));

  const order: ReadingOrderLink[] = [];
  for (const fa of law.articles) {
    const curated = curatedByNum.get(fa.articleNum);
    if (curated) {
      order.push({
        path: curated.path,
        articleNum: curated.article.articleNum,
        articleTitle: curated.article.articleTitle,
      });
      continue;
    }
    const g = gapByNum.get(fa.articleNum);
    if (g) {
      order.push({ path: g.path, articleNum: g.article.articleNum, articleTitle: g.article.articleTitle });
    }
    // curated でも gap でも無い（slug 占有の第34条の2）は着地先が無いので並びから除外。
  }
  orderCache.set(egovLawId, order);
  return order;
}

/** 実条連続の前後リンク（全文ギャップページ用）。端は undefined。 */
export async function adjacentReadingOrder(
  egovLawId: string,
  articleNum: string,
): Promise<{ prev?: ReadingOrderLink; next?: ReadingOrderLink }> {
  const order = await getReadingOrder(egovLawId);
  const idx = order.findIndex((o) => o.articleNum === articleNum);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? order[idx - 1] : undefined,
    next: idx < order.length - 1 ? order[idx + 1] : undefined,
  };
}
