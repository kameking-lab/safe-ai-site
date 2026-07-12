/**
 * 揚重ワイヤの必要長さ・吊り角度の逆算（現場寸法から吊り角度を求める補助）
 *
 * 根拠（幾何・現場寸法からの逆算）:
 * - 吊り幅（アイ間距離）b、吊り点までの高さ h、ワイヤ1本の長さ L は直角三角形の関係にある
 *   （半幅 = b/2、斜辺 = L、対辺 = 半幅、隣辺 = h）。
 *   tan(θ/2) = (b/2) / h、sin(θ/2) = (b/2) / L、L = √(h² + (b/2)²)
 * - 張力増加係数 = 1/cos(θ/2) は「玉掛けワイヤロープの安全荷重・張力計算」（sling-wire-load）の
 *   モード係数方式と同じ式を再利用する（tensionFactor）。求めた吊り角度は同計算機の入力に使える。
 *
 * 計算は決定論的な幾何計算のみ（AIは使わない）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";
import { tensionFactor } from "./sling-wire-load";

export type SlingAngleInputMode = "height" | "wireLength";

export type SlingAngleResult = {
  angleDeg: number;
  heightM: number;
  wireLengthM: number;
};

/**
 * 吊り幅 b・（高さ h または ワイヤ長 L のどちらか）から吊り角度と残りの値を求める。
 * wireLength モードで半幅 ≥ L（三角形が成立しない）のときは null を返す。
 */
export function solveSlingAngle(
  b: number,
  mode: SlingAngleInputMode,
  value: number,
): SlingAngleResult | null {
  const half = b / 2;
  if (mode === "height") {
    const h = value;
    const wireLengthM = Math.sqrt(h * h + half * half);
    const angleDeg = 2 * ((Math.atan(half / h) * 180) / Math.PI);
    return { angleDeg, heightM: h, wireLengthM };
  }
  const wireLengthM = value;
  if (wireLengthM <= half) return null;
  const heightM = Math.sqrt(wireLengthM * wireLengthM - half * half);
  const angleDeg = 2 * ((Math.asin(half / wireLengthM) * 180) / Math.PI);
  return { angleDeg, heightM, wireLengthM };
}

function computeSlingAngleGeometry(values: CalcValues): CalcOutcome {
  const b = values.b as number;
  const mode = String(values.inputMode) as SlingAngleInputMode;
  const inputValue = mode === "height" ? (values.h as number) : (values.wireLength as number);

  const result = solveSlingAngle(b, mode, inputValue);

  if (!result) {
    return {
      tone: "danger",
      headline: "計算不能",
      value: "—",
      summary: `ワイヤ長がアイ間距離の半分（${formatNumber(b / 2, 2)}m）以下のため、三角形が成立しません。ワイヤ長を長くするか吊り幅を見直してください。`,
      items: [
        { label: "吊り幅（アイ間距離）", value: `${formatNumber(b, 2)}m` },
        { label: "入力したワイヤ長", value: `${formatNumber(inputValue, 2)}m`, tone: "danger" },
      ],
      steps: [`半幅 = ${formatNumber(b / 2, 2)}m ≥ ワイヤ長 ${formatNumber(inputValue, 2)}m のため計算不能`],
      warnings: ["ワイヤ1本の長さは、吊り幅の半分より長い必要があります。"],
    };
  }

  const { angleDeg, heightM, wireLengthM } = result;
  const factor = tensionFactor(angleDeg);

  const warnings: string[] = [];
  if (angleDeg > 60) {
    warnings.push(
      `吊り角度が60°を超えています（張力係数約${formatNumber(factor, 2)}倍）。張力が急増するため、「玉掛けワイヤロープの安全荷重・張力計算」計算機（sling-wire-load）で安全荷重を確認してください。`,
    );
  } else {
    warnings.push(
      `求めた吊り角度${formatNumber(angleDeg, 1)}°は「玉掛けワイヤロープの安全荷重・張力計算」計算機（sling-wire-load）の吊り角度入力にそのまま使えます。`,
    );
  }
  warnings.push("本計算は治具・フック等の大きさを無視した理想的な幾何計算です。実際の取付け寸法で確認してください。");

  return {
    tone: "info",
    headline: "吊り角度",
    value: formatNumber(angleDeg, 1),
    unit: "°",
    summary: `吊り幅${formatNumber(b, 2)}m・${mode === "height" ? `高さ${formatNumber(heightM, 2)}m` : `ワイヤ長${formatNumber(wireLengthM, 2)}m`}のとき、吊り角度は約${formatNumber(angleDeg, 1)}°、ワイヤ1本の長さは約${formatNumber(wireLengthM, 2)}mです。`,
    items: [
      { label: "吊り角度", value: `${formatNumber(angleDeg, 1)}°`, tone: angleDeg > 60 ? "warning" : "safe" },
      { label: "吊り点までの高さ", value: `${formatNumber(heightM, 2)}m` },
      { label: "ワイヤ1本の長さ", value: `${formatNumber(wireLengthM, 2)}m` },
      { label: "吊り幅（アイ間距離）", value: `${formatNumber(b, 2)}m` },
      { label: "張力増加係数（1/cos(θ/2)）", value: `${formatNumber(factor, 2)}倍` },
    ],
    steps: [
      `半幅 = 吊り幅${formatNumber(b, 2)}m ÷ 2 = ${formatNumber(b / 2, 2)}m`,
      mode === "height"
        ? `tan(θ/2) = 半幅${formatNumber(b / 2, 2)} ÷ 高さ${formatNumber(heightM, 2)} → θ = ${formatNumber(angleDeg, 1)}°`
        : `sin(θ/2) = 半幅${formatNumber(b / 2, 2)} ÷ ワイヤ長${formatNumber(wireLengthM, 2)} → θ = ${formatNumber(angleDeg, 1)}°`,
      `ワイヤ1本の長さ L = √(高さ² + 半幅²) = ${formatNumber(wireLengthM, 2)}m`,
      `張力増加係数 = 1/cos(θ/2) = ${formatNumber(factor, 2)}倍`,
    ],
    warnings,
  };
}

export const slingAngleGeometryCalculator: ConstructionCalculator = {
  slug: "sling-angle-geometry",
  title: "揚重ワイヤの必要長さ・吊り角度逆算",
  shortTitle: "吊り角度逆算",
  summary:
    "吊り幅（アイ間距離）と、吊り点までの高さ／ワイヤ1本の長さのどちらかから、吊り角度と必要なワイヤ長さを逆算します。玉掛けワイヤの安全荷重計算機の入力（吊り角度）を現場寸法から求める補助ツールです。",
  fields: [
    {
      kind: "number",
      id: "b",
      label: "吊り幅（アイ間距離）",
      unit: "m",
      min: 0.1,
      max: 20,
      step: 0.01,
      defaultValue: 2,
    },
    {
      kind: "select",
      id: "inputMode",
      label: "もう1つの入力",
      options: [
        { value: "height", label: "吊り点までの高さから求める" },
        { value: "wireLength", label: "ワイヤ1本の長さから求める" },
      ],
      defaultValue: "height",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "h",
      label: "吊り点までの高さ",
      unit: "m",
      min: 0.1,
      max: 20,
      step: 0.01,
      defaultValue: 1.73,
      help: "「高さから求める」を選んだときに使用",
    },
    {
      kind: "number",
      id: "wireLength",
      label: "ワイヤ1本の長さ",
      unit: "m",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 2.0,
      help: "「ワイヤ長さから求める」を選んだときに使用",
    },
  ],
  basis: [
    {
      label: "幾何学的な逆算式（三角関数）",
      description:
        "吊り幅（アイ間距離）b・吊り点までの高さ h・ワイヤ1本の長さ L は直角三角形の関係（tan(θ/2)=(b/2)/h、L=√(h²+(b/2)²)）にあります。法令の数値ではなく幾何学的に一意に定まる計算です。",
    },
    {
      label: "クレーン等安全規則 第213条・玉掛けワイヤの張力増加係数との関係",
      description:
        "求めた吊り角度は「玉掛けワイヤロープの安全荷重・張力計算」計算機（sling-wire-load）の入力にそのまま使えます。張力増加係数 1/cos(θ/2) は同計算機と同じ式です。",
      lawNaviPath: "/law-navi/347M50002000034/213",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_213",
    },
  ],
  cautions: [
    "本計算はフック・シャックル等の金具の大きさを無視した理想的な幾何計算です。実際の取付け位置・金具寸法を含めた現場実測で最終確認してください。",
    "吊り角度が60°を超えると玉掛けワイヤの張力が急増します。安全荷重は「玉掛けワイヤロープの安全荷重・張力計算」計算機で必ず確認してください。",
  ],
  examples: [
    { label: "吊り幅2m・高さ1.73m→角度60°", values: { b: 2, inputMode: "height", h: 1.7320508, wireLength: 2.0 } },
    { label: "吊り幅2m・ワイヤ長2.0m→角度60°", values: { b: 2, inputMode: "wireLength", h: 1.73, wireLength: 2.0 } },
    { label: "吊り幅3m・高さ1m（急角度）", values: { b: 3, inputMode: "height", h: 1, wireLength: 2.0 } },
  ],
  keywords: [
    "吊り角度",
    "つり角度",
    "玉掛け",
    "揚重",
    "ワイヤ長さ",
    "吊り幅",
    "アイ間距離",
    "逆算",
    "角度計算",
  ],
  relatedSlugs: ["sling-wire-load"],
  compute: computeSlingAngleGeometry,
};
