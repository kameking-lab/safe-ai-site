/**
 * AIリスク予測の結論ビジュアル（柱0・ビジュアルファースト）
 *
 * 判定結果画面の最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * 安全スコア（0〜100）と リスクレベル（高/中/低）をデカ数字＋色帯で表示する。
 * - 高 = 赤（危険・作業前に対策徹底）
 * - 中 = 黄（注意・重点対策を周知）
 * - 低 = 緑（低リスク・基本対策を確認）
 *
 * 色の文法は heat-illness/risk-visual.ts・chemical/ra-visual.ts と同じ設計
 * （JIS安全色＋WCAG AA 4.5:1以上の solid 組み合わせに固定）。
 * 判定ロジック自体は computeSafetyScore（risk-search.ts）が単一ソース — ここは表示のみ。
 *
 * 色帯のセグメント幅は computeSafetyScore のしきい値（30/60）と一致させる
 * （低=0〜30 / 中=30〜60 / 高=60〜100）。マーカーはスコアそのもの（0〜100%）に置く
 * ため、デカ数字とマーカー位置が必ず一致する。
 */

import type { RiskLevel, SafetyScore } from "@/lib/utils/risk-search";
import type { SafetyTone } from "@/lib/design/safety-tone";

export type RiskLevelVisual = {
  /** 色の文法トーン（アイコン・StatusBadge の既定に使う） */
  tone: SafetyTone;
  /** 区分の短ラベル（体言止め） */
  label: string;
  /** 次にやることの体言止め1フレーズ（無読テスト用の最小アクション） */
  shortAction: string;
  /** 濃色チップ（WCAG AA 準拠の組み合わせ） */
  chip: string;
  /** 結論カードの淡色面（背景+枠+本文色） */
  soft: string;
  /** デカ数字の文字色 */
  text: string;
  /** 色帯スケールのセグメント背景 */
  bar: string;
};

export const RISK_LEVEL_ORDER: readonly RiskLevel[] = ["低", "中", "高"] as const;

export const RISK_LEVEL_VISUAL: Record<RiskLevel, RiskLevelVisual> = {
  低: {
    tone: "safe",
    label: "低リスク",
    shortAction: "基本対策を確認",
    chip: "bg-emerald-700 text-white",
    soft: "border-emerald-300 bg-emerald-50 text-emerald-950",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  中: {
    tone: "warning",
    label: "中リスク",
    shortAction: "重点対策を周知",
    chip: "bg-amber-500 text-amber-950",
    soft: "border-amber-300 bg-amber-50 text-amber-950",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  高: {
    tone: "danger",
    label: "高リスク",
    shortAction: "作業前に対策を徹底",
    chip: "bg-rose-700 text-white",
    soft: "border-rose-300 bg-rose-50 text-rose-950",
    text: "text-rose-700",
    bar: "bg-rose-600",
  },
};

/**
 * 色帯のセグメント幅（%）。computeSafetyScore のしきい値（total>=60→高 / >=30→中）と一致。
 * 低=0〜30(30%) / 中=30〜60(30%) / 高=60〜100(40%)。合計100。
 */
export const RISK_BAND_SEGMENTS: readonly { level: RiskLevel; widthPct: number }[] = [
  { level: "低", widthPct: 30 },
  { level: "中", widthPct: 30 },
  { level: "高", widthPct: 40 },
] as const;

export type RiskPredictionConclusion = {
  level: RiskLevel;
  /** デカ表示する安全スコア（0〜100） */
  big: number;
  /** 状態の短ラベル（体言止め・例「高リスク」） */
  title: string;
  /** 次にやることの体言止め1フレーズ */
  shortAction: string;
  visual: RiskLevelVisual;
};

/** 判定結果（安全スコア）から結論カードの内容を決める。 */
export function computeRiskPredictionConclusion(
  score: Pick<SafetyScore, "overall" | "riskLevel">,
): RiskPredictionConclusion {
  const v = RISK_LEVEL_VISUAL[score.riskLevel];
  return {
    level: score.riskLevel,
    big: score.overall,
    title: v.label,
    shortAction: v.shortAction,
    visual: v,
  };
}

/**
 * 色帯上の現在値マーカー位置（0〜100%）。
 * スコアは連続尺度（0〜100）なので、スコアそのもの（範囲外はクランプ）。
 */
export function riskScoreMarkerPercent(overall: number): number {
  return Math.max(0, Math.min(100, overall));
}
