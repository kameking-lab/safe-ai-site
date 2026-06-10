/**
 * 熱中症リスクの共通視覚トークンと危険度色帯スケール（柱0・ビジュアルファースト）
 *
 * WBGTの5段階リスク区分（safe〜danger）を「画面の主役」として描くための
 * 一本化モジュール。これまで WBGT計算機（COLOR_TOKEN）と日次記録簿
 * （RISK_COLOR）が別々に色マップを持っていたのを統合する。
 *
 * 色の並びは環境省・厚労省の暑さ指数（WBGT）表示と同系
 * （緑=ほぼ安全 → 黄=注意 → 橙=警戒 → 赤=厳重警戒 → 深紅=危険）。
 * JIS安全色の文法（赤=停止・黄=注意・緑=安全）とも整合する。
 *
 * solid チップは WCAG AA（コントラスト比4.5:1）を満たす組み合わせに固定:
 * amber-500/orange-500 + 白文字（約2.2〜2.8:1）は使わない（第2回監査指摘の
 * safety-tone と同型の不適合をロールアウト先で複製しないため）。
 */

import type {
  AcclimatizationState,
  RiskLevel,
  WorkIntensity,
} from "@/types/heat-illness";
import { getRiskThresholds } from "@/lib/wbgt-engine";

export type RiskVisual = {
  /** 区分の短ラベル（エンジンの label と同一） */
  label: string;
  /** 次にやることの体言止め1フレーズ（無読テスト用の最小アクション） */
  shortAction: string;
  /** 濃色チップ（WCAG AA 準拠の組み合わせ） */
  chip: string;
  /** 結論カードの淡色面（背景+枠+本文色） */
  soft: string;
  /** 枠線のみ */
  border: string;
  /** デカ数字・見出しの文字色 */
  text: string;
  /** 色帯スケールのセグメント背景 */
  bar: string;
  /** テーブル行のハイライト背景 */
  row: string;
};

export const RISK_VISUAL: Record<RiskLevel, RiskVisual> = {
  safe: {
    label: "ほぼ安全",
    shortAction: "通常作業",
    chip: "bg-emerald-700 text-white",
    soft: "border-emerald-300 bg-emerald-50 text-emerald-950",
    border: "border-emerald-300",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    row: "bg-emerald-50",
  },
  caution: {
    label: "注意",
    shortAction: "水分補給",
    chip: "bg-amber-400 text-amber-950",
    soft: "border-amber-300 bg-amber-50 text-amber-950",
    border: "border-amber-300",
    text: "text-amber-700",
    bar: "bg-amber-400",
    row: "bg-amber-50",
  },
  warning: {
    label: "警戒",
    shortAction: "積極的に休憩",
    chip: "bg-orange-700 text-white",
    soft: "border-orange-300 bg-orange-50 text-orange-950",
    border: "border-orange-300",
    text: "text-orange-700",
    bar: "bg-orange-500",
    row: "bg-orange-50",
  },
  "severe-warning": {
    label: "厳重警戒",
    shortAction: "重作業中止",
    chip: "bg-red-700 text-white",
    soft: "border-red-300 bg-red-50 text-red-950",
    border: "border-red-300",
    text: "text-red-700",
    bar: "bg-red-500",
    row: "bg-red-50",
  },
  danger: {
    label: "危険",
    shortAction: "作業中止",
    chip: "bg-rose-800 text-white",
    soft: "border-rose-300 bg-rose-50 text-rose-950",
    border: "border-rose-300",
    text: "text-rose-700",
    bar: "bg-rose-700",
    row: "bg-rose-50",
  },
};

/** 安全→危険の順（色帯スケールの描画順） */
export const RISK_ORDER: readonly RiskLevel[] = [
  "safe",
  "caution",
  "warning",
  "severe-warning",
  "danger",
] as const;

export type ScaleSegment = {
  level: RiskLevel;
  label: string;
  /** この区分の下限WBGT（℃）。最下区分は null（下限なし） */
  fromC: number | null;
  /** この区分の上限WBGT（℃）。最上区分は null（上限なし） */
  toC: number | null;
};

/**
 * 作業強度・順化状況に応じた5区分の色帯スケールを返す。
 * 境界値はリスク判定エンジン（getRiskThresholds）と同一ソース。
 */
export function buildRiskScale(
  workIntensity: WorkIntensity,
  acclimatization: AcclimatizationState,
): ScaleSegment[] {
  const [caution, warning, severe, danger] = getRiskThresholds(
    workIntensity,
    acclimatization,
  );
  const bounds: Array<[number | null, number | null]> = [
    [null, caution],
    [caution, warning],
    [warning, severe],
    [severe, danger],
    [danger, null],
  ];
  return RISK_ORDER.map((level, i) => ({
    level,
    label: RISK_VISUAL[level].label,
    fromC: bounds[i][0],
    toC: bounds[i][1],
  }));
}

/**
 * 現在値マーカーの横位置（0〜100%）。
 * 5セグメント等幅（各20%）とし、セグメント内は線形補間。
 * 開区間の端（最下・最上区分）は境界から5℃をセグメント幅とみなす。
 */
export function riskMarkerPercent(wbgt: number, scale: ScaleSegment[]): number {
  const OPEN_SPAN = 5;
  const n = scale.length;
  for (let i = 0; i < n; i++) {
    const seg = scale[i];
    const from = seg.fromC ?? (seg.toC as number) - OPEN_SPAN;
    const to = seg.toC ?? (seg.fromC as number) + OPEN_SPAN;
    if (wbgt < to || i === n - 1) {
      const ratio = Math.min(1, Math.max(0, (wbgt - from) / (to - from)));
      return Math.round(((i + ratio) / n) * 1000) / 10;
    }
  }
  return 100;
}
