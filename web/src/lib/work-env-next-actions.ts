/**
 * 測定対象作業場チェッカーの「次にやること」導出（純関数）
 *
 * target-finder の判定結果から、中小事業者が次に取るべき具体アクション
 * （測定機関への依頼・定期測定頻度・記録保存・管理区分判定への接続）を
 * 組み立てるためのヘルパー。義務の有無の断定はせず、事実ベースの手順のみ。
 */

import { FREQUENCY_LABEL } from "@/data/measurement-rules";
import type { IdentifiedTarget, TargetFinderInput } from "@/types/work-environment";

/** 該当カテゴリを測定頻度ごとにまとめる（重複頻度は1行に集約） */
export interface FrequencyGroup {
  /** 頻度ラベル（例: 6ヶ月以内ごと） */
  label: string;
  /** その頻度に該当するカテゴリ名 */
  categories: string[];
}

/**
 * 判定結果を測定頻度でグループ化。
 * 「半月→毎月→2ヶ月→3ヶ月→6ヶ月→1年」の短い順に並べる。
 */
export function summarizeMeasurementFrequencies(
  results: IdentifiedTarget[]
): FrequencyGroup[] {
  const ORDER = [
    "semi-monthly",
    "monthly",
    "bi-monthly",
    "quarterly",
    "semi-annually",
    "annually",
  ];
  const byFreq = new Map<string, string[]>();
  for (const r of results) {
    const key = r.category.frequency;
    const list = byFreq.get(key) ?? [];
    // 同一カテゴリ名の重複は避ける
    if (!list.includes(r.category.name)) list.push(r.category.name);
    byFreq.set(key, list);
  }
  return ORDER.filter((k) => byFreq.has(k)).map((k) => ({
    label: FREQUENCY_LABEL[k] ?? k,
    categories: byFreq.get(k) ?? [],
  }));
}

/** 管理区分判定が伴う対象が1件でもあるか（測定後の次工程に直結） */
export function hasManagementClassTarget(results: IdentifiedTarget[]): boolean {
  return results.some((r) => r.category.hasManagementClass);
}

/** 特別管理物質（特化物）に関わる対象が含まれるか＝記録30年保存に該当しうる */
export function hasSpecialControlSubstance(results: IdentifiedTarget[]): boolean {
  return results.some((r) => r.category.id === "specific-chem");
}

/**
 * ユーザーが実質的な検索語を入力したか。
 * 0件結果のとき「対象外」なのか「入力不足」なのかを区別するために使う。
 * 業種を選んだだけ（工程・物質・キーワード空）は入力不足とみなす。
 */
export function hasMeaningfulInput(input: TargetFinderInput): boolean {
  const hasProcess = input.processes.length > 0;
  const hasSubstance = input.substances.some((s) => s.trim().length > 0);
  const hasKeyword = input.keywords.trim().length > 0;
  return hasProcess || hasSubstance || hasKeyword;
}
