/**
 * 化学物質RAの結論ビジュアル（柱0・ビジュアルファースト）
 *
 * 判定結果画面の最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * - CREATE-SIMPLE 判定あり → リスクレベル I〜IV をデカ表示（I=緑/II=黄/III=橙/IV=深紅）
 * - 判定なし・GHSあり → 注意喚起語（危険/警告）をデカ表示
 * - どちらも無し → 青（参考情報）の文法
 *
 * 色の並びは heat-illness/risk-visual.ts と同じ設計（JIS安全色の文法＋
 * 環境省系の段階色）。solid チップは WCAG AA（4.5:1以上）の組み合わせに固定し、
 * amber/orange-500 + 白文字は使わない（第2回監査指摘の複製防止）。
 * 判定ロジック自体は API（classifyLevel）が単一ソース — ここは表示のみ。
 */

import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";

export type RaLevel = "I" | "II" | "III" | "IV";

export type RaLevelVisual = {
  /** 区分の短ラベル（API の LEVEL_LABEL と同義・体言止め） */
  label: string;
  /** 次にやることの体言止め1フレーズ（無読テスト用の最小アクション） */
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

export const RA_LEVEL_ORDER: readonly RaLevel[] = ["I", "II", "III", "IV"] as const;

export const RA_LEVEL_VISUAL: Record<RaLevel, RaLevelVisual> = {
  I: {
    label: "低リスク",
    shortAction: "現状を維持",
    chip: "bg-emerald-700 text-white",
    soft: "border-emerald-300 bg-emerald-50 text-emerald-950",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  II: {
    label: "要注意",
    shortAction: "改善を検討",
    chip: "bg-amber-400 text-amber-950",
    soft: "border-amber-300 bg-amber-50 text-amber-950",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  III: {
    label: "要改善",
    shortAction: "換気・保護具の改善",
    chip: "bg-orange-700 text-white",
    soft: "border-orange-300 bg-orange-50 text-orange-950",
    text: "text-orange-700",
    bar: "bg-orange-500",
  },
  IV: {
    label: "直ちに改善",
    shortAction: "作業中止・直ちに改善",
    chip: "bg-rose-800 text-white",
    soft: "border-rose-300 bg-rose-50 text-rose-950",
    text: "text-rose-700",
    bar: "bg-rose-700",
  },
};

export type RaConclusion =
  | {
      kind: "level";
      level: RaLevel;
      /** デカ表示する文字（ローマ数字） */
      big: string;
      title: string;
      shortAction: string;
      visual: RaLevelVisual;
    }
  | {
      kind: "signal";
      /** デカ表示する注意喚起語 */
      big: "危険" | "警告";
      title: string;
      shortAction: string;
      visual: Pick<RaLevelVisual, "chip" | "soft" | "text">;
    }
  | {
      kind: "info";
      big: "参考";
      title: string;
      shortAction: string;
      visual: Pick<RaLevelVisual, "chip" | "soft" | "text">;
    };

const SIGNAL_DANGER_VISUAL = {
  chip: "bg-rose-800 text-white",
  soft: "border-rose-300 bg-rose-50 text-rose-950",
  text: "text-rose-700",
};

const SIGNAL_WARNING_VISUAL = {
  chip: "bg-amber-400 text-amber-950",
  soft: "border-amber-300 bg-amber-50 text-amber-950",
  text: "text-amber-700",
};

const INFO_VISUAL = {
  chip: "bg-sky-700 text-white",
  soft: "border-sky-300 bg-sky-50 text-sky-950",
  text: "text-sky-700",
};

/**
 * 判定結果から結論カードの内容を決める。
 * CREATE-SIMPLE のレベルが最優先（作業条件込みの判定）、無ければ GHS の
 * 注意喚起語（物質固有の危険有害性）、それも無ければ参考情報の青。
 */
export function computeRaConclusion(
  result: Pick<ChemicalRaResponse, "createSimple" | "ghsHazards">,
): RaConclusion {
  const cs = result.createSimple;
  if (cs) {
    const v = RA_LEVEL_VISUAL[cs.level];
    return {
      kind: "level",
      level: cs.level,
      big: cs.level,
      title: v.label,
      shortAction: v.shortAction,
      visual: v,
    };
  }
  const signals = (result.ghsHazards ?? []).map((h) => h.signal);
  if (signals.includes("危険")) {
    return {
      kind: "signal",
      big: "危険",
      title: "危険有害性あり",
      shortAction: "保護具を着用",
      visual: SIGNAL_DANGER_VISUAL,
    };
  }
  if (signals.includes("警告")) {
    return {
      kind: "signal",
      big: "警告",
      title: "注意が必要",
      shortAction: "保護具を確認",
      visual: SIGNAL_WARNING_VISUAL,
    };
  }
  return {
    kind: "info",
    big: "参考",
    title: "参考情報",
    shortAction: "作業条件を入力すると判定",
    visual: INFO_VISUAL,
  };
}

/**
 * I〜IV 色帯上の現在値マーカー位置（0〜100%）。
 * 帯は順序尺度（4等分）なので、該当セグメントの中央に置く。
 */
export function raLevelMarkerPercent(level: RaLevel): number {
  const idx = RA_LEVEL_ORDER.indexOf(level);
  return Math.round(((idx + 0.5) / RA_LEVEL_ORDER.length) * 1000) / 10;
}
