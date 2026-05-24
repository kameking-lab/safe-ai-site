/**
 * 構造化条文 DB（article-registry）
 *
 * Phase 1a で導入。 既存の allLawArticles（@/data/laws）+ LAW_METADATA を
 * 入力として、Phase 2（ハルシネーション絶滅 3 層）／Phase 3（Fallback）／
 * Phase 4（通達 URL 添付）で共通利用される照合用 DB を構築する。
 *
 * 設計方針:
 * - 既存 LawArticle 配列を一次データソースとし、本ファイルは派生ビューを構築する
 *   だけで、条文本文・キーワード等の重複保持は行わない。
 * - 法令短縮名は LAW_METADATA を優先。 該当しない場合は LawArticle の lawShort を
 *   そのまま使う。
 * - 条文番号は漢数字／算用数字／枝番／項／号のゆらぎを正規化キー
 *   （article-number-normalize.ts）で畳み込み、表記ゆれを跨いだ検出を可能にする。
 * - eGov 安定 URL は LAW_METADATA.eGovUrl に conditional fragment（#Mp-At_第○条）
 *   を追加して per-article ソース URL を生成する。
 *
 * 主な API:
 * - registryStats(): 法令数・条文数の集計
 * - hasArticle(lawShort, articleNum): 完全一致判定
 * - lookupArticle(lawShort, articleNum): 構造化エントリ取得
 * - lookupByKey(key): 正規化キー → LawArticle 取得
 * - getAllowedReferenceKeys(): 全許可参照キーの Set（Phase 2 ホワイトリスト用）
 * - getRegistryEntries(): 全エントリ一覧（イテレーション用）
 * - getArticlesByLawShort(lawShort): 当該法令の全エントリ
 */

import { allLawArticles, LAW_METADATA, type LawArticle } from "@/data/laws";
import {
  canonicalArticleLabel,
  normalizeArticleNumToKey,
  parseArticleNum,
  type ArticleRef,
} from "@/lib/article-number-normalize";

export type ArticleRegistryEntry = {
  /** 元 LawArticle への参照（不変） */
  source: LawArticle;
  /** 法令短縮名（lawShort） */
  lawShort: string;
  /** 法令正式名（law または LAW_METADATA.fullName） */
  lawFullName: string;
  /** 条文番号（元表記） */
  rawArticleNum: string;
  /** 構造化条文参照（正規化済み） */
  ref: ArticleRef | undefined;
  /** 正規化キー（lawShort|article-branch-paragraph-item） */
  key: string;
  /** e-Gov 法令検索の安定 URL（per-article。法令ルート URL+アンカー） */
  sourceUrl: string | undefined;
  /** 条文タイトル */
  articleTitle: string;
};

/**
 * 法令短縮名 + 条文番号の正規化キーを生成。
 * lookup の主キーとして使う。
 */
function buildKey(lawShort: string, articleNumKey: string): string {
  return `${lawShort}|${articleNumKey}`;
}

/**
 * 法令メタデータから per-article URL を組み立てる。
 *
 * e-Gov の現行 URL スキーム（laws.e-gov.go.jp/law/<lawId>）にはフラグメント
 * アンカーがあり、`#Mp-At_第N条` の形式で個別条文ジャンプができる場合が多い。
 * ただし全法令で安定動作が保証されているわけではないため、フラグメントは
 * append のみ行い、ベース URL は LAW_METADATA.eGovUrl をそのまま尊重する。
 *
 * mhlw.go.jp ドメインの指針 PDF など、eGov 形式でない URL の場合は
 * フラグメントを付けずベース URL のみ返す。
 */
function buildSourceUrl(
  baseUrl: string | undefined,
  ref: ArticleRef | undefined
): string | undefined {
  if (!baseUrl) return undefined;
  if (!ref) return baseUrl;
  if (!baseUrl.startsWith("https://laws.e-gov.go.jp/")) return baseUrl;
  const label = canonicalArticleLabel(ref);
  return `${baseUrl}#Mp-At_${encodeURIComponent(label)}`;
}

let cachedRegistry: ArticleRegistryEntry[] | null = null;
let cachedKeyIndex: Map<string, ArticleRegistryEntry> | null = null;
let cachedLawIndex: Map<string, ArticleRegistryEntry[]> | null = null;
let cachedAllowedRefs: Set<string> | null = null;

function buildRegistry(): {
  entries: ArticleRegistryEntry[];
  byKey: Map<string, ArticleRegistryEntry>;
  byLaw: Map<string, ArticleRegistryEntry[]>;
} {
  const entries: ArticleRegistryEntry[] = [];
  const byKey = new Map<string, ArticleRegistryEntry>();
  const byLaw = new Map<string, ArticleRegistryEntry[]>();

  for (const source of allLawArticles) {
    const ref = parseArticleNum(source.articleNum);
    const articleKey = ref
      ? normalizeArticleNumToKey(source.articleNum) ?? source.articleNum
      : source.articleNum;
    const meta = LAW_METADATA[source.lawShort];
    const baseUrl = meta?.eGovUrl;
    const entry: ArticleRegistryEntry = {
      source,
      lawShort: source.lawShort,
      lawFullName: meta?.fullName ?? source.law,
      rawArticleNum: source.articleNum,
      ref,
      key: buildKey(source.lawShort, articleKey),
      sourceUrl: buildSourceUrl(baseUrl, ref),
      articleTitle: source.articleTitle,
    };
    entries.push(entry);

    // 1つの key に複数 entry が衝突する場合（同一条文の重複登録など）は
    // 先勝ちで保存し、後続は登録しない。 監査ツールで衝突を可視化する。
    if (!byKey.has(entry.key)) {
      byKey.set(entry.key, entry);
    }
    const lawBucket = byLaw.get(source.lawShort);
    if (lawBucket) {
      lawBucket.push(entry);
    } else {
      byLaw.set(source.lawShort, [entry]);
    }
  }

  return { entries, byKey, byLaw };
}

function ensureBuilt() {
  if (cachedRegistry === null) {
    const built = buildRegistry();
    cachedRegistry = built.entries;
    cachedKeyIndex = built.byKey;
    cachedLawIndex = built.byLaw;
    cachedAllowedRefs = new Set(built.entries.map((e) => e.key));
  }
}

/** 全エントリを返す（イテレーション用、変更不可）。 */
export function getRegistryEntries(): readonly ArticleRegistryEntry[] {
  ensureBuilt();
  return cachedRegistry!;
}

/** 法令短縮名で索引した全エントリ。 */
export function getArticlesByLawShort(
  lawShort: string
): readonly ArticleRegistryEntry[] {
  ensureBuilt();
  return cachedLawIndex!.get(lawShort) ?? [];
}

/**
 * Phase 2 用ホワイトリスト：許可された (lawShort|articleKey) の Set。
 * 応答内で抽出された参照がこの Set に含まれなければ「架空条文」扱い。
 */
export function getAllowedReferenceKeys(): ReadonlySet<string> {
  ensureBuilt();
  return cachedAllowedRefs!;
}

/** 正規化キー（lawShort|articleKey）で直接取得。 */
export function lookupByKey(key: string): ArticleRegistryEntry | undefined {
  ensureBuilt();
  return cachedKeyIndex!.get(key);
}

/**
 * 法令短縮名 + 条文番号文字列での lookup。
 * 表記ゆれ（漢数字／枝番／項／号）は正規化キー経由で吸収する。
 */
export function lookupArticle(
  lawShort: string,
  articleNum: string
): ArticleRegistryEntry | undefined {
  ensureBuilt();
  const articleKey = normalizeArticleNumToKey(articleNum);
  if (!articleKey) return undefined;
  return cachedKeyIndex!.get(buildKey(lawShort, articleKey));
}

/** 完全一致判定の便利ラッパ。 */
export function hasArticle(lawShort: string, articleNum: string): boolean {
  return lookupArticle(lawShort, articleNum) !== undefined;
}

/** 集計情報（監査・テスト用） */
export type RegistryStats = {
  totalArticles: number;
  uniqueLaws: number;
  duplicateKeys: number;
  articlesWithoutSourceUrl: number;
  articlesWithoutMetadata: number;
};

export function registryStats(): RegistryStats {
  ensureBuilt();
  const entries = cachedRegistry!;
  let dupes = 0;
  const seen = new Set<string>();
  let noSource = 0;
  let noMeta = 0;
  for (const e of entries) {
    if (seen.has(e.key)) dupes++;
    else seen.add(e.key);
    if (!e.sourceUrl) noSource++;
    if (!LAW_METADATA[e.lawShort]) noMeta++;
  }
  return {
    totalArticles: entries.length,
    uniqueLaws: cachedLawIndex!.size,
    duplicateKeys: dupes,
    articlesWithoutSourceUrl: noSource,
    articlesWithoutMetadata: noMeta,
  };
}

/**
 * テスト・スクリプト用：内部キャッシュを破棄して次回呼出で再構築させる。
 * 通常コードからは呼ばない。
 */
export function _resetRegistryForTest() {
  cachedRegistry = null;
  cachedKeyIndex = null;
  cachedLawIndex = null;
  cachedAllowedRefs = null;
}
