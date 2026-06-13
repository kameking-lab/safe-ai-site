/**
 * 業務別 必要資格判定の結論ビジュアル（柱0・ビジュアルファースト）
 *
 * 判定結果画面の最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * 該当した資格の件数をデカ数字、法令義務の有無を色の文法で表す。
 * - 法令義務あり = 黄（注意・要対応＝取得しないと就業させられない資格がある）
 * - 推奨のみ     = 青（指示・案内＝義務はないが関連資格を確認）
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
      title: "該当なし",
      description: "別の業種・作業内容で検索してください",
    };
  }

  if (requiredCount > 0) {
    return {
      tone: "warning",
      value: total,
      title: "要取得資格あり",
      description: `法令義務 ${requiredCount}件 — 修了前は就業させられません（推奨 ${recommendedCount}件）`,
    };
  }

  return {
    tone: "info",
    value: total,
    title: "推奨資格",
    description: `法令義務の該当なし。関連・推奨 ${recommendedCount}件を確認してください`,
  };
}
