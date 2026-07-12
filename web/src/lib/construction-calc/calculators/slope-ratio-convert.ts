/**
 * 斜面勾配 割（1:n）⇔角度⇔百分率 相互換算＋すりつけ長
 *
 * 根拠（純粋な三角関数・法令の数値ではない）:
 * - 割 n（1:n、n=水平距離÷垂直距離）→ 角度 θ = atan(1/n)、百分率 = 100/n。
 * - 高低差 H からのすりつけ長（水平距離）L = H × n。
 * - 掘削面の法定上限勾配（地山の種類・高さで区分）は別の基準であり、本計算機では判定しない。
 *   「掘削面の勾配チェック」計算機（excavation-slope・安衛則第356条・第357条）で判定すること。
 *
 * 計算は決定論的な換算のみ（AIは使わない）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type SlopeInputMode = "ratio" | "angle" | "percent";

export type SlopeConversionResult = {
  n: number;
  angleDeg: number;
  percent: number;
};

/** 割・角度・百分率のいずれかから残り2つを求める（純関数） */
export function convertSlope(from: SlopeInputMode, value: number): SlopeConversionResult {
  if (from === "ratio") {
    const n = value;
    const angleDeg = (Math.atan(1 / n) * 180) / Math.PI;
    return { n, angleDeg, percent: 100 / n };
  }
  if (from === "angle") {
    const angleDeg = value;
    const rad = (angleDeg * Math.PI) / 180;
    return { n: 1 / Math.tan(rad), angleDeg, percent: 100 * Math.tan(rad) };
  }
  const percent = value;
  const rad = Math.atan(percent / 100);
  return { n: 100 / percent, angleDeg: (rad * 180) / Math.PI, percent };
}

function computeSlopeRatioConvert(values: CalcValues): CalcOutcome {
  const from = String(values.from) as SlopeInputMode;
  const ratioN = values.ratioN as number;
  const angleDeg = values.angleDeg as number;
  const percentValue = values.percentValue as number;
  const heightDiffM = values.heightDiffM as number;

  const sourceValue = from === "ratio" ? ratioN : from === "angle" ? angleDeg : percentValue;
  const { n, angleDeg: outAngle, percent } = convertSlope(from, sourceValue);

  const runoutM = heightDiffM > 0 ? heightDiffM * n : null;

  const sourceLabel =
    from === "ratio"
      ? `割 1:${formatNumber(ratioN, 2)}`
      : from === "angle"
        ? `角度 ${formatNumber(angleDeg, 1)}°`
        : `百分率 ${formatNumber(percentValue, 1)}%`;

  const warnings: string[] = [
    "本計算は幾何学的な換算のみです。掘削面の法定上限勾配は地山の種類・掘削面の高さで区分されるため、「掘削面の勾配チェック」計算機（安衛則第356条・第357条）で別途判定してください。",
  ];
  if (outAngle >= 45) {
    warnings.push("角度45°（1:1）を超える急勾配です。法面保護・土留め等の措置の要否を確認してください。");
  }

  return {
    tone: "info",
    headline: "換算結果",
    value: formatNumber(outAngle, 1),
    unit: "°",
    summary: `${sourceLabel} は、角度 ${formatNumber(outAngle, 1)}°／割 1:${formatNumber(n, 2)}／百分率 ${formatNumber(percent, 1)}% に相当します。${runoutM !== null ? `高低差${formatNumber(heightDiffM, 1)}mのすりつけ長は${formatNumber(runoutM, 1)}mです。` : ""}`,
    items: [
      { label: "割（1:n）", value: `1:${formatNumber(n, 2)}` },
      { label: "角度", value: `${formatNumber(outAngle, 1)}°` },
      { label: "百分率", value: `${formatNumber(percent, 1)}%` },
      ...(runoutM !== null
        ? [
            { label: "高低差", value: `${formatNumber(heightDiffM, 1)}m` },
            { label: "すりつけ長（水平距離）", value: `${formatNumber(runoutM, 1)}m`, note: "すりつけ長 = 高低差 × n" },
          ]
        : []),
    ],
    steps: [
      `入力: ${sourceLabel}`,
      `角度 θ = atan(1/n) または逆算 → ${formatNumber(outAngle, 1)}°`,
      `割 1:n = ${formatNumber(n, 2)} ／ 百分率 = 100/n = ${formatNumber(percent, 1)}%`,
      ...(runoutM !== null ? [`すりつけ長 L = 高低差${formatNumber(heightDiffM, 1)}m × n${formatNumber(n, 2)} = ${formatNumber(runoutM, 1)}m`] : []),
    ],
    warnings,
  };
}

export const slopeRatioConvertCalculator: ConstructionCalculator = {
  slug: "slope-ratio-convert",
  title: "斜面勾配 割⇔角度⇔百分率 換算＋すりつけ長",
  shortTitle: "勾配割合換算",
  summary:
    "1:n（割）⇔角度⇔百分率の勾配表記を相互換算し、高低差からのすりつけ長（水平距離）も計算します。掘削勾配・法面の現場換算の補助ツールです。",
  fields: [
    {
      kind: "select",
      id: "from",
      label: "換算元",
      options: [
        { value: "ratio", label: "割（1:n）から換算" },
        { value: "angle", label: "角度から換算" },
        { value: "percent", label: "百分率（%）から換算" },
      ],
      defaultValue: "ratio",
      help: "換算元を選ぶと、残り2つの表記と併せて表示します",
    },
    {
      kind: "number",
      id: "ratioN",
      label: "割（1:n のn）",
      unit: "",
      min: 0.01,
      max: 20,
      step: 0.01,
      defaultValue: 1.5,
      help: "換算元「割」を選んだときに使用",
    },
    {
      kind: "number",
      id: "angleDeg",
      label: "角度",
      unit: "°",
      min: 0.1,
      max: 89.9,
      step: 0.1,
      defaultValue: 33.69,
      help: "換算元「角度」を選んだときに使用",
    },
    {
      kind: "number",
      id: "percentValue",
      label: "百分率（勾配）",
      unit: "%",
      min: 0.1,
      max: 2000,
      step: 0.1,
      defaultValue: 66.7,
      help: "換算元「百分率」を選んだときに使用",
    },
    {
      kind: "number",
      id: "heightDiffM",
      label: "高低差（すりつけ長を計算する場合）",
      unit: "m",
      min: 0,
      max: 100,
      step: 0.1,
      defaultValue: 0,
      help: "0のときはすりつけ長を計算しません",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "幾何学的な換算式（三角関数）",
      description:
        "割 n（1:n）に対し、角度 θ = atan(1/n)、百分率 = 100/n の関係で相互換算します。法令に基づく数値ではなく、幾何学的に一意に定まる換算です。",
    },
    {
      label: "労働安全衛生規則 第356条・第357条（掘削面の勾配の基準）との関係",
      description:
        "本計算機は勾配表記の換算のみを行います。掘削面の法定上限勾配（地山の種類・掘削面の高さで区分）は「掘削面の勾配チェック」計算機（excavation-slope）で別途判定してください。",
      lawNaviPath: "/law-navi/347M50002000032/356",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_356",
    },
  ],
  cautions: [
    "本計算機は勾配表記の換算のみで、法定上限勾配の適合判定は行いません。掘削面については「掘削面の勾配チェック」計算機で判定してください。",
    "すりつけ長は高低差と勾配（割n）から求めた水平距離の概算です。実際の取付けは現地の起伏・既存構造物との干渉を確認してください。",
  ],
  examples: [
    { label: "1:1.5 の勾配を角度・百分率へ換算", values: { from: "ratio", ratioN: 1.5, angleDeg: 33.69, percentValue: 66.7, heightDiffM: 0 } },
    { label: "45°の勾配を割・百分率へ換算", values: { from: "angle", ratioN: 1.5, angleDeg: 45, percentValue: 66.7, heightDiffM: 0 } },
    { label: "1:0.5の勾配・高低差3mのすりつけ長", values: { from: "ratio", ratioN: 0.5, angleDeg: 33.69, percentValue: 66.7, heightDiffM: 3 } },
  ],
  keywords: [
    "勾配",
    "法面",
    "のり面",
    "割",
    "角度",
    "百分率",
    "パーセント",
    "換算",
    "すりつけ",
    "すりつけ長",
    "傾斜",
  ],
  compute: computeSlopeRatioConvert,
};
