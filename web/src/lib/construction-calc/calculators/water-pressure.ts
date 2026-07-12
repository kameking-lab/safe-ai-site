/**
 * 水圧の概算（静水圧・揚圧（浮き上がり）・限界動水勾配（ボイリング／クイックサンド））
 *
 * 根拠・出典（数式はすべて公表された土質力学の一般理論に基づく）:
 * - 静水圧: p = γw・h（γw=9.81kN/m³）、単位幅あたりの合力（三角形分布）P = ½・γw・h²。
 *   土圧計算機（`earth-pressure-shoring`）の水圧項の単独版。矢板・釜場排水の検討補助。
 * - 揚圧（浮き上がり）: 底版下面の揚圧 = γw・hw（被圧/地下水位差 hw）。
 *   浮き上がり安全率 = 押さえ荷重 ÷ 揚圧合力。
 * - 限界動水勾配（ボイリング・クイックサンドの起点。Terzaghi のボイリング理論）:
 *     icr = (Gs−1)/(1+e)（Gs=土粒子の比重、e=間隙比。代表値で icr≒1.0）
 *   安全率 Fs = icr / i（i=動水勾配=水頭差 Δh ÷ 浸透経路長 L）。
 *   Gs・e は土質試験値を入力する（勝手な既定値は使わない代表値のみプリセット）。
 * - 出典: 土質力学の一般理論（Terzaghi・ランキン系）／道路土工 仮設構造物工指針（日本道路協会）。
 *
 * 判定は決定論（AIは使わない）。被圧地下水・盤ぶくれ（ヒービング／ボイリング）の最終判断は
 * 専門技術者が行う。本計算は概算の確認補助。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 水の単位体積重量 [kN/m³] */
export const GAMMA_WATER = 9.81;

export type WaterCalcMode = "hydrostatic" | "uplift" | "boiling";

/** 静水圧: 深さhでの圧力p [kN/m²]、単位幅あたりの合力P（三角形分布）[kN/m] */
export function hydrostaticPressure(h: number): { p: number; resultant: number } {
  const p = GAMMA_WATER * h;
  return { p, resultant: 0.5 * GAMMA_WATER * h * h };
}

/** 揚圧: 底面の揚圧p=γw・hw [kN/m²]、揚圧合力=p×面積 [kN] */
export function upliftPressure(hw: number, area: number): { p: number; force: number } {
  const p = GAMMA_WATER * hw;
  return { p, force: p * area };
}

/** 限界動水勾配 icr=(Gs−1)/(1+e) */
export function criticalHydraulicGradient(Gs: number, e: number): number {
  return (Gs - 1) / (1 + e);
}

/** 浮き上がり／ボイリング安全率の判定しきい値（一般的な実務目安。採用指針の最新値で必ず確認） */
export const WATER_SAFETY_THRESHOLDS = {
  uplift: { safe: 1.2, warning: 1.0 },
  boiling: { safe: 1.5, warning: 1.2 },
} as const;

function safetyTone(fs: number, safe: number, warning: number): "safe" | "warning" | "danger" {
  if (fs >= safe) return "safe";
  if (fs >= warning) return "warning";
  return "danger";
}

function computeWaterPressure(values: CalcValues): CalcOutcome {
  const mode = values.calcMode as WaterCalcMode;
  const waterHead = values.waterHead as number;
  const holdingArea = values.holdingArea as number;
  const holdingLoad = values.holdingLoad as number;
  const seepageHeadDiff = values.seepageHeadDiff as number;
  const seepagePathLength = values.seepagePathLength as number;
  const soilGs = values.soilGs as number;
  const soilVoidRatio = values.soilVoidRatio as number;

  if (mode === "hydrostatic") {
    const { p, resultant } = hydrostaticPressure(waterHead);
    const items: CalcCheckItem[] = [
      { label: "水深・水位差 h", value: `${formatNumber(waterHead, 2)} m` },
      { label: "静水圧 p（深さhでの側圧）", value: `${formatNumber(p, 1)} kN/m²`, note: "p = γw・h" },
      {
        label: "静水圧の合力 P（単位幅・三角形分布）",
        value: `${formatNumber(resultant, 1)} kN/m`,
        tone: "warning",
        note: "壁1mあたり。矢板・土止め支保工の設計外力の目安",
      },
    ];
    return {
      tone: "warning",
      headline: "静水圧を算定",
      value: formatNumber(resultant, 1),
      unit: "kN/m",
      summary: `水深・水位差 ${formatNumber(waterHead, 2)}m の静水圧合力は約 ${formatNumber(resultant, 1)} kN/m（深さh位置の圧力 ${formatNumber(p, 1)} kN/m²）です。`,
      items,
      steps: [
        `静水圧 p = γw・h = 9.81 × ${formatNumber(waterHead, 2)} = ${formatNumber(p, 2)} kN/m²`,
        `合力 P = ½・γw・h² = ½ × 9.81 × ${formatNumber(waterHead, 2)}² = ${formatNumber(resultant, 2)} kN/m`,
      ],
      warnings: [
        "静水圧は水深に比例する三角形分布です。土圧と重ね合わせて側圧を検討する場合は土圧計算機（土圧の概算）を参照してください。",
        "被圧地下水（地下水位より高い水頭を持つ被圧帯水層）がある場合、実際の水圧はここでの自由地下水の想定より大きくなることがあります。ボーリング調査・水位観測で確認してください。",
        "排水（釜場・ディープウェル等）・止水（薬液注入・止水壁）の工法により実際に作用する水圧は変わります。施工計画に応じて専門技術者が検討してください。",
      ],
    };
  }

  if (mode === "uplift") {
    const { p, force } = upliftPressure(waterHead, holdingArea);
    const fs = force > 0 ? holdingLoad / force : Infinity;
    const th = WATER_SAFETY_THRESHOLDS.uplift;
    const tone = safetyTone(fs, th.safe, th.warning);
    const items: CalcCheckItem[] = [
      { label: "被圧・地下水位差 hw", value: `${formatNumber(waterHead, 2)} m` },
      { label: "底面の揚圧 p", value: `${formatNumber(p, 1)} kN/m²`, note: "p = γw・hw" },
      { label: "押さえ面積", value: `${formatNumber(holdingArea, 1)} m²` },
      { label: "揚圧合力", value: `${formatNumber(force, 1)} kN`, note: "揚圧合力 = p × 押さえ面積" },
      { label: "押さえ荷重（自重等）", value: `${formatNumber(holdingLoad, 1)} kN` },
      {
        label: "浮き上がり安全率 Fs",
        value: `${formatNumber(fs, 2)} 倍`,
        tone,
        note: `Fs = 押さえ荷重 ÷ 揚圧合力（目安: ${th.safe}以上）`,
      },
    ];
    return {
      tone,
      headline: tone === "safe" ? "浮き上がり安全率OK（要確認）" : tone === "warning" ? "安全率が低め" : "浮き上がりの恐れ",
      value: formatNumber(fs, 2),
      unit: "倍",
      summary: `押さえ荷重 ${formatNumber(holdingLoad, 1)}kN ÷ 揚圧合力 ${formatNumber(force, 1)}kN で、浮き上がり安全率は約 ${formatNumber(fs, 2)} 倍です。`,
      items,
      steps: [
        `揚圧 p = γw・hw = 9.81 × ${formatNumber(waterHead, 2)} = ${formatNumber(p, 2)} kN/m²`,
        `揚圧合力 = p × 押さえ面積 = ${formatNumber(p, 2)} × ${formatNumber(holdingArea, 1)} = ${formatNumber(force, 2)} kN`,
        `浮き上がり安全率 Fs = 押さえ荷重 ÷ 揚圧合力 = ${formatNumber(holdingLoad, 1)} ÷ ${formatNumber(force, 2)} = ${formatNumber(fs, 2)} 倍`,
      ],
      warnings: [
        `安全率の目安は一般に ${th.safe}以上ですが、採用する指針（道路土工 仮設構造物工指針 等）の最新版・発注者の要求値を必ず確認してください。`,
        "押さえ荷重には躯体自重・上載荷重のうち確実に期待できるもののみを見込んでください（未固定の資材等は算入しない）。",
        "被圧地下水は季節・降雨・近隣工事で水位が変動します。設計水位は最高水位を見込むなど安全側で設定してください。",
      ],
    };
  }

  // boiling
  const i = seepagePathLength > 0 ? seepageHeadDiff / seepagePathLength : Infinity;
  const icr = criticalHydraulicGradient(soilGs, soilVoidRatio);
  const fs = i > 0 ? icr / i : Infinity;
  const th = WATER_SAFETY_THRESHOLDS.boiling;
  const tone = safetyTone(fs, th.safe, th.warning);
  const items: CalcCheckItem[] = [
    { label: "水頭差 Δh", value: `${formatNumber(seepageHeadDiff, 2)} m` },
    { label: "浸透経路長 L", value: `${formatNumber(seepagePathLength, 2)} m` },
    { label: "動水勾配 i", value: formatNumber(i, 3), note: "i = Δh ÷ L" },
    { label: "土粒子の比重 Gs・間隙比 e", value: `Gs=${formatNumber(soilGs, 2)}・e=${formatNumber(soilVoidRatio, 2)}` },
    { label: "限界動水勾配 icr", value: formatNumber(icr, 3), note: "icr = (Gs−1)/(1+e)" },
    {
      label: "ボイリングに対する安全率 Fs",
      value: `${formatNumber(fs, 2)} 倍`,
      tone,
      note: `Fs = icr ÷ i（目安: ${th.safe}以上）`,
    },
  ];
  return {
    tone,
    headline: tone === "safe" ? "ボイリング安全率OK（要確認）" : tone === "warning" ? "安全率が低め" : "ボイリングの恐れ",
    value: formatNumber(fs, 2),
    unit: "倍",
    summary: `限界動水勾配 ${formatNumber(icr, 3)} ÷ 動水勾配 ${formatNumber(i, 3)} で、ボイリングに対する安全率は約 ${formatNumber(fs, 2)} 倍です。`,
    items,
    steps: [
      `動水勾配 i = Δh ÷ L = ${formatNumber(seepageHeadDiff, 2)} ÷ ${formatNumber(seepagePathLength, 2)} = ${formatNumber(i, 3)}`,
      `限界動水勾配 icr = (Gs−1)/(1+e) = (${formatNumber(soilGs, 2)}−1)/(1+${formatNumber(soilVoidRatio, 2)}) = ${formatNumber(icr, 3)}`,
      `安全率 Fs = icr ÷ i = ${formatNumber(icr, 3)} ÷ ${formatNumber(i, 3)} = ${formatNumber(fs, 2)} 倍`,
    ],
    warnings: [
      `安全率の目安は一般に ${th.safe}以上ですが、採用する指針の最新版・現場条件（不均一な浸透・パイピングの局所化）で必要な余裕は異なります。`,
      "Gs（土粒子の比重）・e（間隙比）は必ず土質試験値を用いてください。プリセットは代表値の目安です。",
      "浸透経路長Lは掘削底までの最短流線長の概算です。矢板の根入れ・地層構成により実際の経路は変わるため、フローネット等の詳細検討が必要な場合があります。",
      "ボイリング（クイックサンド）が生じると掘削底が急激に崩壊し、土止め支保工全体の崩壊に至る危険があります。恐れがある場合は排水工法（ディープウェル等）・根入れ長の見直しを専門技術者と検討してください。",
    ],
  };
}

export const waterPressureCalculator: ConstructionCalculator = {
  slug: "water-pressure",
  title: "水圧の概算（静水圧・揚圧・ボイリング）",
  shortTitle: "水圧（静水圧・揚圧）",
  summary:
    "深さ・水位差から静水圧（側圧）、揚圧（浮き上がり安全率）、ボイリング／クイックサンドの限界動水勾配に対する安全率を算定します。土圧計算機（土圧の概算）の水圧項の単独版・釜場排水/矢板の検討補助です。",
  fields: [
    {
      kind: "select",
      id: "calcMode",
      label: "計算する内容",
      options: [
        { value: "hydrostatic", label: "静水圧（側圧・合力）" },
        { value: "uplift", label: "揚圧（浮き上がり安全率）" },
        { value: "boiling", label: "ボイリング（限界動水勾配の安全率）" },
      ],
      defaultValue: "hydrostatic",
    },
    {
      kind: "number",
      id: "waterHead",
      label: "水深・水位差 h",
      unit: "m",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      help: "静水圧はこの深さの圧力を、揚圧では被圧/地下水位差 hw として使用します",
    },
    {
      kind: "number",
      id: "holdingArea",
      label: "押さえ面積（揚圧用）",
      unit: "m²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 10,
      help: "底版・構造物の底面積など、揚圧を受ける面積。揚圧モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "holdingLoad",
      label: "押さえ荷重（揚圧用）",
      unit: "kN",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 150,
      help: "躯体自重・確実に期待できる上載荷重の合計。揚圧モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "seepageHeadDiff",
      label: "水頭差 Δh（ボイリング用）",
      unit: "m",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      help: "掘削内外の水頭差。ボイリングモードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "seepagePathLength",
      label: "浸透経路長 L（ボイリング用）",
      unit: "m",
      min: 0.1,
      max: 100,
      step: 0.1,
      defaultValue: 6,
      help: "矢板の根入れ等を回り込む最短流線長の概算。ボイリングモードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "soilGs",
      label: "土粒子の比重 Gs（ボイリング用）",
      unit: "",
      min: 2.0,
      max: 3.0,
      step: 0.01,
      defaultValue: 2.65,
      help: "土質試験値。砂質土は概ね2.6〜2.7が多い（要確認）",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "soilVoidRatio",
      label: "間隙比 e（ボイリング用）",
      unit: "",
      min: 0.3,
      max: 2.0,
      step: 0.01,
      defaultValue: 0.7,
      help: "土質試験値。砂質土は概ね0.6〜0.9が多い（要確認）",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "静水圧の一般理論: p = γw・h、合力 P = ½・γw・h²（三角形分布）",
      description: "水の単位体積重量 γw=9.81kN/m³ による深さ比例の静水圧と、その合力の算定式。",
    },
    {
      label: "限界動水勾配 icr = (Gs−1)/(1+e)（Terzaghi のボイリング理論）",
      description:
        "土粒子の比重Gs・間隙比eから、動水勾配が有効応力を0にする限界値（ボイリング・クイックサンドの起点）を求める古典解。Gs・eは土質試験値を用います。",
    },
    {
      label: "道路土工 仮設構造物工指針（日本道路協会）",
      description:
        "掘削底の盤ぶくれ（ヒービング・ボイリング）・浮き上がりの検討、必要な安全率の考え方の基準。数値は最新版の指針・発注者要求で確認してください。",
    },
    {
      label: "労働安全衛生規則 第361条（地山の崩壊等による危険の防止）",
      description:
        "湧水等により地山の崩壊・土石の落下のおそれがあるときは、土止め支保工・防護網等の危険防止措置が必要です。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_361",
    },
  ],
  cautions: [
    "本計算は水圧（静水圧・揚圧・ボイリング安全率）の概算であり、土圧との重ね合わせ・矢板や底版の断面照査・排水計画の設計には代わりません。",
    "被圧地下水・盤ぶくれ（ヒービング・ボイリング）の恐れがある場合は、専門技術者による地盤調査・詳細検討が必須です。",
    "安全率の目安（揚圧1.2・ボイリング1.5）は一般的な実務目安であり、採用する指針の最新版・発注者の要求値を必ず確認してください。",
  ],
  examples: [
    { label: "静水圧: 水深3m", values: { calcMode: "hydrostatic", waterHead: 3, holdingArea: 10, holdingLoad: 150, seepageHeadDiff: 3, seepagePathLength: 6, soilGs: 2.65, soilVoidRatio: 0.7 } },
    { label: "揚圧: hw3m・面積10m²・押さえ400kN", values: { calcMode: "uplift", waterHead: 3, holdingArea: 10, holdingLoad: 400, seepageHeadDiff: 3, seepagePathLength: 6, soilGs: 2.65, soilVoidRatio: 0.7 } },
    { label: "ボイリング: Δh3m・L6m・Gs2.65・e0.7", values: { calcMode: "boiling", waterHead: 3, holdingArea: 10, holdingLoad: 150, seepageHeadDiff: 3, seepagePathLength: 6, soilGs: 2.65, soilVoidRatio: 0.7 } },
  ],
  keywords: [
    "水圧",
    "静水圧",
    "揚圧",
    "浮き上がり",
    "ボイリング",
    "クイックサンド",
    "盤ぶくれ",
    "ヒービング",
    "動水勾配",
    "限界動水勾配",
    "釜場",
    "排水",
    "被圧地下水",
    "湧水",
  ],
  relatedSlugs: ["earth-pressure-shoring"],
  compute: computeWaterPressure,
};
