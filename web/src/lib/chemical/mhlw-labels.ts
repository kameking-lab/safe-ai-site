/**
 * 厚労省化学物質DBの表示用ラベル・バッジ定数と小関数（データ非同梱の小モジュール）
 *
 * mhlw-chemicals.ts（巨大JSON同梱）から分離（2026-07-11）。クライアントコンポーネントは
 * こちらを import することでバンドルに全量データを引き込まない。
 * 既存 import 互換のため mhlw-chemicals.ts からも再輸出される。
 */
import type { MhlwChemicalCategory, LimitSource, IarcGroup, MergedChemical } from "../mhlw-chemicals";

export const CATEGORY_LABELS_JA: Record<MhlwChemicalCategory, string> = {
  carcinogenic: "がん原性物質",
  concentration: "濃度基準値",
  skin: "皮膚等障害",
  label_sds: "SDS交付義務",
  other: "その他",
};

export const CATEGORY_BADGE: Record<MhlwChemicalCategory, string> = {
  carcinogenic: "bg-rose-100 text-rose-800 border-rose-200",
  concentration: "bg-amber-100 text-amber-800 border-amber-200",
  skin: "bg-blue-100 text-blue-800 border-blue-200",
  label_sds: "bg-emerald-100 text-emerald-800 border-emerald-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

/** カテゴリ → 関連法令の概要 */
export const CATEGORY_TO_LAW: Record<MhlwChemicalCategory, string> = {
  label_sds: "労働安全衛生法 第57条・第57条の2（ラベル表示・SDS交付義務）",
  concentration: "労働安全衛生規則 第577条の2（濃度基準値）",
  skin: "労働安全衛生規則 第594条の2・第594条の3（皮膚等障害化学物質等）",
  carcinogenic: "労働安全衛生規則 第577条の2 第3項（がん原性物質 記録30年保存）",
  other: "",
};

/** UI 表示用ラベル: 出典タグ → 短縮ラベル */
export const SOURCE_LABEL: Record<string, string> = {
  MHLW_177: "厚労告示第177号",
  IARC: "IARC",
  GHS_MHLW: "国GHS分類",
};

/** UI 表示用バッジ色 */
export const SOURCE_BADGE: Record<string, string> = {
  MHLW_177: "bg-amber-100 text-amber-900 border-amber-200",
  IARC: "bg-rose-100 text-rose-900 border-rose-200",
  GHS_MHLW: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

/** フラット source フィールド用ラベル */
export const PRIMARY_SOURCE_LABEL: Record<LimitSource, string> = {
  mhlw: "公式（厚労告示）",
  reference: "参考値（数値非収録）",
};

/** フラット source フィールド用バッジ色 */
export const PRIMARY_SOURCE_BADGE: Record<LimitSource, string> = {
  mhlw: "bg-amber-100 text-amber-900 border-amber-300",
  reference: "bg-slate-100 text-slate-700 border-slate-200",
};

/** 公式参照リンクのラベル(数値は非収録) */
export const EXTERNAL_REF_LABEL = {
  acgih: "ACGIH公式参照",
  jsoh: "JSOH公式参照",
} as const;

/** v2: IARC 分類の表示色 */
export const IARC_BADGE: Record<IarcGroup, string> = {
  "1": "bg-rose-200 text-rose-900 border-rose-300",
  "2A": "bg-orange-100 text-orange-900 border-orange-300",
  "2B": "bg-amber-100 text-amber-800 border-amber-200",
  "3": "bg-slate-100 text-slate-700 border-slate-200",
};

/** v2: IARC 分類のラベル */
export const IARC_LABEL: Record<IarcGroup, string> = {
  "1": "Group 1（発がん性あり）",
  "2A": "Group 2A（おそらく発がん性）",
  "2B": "Group 2B（発がん性の可能性）",
  "3": "Group 3（分類できない）",
};

/**
 * データ階層バッジ:
 *   - mhlw_177: 国の数値あり(濃度基準値)
 *   - external_only: 国の数値なし、学会公式参照リンクのみ
 *   - reference: 国の数値も学会参照もない、参考値のみ
 *   - none: 数値データなし
 */
export type DataTier = "mhlw_177" | "external_only" | "reference" | "none";

export const TIER_LABEL: Record<DataTier, string> = {
  mhlw_177: "濃度基準値あり",
  external_only: "学会公式参照のみ",
  reference: "参考値",
  none: "数値データなし",
};

export const TIER_BADGE: Record<DataTier, string> = {
  mhlw_177: "bg-amber-100 text-amber-900 border-amber-300",
  external_only: "bg-sky-100 text-sky-900 border-sky-300",
  reference: "bg-slate-100 text-slate-700 border-slate-200",
  none: "bg-slate-50 text-slate-400 border-slate-100",
};

/** 管理濃度（作業環境評価基準告示）と濃度基準値は別物である旨の説明ラベル */
export const MANAGEMENT_VS_LIMIT_DISCLAIMER =
  "※ 「濃度基準値」（安衛則577条の2・告示第177号）と「管理濃度」（作業環境評価基準）は別の指標です。両者の数値が一致する物質もあれば、異なる物質もあります。";

/** カテゴリフラグ → 規制区分のラベル（推定） */
export function regulatoryLabels(flags: MergedChemical["flags"]): string[] {
  const out: string[] = [];
  if (flags.label_sds) out.push("リスクアセスメント対象物（SDS交付義務）");
  if (flags.concentration) out.push("濃度基準値設定物質（自律的管理）");
  if (flags.carcinogenic) out.push("がん原性物質（記録30年保存）");
  if (flags.skin) out.push("皮膚等障害化学物質（不浸透性保護具必要）");
  return out;
}

/** カテゴリフラグ → 関連法令の文字列 */
export function relatedLawTexts(flags: MergedChemical["flags"]): string[] {
  const out: string[] = [];
  if (flags.label_sds) out.push(CATEGORY_TO_LAW.label_sds);
  if (flags.concentration) out.push(CATEGORY_TO_LAW.concentration);
  if (flags.carcinogenic) out.push(CATEGORY_TO_LAW.carcinogenic);
  if (flags.skin) out.push(CATEGORY_TO_LAW.skin);
  return out.filter(Boolean);
}

