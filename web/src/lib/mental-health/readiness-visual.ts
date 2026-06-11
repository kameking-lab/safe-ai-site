/**
 * ストレスチェック実施準備度の結論（柱0・ビジュアルファースト）
 *
 * 自己評価フォームの最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * 色の設計判断:
 *   - 7問に答え切るまでは青（回答のこりN問 = KY「記入のこり」と同じ指示の文法）。
 *     未回答を「未整備」として赤黄で責めない — 偽警報は色のオオカミ少年化を招く。
 *   - 全問回答後は整備率%をデカ数字に: ready=緑 / partial=黄 /
 *     early は義務事業場（50人以上）のみ赤（実施義務未達=停止級）、
 *     努力義務事業場は黄（法令義務ではないため赤にしない）。
 *
 * 整備率の算出・verdict は mental-health-flow.assessReadiness が単一ソース、
 * 案内文は readinessGuidance をそのまま使う（文言の言い換えゼロ）。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";
import {
  readinessGuidance,
  type ReadinessAssessment,
} from "@/lib/mental-health-flow";

export interface ReadinessConclusion {
  tone: SafetyTone;
  /** デカ数字（回答のこり問数 or 整備率%） */
  value: number;
  unit: "問" | "%";
  /** 状態の短ラベル（体言止め） */
  title: string;
  /** 1行の補足（全問回答後は readinessGuidance の文言そのまま） */
  description: string;
  /** 全問回答済みで判定が確定しているか */
  settled: boolean;
}

export function readinessConclusion(
  assessment: ReadinessAssessment,
  answeredCount: number,
): ReadinessConclusion {
  const total = assessment.totalQuestions;
  if (answeredCount < total) {
    const remaining = total - answeredCount;
    return {
      tone: "info",
      value: remaining,
      unit: "問",
      title: answeredCount === 0 ? "自己評価 未回答" : "回答のこり",
      description: `${total}問すべてに答えると実施準備の判定が出ます。`,
      settled: false,
    };
  }
  const percent = Math.round(assessment.readinessRatio * 100);
  const description = readinessGuidance(
    assessment.verdict,
    assessment.obligationTier,
  );
  if (assessment.verdict === "ready") {
    return { tone: "safe", value: percent, unit: "%", title: "実施可能", description, settled: true };
  }
  if (assessment.verdict === "partial") {
    return { tone: "warning", value: percent, unit: "%", title: "一部整備中", description, settled: true };
  }
  // early: 義務事業場は実施義務未達なので赤、努力義務は黄
  if (assessment.obligationTier === "mandatory") {
    return { tone: "danger", value: percent, unit: "%", title: "未整備", description, settled: true };
  }
  return { tone: "warning", value: percent, unit: "%", title: "準備が必要", description, settled: true };
}
