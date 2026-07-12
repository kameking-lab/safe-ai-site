/**
 * 全文スナップショット層の型定義。
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §3-2。
 *
 * データ本体は web/src/data/laws-fulltext/<lawId>.json（機械生成・手書き禁止）。
 * 生成は web/scripts/etl/egov-fulltext-fetch.ts。読み手は loader.ts（server-only）のみ。
 */

export type FulltextItem = {
  /** 号番号。漢数字表記（"一","八の二"）＝ curated の itemNumberMap キーと同一規約 */
  num: string;
  /** 号本文（細別 Subitem を平文化して連結） */
  text: string;
};

export type FulltextParagraph = {
  /** 項番号（1 起点） */
  num: number;
  /** 項本文（号より前の導入文。項見出しがあれば先頭に付す） */
  text: string;
  /** 号（あれば） */
  items?: FulltextItem[];
};

export type FulltextArticle = {
  /** 当サイト正規表記（"第151条の2"）。e-Gov XML の Num 属性から正規化 */
  articleNum: string;
  /** 条見出し。無い条は "" */
  caption: string;
  /** 「削除」条。本文 "削除" のまま採録し UI で明示（欠番にしない） */
  isDeleted: boolean;
  /** 項の構造（AI 文脈・将来の項単位 plain に備える） */
  paragraphs: FulltextParagraph[];
  /** 表示用フラット本文（項番号・号マーカー保持） */
  text: string;
  /** [条, 枝1, 枝2] — 連番検証・前後条ナビの整列キー */
  sortKey: number[];
};

export type FulltextLaw = {
  /** e-Gov 法令番号（例 347M50002000032） */
  lawId: string;
  /** e-Gov 返却の正式名（LAW_METADATA.fullName と突合） */
  lawTitle: string;
  /** e-Gov 履歴 ID（lawId プレフィックス除去。例 20260701_506M60000100079） */
  revisionId: string;
  /** 取得時刻（ISO）。diff 比較・sha256 からは除外 */
  fetchedAt: string;
  /** 出典文字列（政府標準利用規約2.0） */
  source: string;
  /** articles の正規化直列化のハッシュ（改ざん・差分検知アンカー） */
  sha256: string;
  /** 収載条数（範囲削除条を個別展開した後の総数） */
  articleCount: number;
  /** 除去した <Rt>（ルビ読み）件数（黙った変形をしない記録） */
  rubyStripped: number;
  /** 取得不能条の明示（黙って欠かさない） */
  skipped: { articleNum: string; reason: string }[];
  /**
   * 別表(AppdxTable)の題名一覧（e-Gov 掲載の生表記。例 "別表第三"・"別表第六の二"）。
   * 設計書 §3-3: 別表本文は取込対象外（既存 beppyo 意味索引・anei-beppyo-snapshot が正本）。
   * ここでは題名だけを機械採録し、beppyo.ts の網羅性チェック（未収載別表の検出・
   * 幽霊別表の混入検出）に使う。別表を条文ページ化はしない（法令ナビ表示と二重化させない）。
   * 別表を持たない法令では空配列。
   */
  appdxTables?: string[];
  articles: FulltextArticle[];
};
