/**
 * 作業環境測定・管理区分のビジュアル文法（柱0・ビジュアルファースト）
 *
 * 第1〜第3管理区分を JIS安全色の文法（safety-tone.ts）に正規化する:
 *   第1 = 緑（良好・現状維持） / 第2 = 黄（要改善・3ヶ月以内） / 第3 = 赤（直ちに改善・停止級）
 *
 * solid チップは WCAG AA（4.5:1以上）の組み合わせに固定し、
 * amber/orange-500 + 白文字は使わない（第2回監査指摘の複製防止・ra-visual.ts と同方針）。
 * 判定ロジックは measurement-engine.determineManagementClass が単一ソース — ここは表示のみ。
 */

import type { ManagementClass } from "@/types/work-environment";

export type ManagementClassVisual = {
  /** 区分の正式ラベル */
  label: string;
  /** 状態の短ラベル（体言止め・無読テストの主役） */
  stateLabel: string;
  /** 次にやることの1フレーズ */
  shortAction: string;
  /** 濃色チップ（WCAG AA 準拠の組み合わせ） */
  chip: string;
  /** 結論カードの淡色面（背景+枠+本文色） */
  soft: string;
  /** デカ文字の文字色 */
  text: string;
  /** 色帯スケールのセグメント背景 */
  bar: string;
};

export const MANAGEMENT_CLASS_ORDER: readonly ManagementClass[] = [1, 2, 3] as const;

export const MANAGEMENT_CLASS_VISUAL: Record<ManagementClass, ManagementClassVisual> = {
  1: {
    label: "第1管理区分",
    stateLabel: "良好",
    shortAction: "現状の管理を継続",
    chip: "bg-emerald-700 text-white",
    soft: "border-emerald-300 bg-emerald-50 text-emerald-950",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  2: {
    label: "第2管理区分",
    stateLabel: "要改善",
    shortAction: "3ヶ月以内に改善・再測定",
    chip: "bg-amber-400 text-amber-950",
    soft: "border-amber-300 bg-amber-50 text-amber-950",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  3: {
    label: "第3管理区分",
    stateLabel: "直ちに改善",
    shortAction: "直ちに改善・改善完了まで呼吸用保護具を着用",
    chip: "bg-rose-800 text-white",
    soft: "border-rose-300 bg-rose-50 text-rose-950",
    text: "text-rose-700",
    bar: "bg-rose-700",
  },
};

/**
 * 第1〜第3 色帯上の現在値マーカー位置（0〜100%）。
 * 帯は順序尺度（3等分）なので、該当セグメントの中央に置く。
 */
export function managementClassMarkerPercent(cls: ManagementClass): number {
  const idx = MANAGEMENT_CLASS_ORDER.indexOf(cls);
  return Math.round(((idx + 0.5) / MANAGEMENT_CLASS_ORDER.length) * 1000) / 10;
}
