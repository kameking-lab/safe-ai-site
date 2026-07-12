/**
 * 法令ナビ 条文ページの SEO ゲート（付加価値条件付き index/sitemap 収載）。
 *
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §5-3。
 *
 * 背景: 全文取込（FT-D1/FT-D2）で law-navi の条文ページが数千規模へ広がると、
 * e-Gov 原文の単純ミラーは thin/duplicate content になり、一括 index 開放は
 * サイト全体の品質評価を毀損しうる。そこで「ページ生成は全条行う（サイト内導線・
 * 前後ナビ・検索着地のため）が、index/sitemap 収載は付加価値のある条のみ」とし、
 * 条件未満は `robots: noindex,follow`＋sitemap 非収載にする（＝防波堤を先に建てる）。
 *
 * 収載可否 = 次のどちらかを満たすこと:
 *
 *   1. 付加価値シグナル（§5-3 の (a)(b)(c)。いずれか1つでも満たせば indexable）:
 *      (a) plain: 検証済み現場ことば版がある（getFreshPlainArticle が返す）
 *      (b) topics: 分野インデックスのメンバー（topicsForArticle が非空）
 *      (c) 注釈シグナル: itemNumberMap（号解説）または glossary マッチ（用語解説）がある
 *
 *   2. curated（人手収録）由来であること＝既収載の後退防止（§5-3 末尾「既収載712条は
 *      現状の収載を維持（後退させない）」）。curated 条は人手で選び keywords・引用整形・
 *      号マップ等の注釈を載せた集合で、e-Gov 原文の単純ミラーではない。全文取込で
 *      LAW_NAVI_ENTRIES が「curated 由来 ∪ fulltext 由来」へ広がっても、fulltext 由来
 *      **のみ**の条（curated に対応の無い生ミラー）が付加価値シグナル無しで流入したときに
 *      限り noindex になる。既存の curated 条は grandfather で常に収載を維持する。
 *
 * 自動昇格: 判定は生成集合 LAW_NAVI_ENTRIES に対して都度計算される純関数なので、
 * plain 執筆・topics 追加・itemNumberMap 採録が進むほど fulltext 由来条の indexable が
 * 自動で増える（「コンテンツで裏づけてから開く」＝収載を後から手で足す必要がない）。
 */
import { allLawArticles, mhlwLawArticles, type LawArticle } from "@/data/laws";
import { getFreshPlainArticle } from "@/data/plain";
import { topicsForArticle } from "@/data/law-navi/topics";
import { matchGlossaryTerms } from "@/lib/law-navi/glossary-match";
import { LAW_NAVI_ENTRIES, type LawNaviEntry } from "@/lib/law-navi/permalink";

/** 付加価値の内訳ラベル（§5-3 の各条件に1対1）。 */
export type ValueAddSignal = "plain" | "topics" | "itemNumberMap" | "glossary";

/** 1条文の付加価値評価。 */
export type ValueAddAssessment = {
  /** index/sitemap 収載してよいか（付加価値シグナル or curated 由来）。 */
  readonly indexable: boolean;
  /** 満たしている付加価値シグナルの内訳（内容ベース。空＝原文ミラーのみ）。 */
  readonly signals: readonly ValueAddSignal[];
  /**
   * curated（人手収録）由来か。true の条は付加価値シグナルが空でも収載を維持する
   * （既収載の後退防止）。fulltext 由来のみの条は false になり、シグナルで判定される。
   */
  readonly curated: boolean;
};

/**
 * curated 条文集合（＝法令ナビの内部深リンクが着地する人手収録集合）。
 * permalink.ts の CURATED と同一定義（allLawArticles − mhlw 補完バンドル）を
 * 参照同一性で保持し、fulltext 由来のみの条（curated に無い生ミラー）と識別する。
 */
const CURATED_SET: ReadonlySet<LawArticle> = (() => {
  const mhlw = new Set<unknown>(mhlwLawArticles);
  return new Set(allLawArticles.filter((a) => !mhlw.has(a)));
})();

/**
 * 条文エントリの付加価値を評価する。§5-3 の (a)(b)(c) と既収載の後退防止（curated 由来）を
 * この1関数に集約し、条文ページ（noindex 判定）・sitemap-laws（収載判定）・テスト（機械固定）が
 * 同一ロジックを参照する（判定の二重管理を作らない＝ドリフト防止）。
 */
export function assessValueAdd(entry: LawNaviEntry): ValueAddAssessment {
  const a = entry.article;
  const signals: ValueAddSignal[] = [];

  // (a) 検証済み現場ことば版（原文ハッシュ一致まで含めた表示可否）
  if (getFreshPlainArticle(entry.egovLawId, a)) signals.push("plain");

  // (b) 分野（topics）メンバー
  if (topicsForArticle(a.lawShort, a.articleNum).length > 0) signals.push("topics");

  // (c-1) 号マップ（人手採録の号解説＝原文ミラーに無い注釈）
  if (a.itemNumberMap && Object.keys(a.itemNumberMap).length > 0) signals.push("itemNumberMap");

  // (c-2) 用語集マッチ（この条文の用語欄が出る＝原文に注釈が付く）
  if (matchGlossaryTerms(a.text).length > 0) signals.push("glossary");

  const curated = CURATED_SET.has(a);
  return { indexable: curated || signals.length > 0, signals, curated };
}

/** 付加価値条件を満たすか（index/sitemap 収載可否の単一判定）。 */
export function isIndexableLawNaviEntry(entry: LawNaviEntry): boolean {
  return assessValueAdd(entry).indexable;
}

/**
 * 収載集合（付加価値条件を満たす条文エントリ）。
 * sitemap-laws.xml の正本＝この集合。生成集合 LAW_NAVI_ENTRIES の部分集合で、
 * 幽霊URL 0（生成集合⊇収載集合⊇解決可能URL）の関係を維持する。
 */
export const INDEXABLE_LAW_NAVI_ENTRIES: readonly LawNaviEntry[] =
  LAW_NAVI_ENTRIES.filter(isIndexableLawNaviEntry);
