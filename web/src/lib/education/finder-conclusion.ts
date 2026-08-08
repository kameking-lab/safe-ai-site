/**
 * 業務別 必要資格判定の結論ビジュアル（柱0・ビジュアルファースト）
 *
 * 判定結果画面の最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * 該当した候補の件数を表示する。現行エンジンは能力・方式等の条件分岐を
 * すべて入力できないため、法令義務を確定せず「要条件確認」とする。
 * - 該当なし     = 無彩（参考＝条件変更を促す。偽の空状態にしない）
 *
 * 色の文法は他の柱0結論カードと同じ設計（warning は「ユーザーが対応すべきこと」が
 * ある時だけ使う＝色のオオカミ少年化を防ぐ）。判定ロジック自体は
 * determineRequiredCerts（education-cert-engine）が単一ソース — ここは表示のみ。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";

export type FinderConclusion = {
  /** 色の文法トーン */
  tone: SafetyTone;
  /** デカ数字（該当総数） */
  value: number;
  /** 状態の短ラベル（体言止め） */
  title: string;
  /** 1行の補足（法令義務／推奨の内訳・次にやること） */
  description: string;
};

/**
 * 判定結果（法令義務件数・推奨件数）から結論カードの内容を決める。
 * 未検索（results === null）の場合はカードを出さない＝呼び出し側で null を渡さないこと。
 */
export function buildFinderConclusion(
  requiredCount: number,
  recommendedCount: number,
): FinderConclusion {
  const total = requiredCount + recommendedCount;

  if (total === 0) {
    return {
      tone: "neutral",
      value: 0,
      title: "条件不足・未判定",
      description: "現在の入力条件と収録候補では一致を特定できず、資格不要とは判断できません。作業内容・能力・高さ・機械・電圧・役割を確認してください。",
    };
  }

  if (requiredCount > 0) {
    return {
      tone: "warning",
      value: total,
      title: "資格候補を要確認",
      description: `条件確認が必要な候補 ${requiredCount}件、関連候補 ${recommendedCount}件。機械能力・作業方式等を公式窓口で確認してください`,
    };
  }

  return {
    tone: "info",
    value: total,
    title: "関連資格候補",
    description: `関連候補 ${recommendedCount}件。該当義務の有無は作業条件と公式情報で確認してください`,
  };
}
