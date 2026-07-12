/**
 * 生コンクリート数量の概算（部材寸法・打設ロス率 → 発注量・車両台数）
 *
 * 根拠:
 * - 体積（部材寸法：縦×横×高さ、または体積の直接入力）→ 打設量。ロス率（型枠精度・こぼれ・
 *   圧送配管内残留・打継ぎ処理等）を加味した発注量 = 打設量 ×（1＋ロス率）。積算実務における
 *   一般的な数量算出の考え方（法令ではない）。
 * - 配合（水セメント比・スランプ・空気量・骨材種別等）は、要求性能（強度・耐久性・環境条件）や
 *   生コン工場の示方配合で個別に決まり、一律の数値を掲載すると誤りのもとになるため、本計算には
 *   **含めない**（絶対原則: 出典未確認の数値を載せない）。日本建築学会JASS5を参照表記に留め、
 *   実際の配合は生コン工場の配合計画書・示方配合表で確認する。
 * - 発注量 ÷ 1台あたりの積載量（アジテータ車）で、必要な生コン車の概算台数を算定する。
 *
 * 判定は決定論（AIは使わない）。鉄筋・型枠占有分の控除、開口部・埋設物の控除は含まない。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type ConcreteCalcMode = "rectangular" | "direct";

/** 直方体の体積 = 縦×横×高さ [m³] */
export function rectangularVolume(length: number, width: number, height: number): number {
  return length * width * height;
}

/** 発注量 = 打設量 ×（1＋ロス率/100）[m³] */
export function orderVolumeWithLoss(baseVolume: number, lossRatePercent: number): number {
  return baseVolume * (1 + lossRatePercent / 100);
}

function computeConcreteVolume(values: CalcValues): CalcOutcome {
  const mode = values.calcMode as ConcreteCalcMode;
  const volume = values.volume as number;
  const lengthDim = values.lengthDim as number;
  const widthDim = values.widthDim as number;
  const heightDim = values.heightDim as number;
  const lossRate = values.lossRate as number;
  const truckCapacity = values.truckCapacity as number;

  const baseVolume = mode === "direct" ? volume : rectangularVolume(lengthDim, widthDim, heightDim);
  const orderVolume = orderVolumeWithLoss(baseVolume, lossRate);
  const truckCount = truckCapacity > 0 ? Math.ceil(orderVolume / truckCapacity) : 0;

  const items: CalcCheckItem[] = [
    mode === "direct"
      ? { label: "打設量（入力）", value: `${formatNumber(baseVolume, 2)} m³` }
      : {
          label: "打設量（縦×横×高さ）",
          value: `${formatNumber(lengthDim, 2)} × ${formatNumber(widthDim, 2)} × ${formatNumber(heightDim, 2)} = ${formatNumber(baseVolume, 2)} m³`,
        },
    { label: "ロス率", value: `${formatNumber(lossRate, 1)} %` },
    {
      label: "発注量",
      value: `${formatNumber(orderVolume, 2)} m³`,
      tone: "info",
      note: "発注量 = 打設量 ×（1＋ロス率）",
    },
    {
      label: "生コン車（アジテータ車）概算台数",
      value: `約 ${truckCount} 台`,
      note: `1台 ${formatNumber(truckCapacity, 1)}m³ で計算（切り上げ）`,
    },
  ];

  return {
    tone: "info",
    headline: "発注量を算定",
    value: formatNumber(orderVolume, 2),
    unit: "m³",
    summary: `打設量 ${formatNumber(baseVolume, 2)}m³ にロス率 ${formatNumber(lossRate, 1)}% を加味した発注量は約 ${formatNumber(orderVolume, 2)}m³（生コン車 約${truckCount}台）です。`,
    items,
    steps: [
      mode === "direct"
        ? `打設量 = 入力値 ${formatNumber(baseVolume, 2)} m³`
        : `打設量 = 縦×横×高さ = ${formatNumber(lengthDim, 2)} × ${formatNumber(widthDim, 2)} × ${formatNumber(heightDim, 2)} = ${formatNumber(baseVolume, 3)} m³`,
      `発注量 = 打設量 ×（1＋ロス率/100） = ${formatNumber(baseVolume, 3)} × (1+${formatNumber(lossRate, 1)}/100) = ${formatNumber(orderVolume, 3)} m³`,
      `生コン車台数 = 発注量 ÷ 1台の積載量 = ${formatNumber(orderVolume, 3)} ÷ ${formatNumber(truckCapacity, 1)} = 約${truckCount}台（切り上げ）`,
    ],
    warnings: [
      "ロス率は現場条件（型枠精度・こぼれ、圧送配管内残留、打継ぎ処理等）で変動します。一般に数%程度が目安ですが、実際の発注量は打設計画・配車計画で確定してください。",
      "配合（水セメント比・スランプ・空気量・骨材種別等）は本計算に含みません。要求性能（強度・耐久性・環境条件）に応じてJASS5・示方配合表、生コン工場の配合計画書で確認してください。",
      "鉄筋・型枠占有分の控除、開口部・埋設物による体積の控除は含みません。実際の部材形状に応じて別途調整してください。",
      "生コン車の台数は概算です。現場の受入れ体制（打設時間・ポンプ車の能力・待機時間）に応じて配車計画を別途立ててください。",
    ],
  };
}

export const concreteVolumeCalculator: ConstructionCalculator = {
  slug: "concrete-volume",
  title: "生コンクリート数量の概算（打設量・発注量・車両台数）",
  shortTitle: "生コン数量",
  summary:
    "部材寸法（縦×横×高さ）または体積の直接入力から打設量を求め、ロス率を加味した発注量と生コン車（アジテータ車）の概算台数を算定します。配合（水セメント比等）はJASS5等の参照表記に留め、数値は生コン工場の配合計画書で確認してください。",
  fields: [
    {
      kind: "select",
      id: "calcMode",
      label: "打設量の入力方法",
      options: [
        { value: "rectangular", label: "部材寸法から算定（縦×横×高さ）" },
        { value: "direct", label: "体積を直接入力" },
      ],
      defaultValue: "rectangular",
    },
    {
      kind: "number",
      id: "volume",
      label: "打設量（直接入力）",
      unit: "m³",
      min: 0.01,
      max: 10000,
      step: 0.01,
      defaultValue: 10,
      help: "「体積を直接入力」モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "lengthDim",
      label: "縦（長さ）",
      unit: "m",
      min: 0.01,
      max: 100,
      step: 0.01,
      defaultValue: 5,
      help: "「部材寸法から算定」モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "widthDim",
      label: "横（幅）",
      unit: "m",
      min: 0.01,
      max: 100,
      step: 0.01,
      defaultValue: 4,
      help: "「部材寸法から算定」モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "heightDim",
      label: "高さ（厚さ）",
      unit: "m",
      min: 0.01,
      max: 20,
      step: 0.01,
      defaultValue: 0.5,
      help: "「部材寸法から算定」モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "lossRate",
      label: "ロス率",
      unit: "%",
      min: 0,
      max: 20,
      step: 0.5,
      defaultValue: 3,
      help: "一般に3〜5%程度が目安。現場条件（型枠精度・こぼれ・圧送残留等）で変動",
    },
    {
      kind: "number",
      id: "truckCapacity",
      label: "生コン車1台の積載量",
      unit: "m³",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 4.5,
      help: "アジテータ車の一般的な積載量。規格・現場条件で変動",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "体積計算と打設ロス率による発注量の算定（積算実務の一般的な方法）",
      description:
        "部材寸法（縦×横×高さ）または体積から打設量を求め、ロス率（型枠精度・こぼれ・圧送配管内残留・打継ぎ処理等）を加味して発注量を算定します。法令ではなく積算実務の一般的な考え方です。",
    },
    {
      label: "日本建築学会 JASS5（鉄筋コンクリート工事）",
      description:
        "配合（水セメント比・スランプ・空気量等）の基準を定めています。数値は要求性能・環境条件により異なるため本計算には含めていません。実際の配合は生コン工場の配合計画書・示方配合表で確認してください。",
    },
  ],
  cautions: [
    "ロス率は現場条件で変動する目安値です。実際の発注量は打設計画・配車計画で確定してください。",
    "配合（水セメント比・スランプ・空気量・骨材種別等）は本計算に含みません。JASS5・示方配合表、生コン工場の配合計画書で確認してください。",
    "鉄筋・型枠占有分、開口部・埋設物による体積の控除は含みません。実際の部材形状に応じて別途調整してください。",
  ],
  examples: [
    { label: "スラブ 5m×4m×0.5m（ロス3%）", values: { calcMode: "rectangular", volume: 10, lengthDim: 5, widthDim: 4, heightDim: 0.5, lossRate: 3, truckCapacity: 4.5 } },
    { label: "体積直接入力 20m³（ロス5%）", values: { calcMode: "direct", volume: 20, lengthDim: 5, widthDim: 4, heightDim: 0.5, lossRate: 5, truckCapacity: 4.5 } },
  ],
  keywords: [
    "生コン",
    "生コンクリート",
    "コンクリート数量",
    "打設量",
    "発注量",
    "ロス率",
    "アジテータ車",
    "生コン車",
    "ミキサー車",
    "JASS5",
    "配合",
    "体積計算",
  ],
  relatedSlugs: ["rebar-mass"],
  compute: computeConcreteVolume,
};
