/**
 * 単純梁・片持ち梁のたわみ／曲げ応力の概算（仮設材プリセット: 単管STK500・H形鋼）
 *
 * 根拠（材料力学の公表式・断面性能はJIS一次資料で確認）:
 * - 単純梁・等分布荷重 w: 最大たわみ δ = 5wL⁴/(384EI)、最大曲げモーメント M = wL²/8
 * - 片持ち梁・先端集中荷重 P: 最大たわみ δ = PL³/(3EI)、最大曲げモーメント M = PL
 * - 曲げ応力 σ = M/Z
 * - 断面性能（I・Z）:
 *   - 単管パイプ（一般構造用炭素鋼管 JIS G3444 3種 STK500・外径48.6mm・肉厚2.4mm）は
 *     中空円筒の断面二次モーメント I=π/64(D⁴-d⁴)・断面係数 Z=I/(D/2) から幾何学的に算出する
 *     （メーカー公表値 I=9.32cm⁴・Z=3.83cm³と一致することを外部突合で確認）。
 *   - H形鋼（一般構造用 JIS G3192・H100〜H200の広幅系列）はJIS標準断面表の公表値を収録。
 * - ヤング係数 E=205,000N/mm²（鋼材の一般値・鋼構造設計規準）。
 * - 許容曲げ応力度・許容たわみ比（スパン/n）は用途・仮設指針により異なるため、
 *   現場の設計基準に応じて入力すること（本計算機は既定の代表値を強制しない）。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。座屈・複合応力・接合部は範囲外。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type BeamCase = "simple_udl" | "cantilever_point";

export type SectionKey = "pipe48_6" | "h100" | "h125" | "h150" | "h175" | "h200" | "custom";

export type SectionProps = {
  label: string;
  /** 断面二次モーメント [cm4] */
  iCm4: number;
  /** 断面係数 [cm3] */
  zCm3: number;
};

/** 単管パイプ（JIS G3444 STK500・外径D[mm]・肉厚t[mm]）の断面二次モーメント・断面係数を幾何学的に算出 */
export function tubeSectionProps(outerDiameterMm: number, thicknessMm: number): { iCm4: number; zCm3: number } {
  const d = outerDiameterMm - 2 * thicknessMm;
  const iMm4 = (Math.PI / 64) * (outerDiameterMm ** 4 - d ** 4);
  const zMm3 = iMm4 / (outerDiameterMm / 2);
  return { iCm4: iMm4 / 1e4, zCm3: zMm3 / 1e3 };
}

const PIPE_48_6 = tubeSectionProps(48.6, 2.4);

/** JIS G3192（一般構造用H形鋼・広幅系列）標準断面表の公表値（強軸まわり） */
export const SECTION_PRESETS: Record<Exclude<SectionKey, "custom">, SectionProps> = {
  pipe48_6: { label: "単管パイプ STK500 φ48.6×2.4mm", iCm4: PIPE_48_6.iCm4, zCm3: PIPE_48_6.zCm3 },
  h100: { label: "H形鋼 100×100×6×8", iCm4: 378, zCm3: 75.6 },
  h125: { label: "H形鋼 125×125×6.5×9", iCm4: 839, zCm3: 134 },
  h150: { label: "H形鋼 150×150×7×10", iCm4: 1620, zCm3: 216 },
  h175: { label: "H形鋼 175×175×7.5×11", iCm4: 2900, zCm3: 331 },
  h200: { label: "H形鋼 200×200×8×12", iCm4: 4720, zCm3: 472 },
};

export type DeflectionRatioKey = "300" | "250" | "200" | "150";

export const DEFLECTION_RATIO_LABELS: Record<DeflectionRatioKey, string> = {
  "300": "スパン/300（一般的な仮設材の目安）",
  "250": "スパン/250",
  "200": "スパン/200",
  "150": "スパン/150",
};

/** 単純梁・等分布荷重／片持ち梁・先端集中荷重の最大たわみ[mm]・最大曲げモーメント[N・mm] */
export function beamMaxDeflectionAndMoment(params: {
  caseType: BeamCase;
  spanM: number;
  udlKnPerM: number;
  pointKn: number;
  eNmm2: number;
  iCm4: number;
}): { deflectionMm: number; momentNmm: number } {
  const { caseType, spanM, udlKnPerM, pointKn, eNmm2, iCm4 } = params;
  const spanMm = spanM * 1000;
  const iMm4 = iCm4 * 1e4;
  if (caseType === "simple_udl") {
    const wNPerMm = udlKnPerM; // 1 kN/m = 1 N/mm
    const deflectionMm = (5 * wNPerMm * spanMm ** 4) / (384 * eNmm2 * iMm4);
    const momentNmm = (wNPerMm * spanMm ** 2) / 8;
    return { deflectionMm, momentNmm };
  }
  const pN = pointKn * 1000;
  const deflectionMm = (pN * spanMm ** 3) / (3 * eNmm2 * iMm4);
  const momentNmm = pN * spanMm;
  return { deflectionMm, momentNmm };
}

function computeBeamDeflection(values: CalcValues): CalcOutcome {
  const caseType = String(values.caseType) as BeamCase;
  const spanM = values.spanM as number;
  const udlKnPerM = values.udlKnPerM as number;
  const pointKn = values.pointKn as number;
  const sectionKey = String(values.section) as SectionKey;
  const customICm4 = values.customICm4 as number;
  const customZCm3 = values.customZCm3 as number;
  const eNmm2 = values.eNmm2 as number;
  const allowableStressNmm2 = values.allowableStressNmm2 as number;
  const deflectionRatio = String(values.deflectionRatio) as DeflectionRatioKey;

  const section: SectionProps =
    sectionKey === "custom"
      ? { label: "手入力（I・Z直接指定）", iCm4: customICm4, zCm3: customZCm3 }
      : SECTION_PRESETS[sectionKey];

  const { deflectionMm, momentNmm } = beamMaxDeflectionAndMoment({
    caseType,
    spanM,
    udlKnPerM,
    pointKn,
    eNmm2,
    iCm4: section.iCm4,
  });
  const zMm3 = section.zCm3 * 1e3;
  const stressNmm2 = momentNmm / zMm3;
  const momentKnm = momentNmm / 1e6;

  const ratioDivisor = Number(deflectionRatio);
  const allowableDeflectionMm = (spanM * 1000) / ratioDivisor;

  const deflectionOk = deflectionMm <= allowableDeflectionMm + 1e-6;
  const stressOk = stressNmm2 <= allowableStressNmm2 + 1e-6;
  const ok = deflectionOk && stressOk;

  const caseLabel = caseType === "simple_udl" ? "単純梁・等分布荷重" : "片持ち梁・先端集中荷重";
  const loadLabel = caseType === "simple_udl" ? `${formatNumber(udlKnPerM, 2)}kN/m` : `${formatNumber(pointKn, 2)}kN`;

  const warnings: string[] = [];
  if (!deflectionOk) {
    warnings.push(
      `最大たわみ${formatNumber(deflectionMm, 1)}mmが許容値${formatNumber(allowableDeflectionMm, 1)}mm（${DEFLECTION_RATIO_LABELS[deflectionRatio]}）を超えています。断面を大きくする・スパンを短くする・支持点を増やす等の対策が必要です。`,
    );
  }
  if (!stressOk) {
    warnings.push(
      `最大曲げ応力${formatNumber(stressNmm2, 1)}N/mm²が許容応力度${formatNumber(allowableStressNmm2, 0)}N/mm²を超えています。`,
    );
  }
  warnings.push(
    "座屈（特に単管の圧縮材としての座屈）・複合応力・接合部（クランプ・継手）の耐力は本計算の範囲外です。仮設指針・鋼構造設計規準で別途照査してください。",
  );
  warnings.push(
    "許容たわみ比・許容応力度は用途で異なります。掲載値は代表的な目安であり、実際の適用は仮設工業会の指針・設計図書で確認してください。",
  );
  if (sectionKey === "custom") {
    warnings.push("手入力モードでは、入力したI・Z・ヤング係数の妥当性はご自身で確認してください。");
  }

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "許容範囲内" : "許容超過",
    value: formatNumber(deflectionMm, 1),
    unit: "mm",
    summary: ok
      ? `${caseLabel}（${section.label}・スパン${formatNumber(spanM, 2)}m・荷重${loadLabel}）の最大たわみは${formatNumber(deflectionMm, 1)}mm、最大曲げ応力は${formatNumber(stressNmm2, 1)}N/mm²で、いずれも許容範囲内です。`
      : `${caseLabel}（${section.label}）の最大たわみ${formatNumber(deflectionMm, 1)}mm・最大曲げ応力${formatNumber(stressNmm2, 1)}N/mm²のうち、許容値を超える項目があります。`,
    items: [
      { label: "最大たわみ", value: `${formatNumber(deflectionMm, 1)}mm`, tone: deflectionOk ? "safe" : "danger", note: `許容 ${formatNumber(allowableDeflectionMm, 1)}mm（${DEFLECTION_RATIO_LABELS[deflectionRatio]}）` },
      { label: "最大曲げモーメント", value: `${formatNumber(momentKnm, 2)}kN・m` },
      { label: "最大曲げ応力", value: `${formatNumber(stressNmm2, 1)}N/mm²`, tone: stressOk ? "safe" : "danger", note: `許容応力度 ${formatNumber(allowableStressNmm2, 0)}N/mm²` },
      { label: "使用断面", value: section.label, note: `I=${formatNumber(section.iCm4, 2)}cm⁴・Z=${formatNumber(section.zCm3, 2)}cm³` },
      { label: "ヤング係数", value: `${formatNumber(eNmm2, 0)}N/mm²` },
    ],
    steps: [
      caseType === "simple_udl"
        ? `δ = 5wL⁴/(384EI)、M = wL²/8（単純梁・等分布荷重）`
        : `δ = PL³/(3EI)、M = PL（片持ち梁・先端集中荷重）`,
      `最大たわみ = ${formatNumber(deflectionMm, 1)}mm（スパン${formatNumber(spanM, 2)}m・${section.label}・E=${formatNumber(eNmm2, 0)}N/mm²）`,
      `最大曲げモーメント = ${formatNumber(momentKnm, 2)}kN・m → 曲げ応力 σ=M/Z = ${formatNumber(stressNmm2, 1)}N/mm²`,
      `判定: たわみ ${formatNumber(deflectionMm, 1)}mm ${deflectionOk ? "≤" : ">"} 許容${formatNumber(allowableDeflectionMm, 1)}mm ／ 応力 ${formatNumber(stressNmm2, 1)}N/mm² ${stressOk ? "≤" : ">"} 許容${formatNumber(allowableStressNmm2, 0)}N/mm² → ${ok ? "許容範囲内" : "許容超過"}`,
    ],
    warnings,
  };
}

export const beamDeflectionCalculator: ConstructionCalculator = {
  slug: "beam-deflection",
  title: "単純梁・片持ち梁のたわみ／曲げ応力概算",
  shortTitle: "梁のたわみ計算",
  summary:
    "仮設材（単管STK500・H形鋼）の単純梁（等分布荷重）・片持ち梁（先端集中荷重）の最大たわみ・最大曲げ応力を概算し、許容たわみ比・許容応力度で判定します。断面はプリセットまたはI・Z直接入力に対応します。",
  fields: [
    {
      kind: "select",
      id: "caseType",
      label: "梁の種類・荷重",
      options: [
        { value: "simple_udl", label: "単純梁・等分布荷重" },
        { value: "cantilever_point", label: "片持ち梁・先端集中荷重" },
      ],
      defaultValue: "simple_udl",
    },
    {
      kind: "number",
      id: "spanM",
      label: "スパン（支点間距離／張り出し長さ）",
      unit: "m",
      min: 0.1,
      max: 20,
      step: 0.05,
      defaultValue: 2,
    },
    {
      kind: "number",
      id: "udlKnPerM",
      label: "等分布荷重",
      unit: "kN/m",
      min: 0.01,
      max: 100,
      step: 0.01,
      defaultValue: 1,
      help: "「単純梁・等分布荷重」のときに使用",
    },
    {
      kind: "number",
      id: "pointKn",
      label: "先端集中荷重",
      unit: "kN",
      min: 0.01,
      max: 200,
      step: 0.01,
      defaultValue: 0.5,
      help: "「片持ち梁・先端集中荷重」のときに使用",
    },
    {
      kind: "select",
      id: "section",
      label: "断面（プリセット／手入力）",
      options: [
        { value: "pipe48_6", label: "単管パイプ STK500 φ48.6×2.4mm" },
        { value: "h100", label: "H形鋼 100×100×6×8" },
        { value: "h125", label: "H形鋼 125×125×6.5×9" },
        { value: "h150", label: "H形鋼 150×150×7×10" },
        { value: "h175", label: "H形鋼 175×175×7.5×11" },
        { value: "h200", label: "H形鋼 200×200×8×12" },
        { value: "custom", label: "手入力（I・Zを指定）" },
      ],
      defaultValue: "pipe48_6",
    },
    {
      kind: "number",
      id: "customICm4",
      label: "断面二次モーメント I（手入力時）",
      unit: "cm⁴",
      min: 0.1,
      max: 100000,
      step: 0.1,
      defaultValue: 9.32,
      help: "断面「手入力」を選んだときのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "customZCm3",
      label: "断面係数 Z（手入力時）",
      unit: "cm³",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 3.83,
      help: "断面「手入力」を選んだときのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "eNmm2",
      label: "ヤング係数 E",
      unit: "N/mm²",
      min: 50000,
      max: 250000,
      step: 1000,
      defaultValue: 205000,
      help: "鋼材の一般値205,000N/mm²",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "allowableStressNmm2",
      label: "許容曲げ応力度",
      unit: "N/mm²",
      min: 10,
      max: 300,
      step: 1,
      defaultValue: 156,
      help: "SS400鋼材の長期許容曲げ応力度の目安（F=235N/mm²÷1.5）。使用鋼材の規格で確認",
      aiOptional: true,
    },
    {
      kind: "select",
      id: "deflectionRatio",
      label: "許容たわみ比",
      options: [
        { value: "300", label: "スパン/300" },
        { value: "250", label: "スパン/250" },
        { value: "200", label: "スパン/200" },
        { value: "150", label: "スパン/150" },
      ],
      defaultValue: "300",
      help: "用途で異なるため仮設指針・設計図書の値を選択",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "材料力学の公表式（単純梁の等分布荷重・片持ち梁の先端集中荷重）",
      description:
        "単純梁・等分布荷重: δ=5wL⁴/(384EI)、M=wL²/8。片持ち梁・先端集中荷重: δ=PL³/(3EI)、M=PL。曲げ応力 σ=M/Z。法令ではなく材料力学の一般公式です。",
    },
    {
      label: "断面性能（単管パイプ JIS G3444 STK500・H形鋼 JIS G3192）",
      description:
        "単管パイプ（外径48.6mm・肉厚2.4mm）は中空円筒の断面二次モーメント・断面係数を幾何学的に算出（メーカー公表値 I=9.32cm⁴・Z=3.83cm³と一致）。H形鋼（H100〜H200）はJIS G3192標準断面表の公表値です。確定できない断面はI・Zの手入力に対応します。",
    },
    {
      label: "鋼材のヤング係数・許容曲げ応力度の一般値（鋼構造設計規準）",
      description: "ヤング係数E=205,000N/mm²は鋼材の一般値。許容曲げ応力度・許容たわみ比は用途で異なるため入力式とし、代表的な目安のみ既定値としています。",
    },
  ],
  cautions: [
    "座屈（特に単管を圧縮材として使う場合）・複合応力・接合部（クランプ・継手・溶接部）の検討は本計算の範囲外です。仮設工業会の指針・鋼構造設計規準で別途照査してください。",
    "許容たわみ比・許容応力度は用途（型枠支保工・足場材・仮設構台等）で異なります。掲載の既定値は代表的な目安であり、実際の適用は設計図書・仮設指針で確認してください。",
    "断面性能（I・Z）はJIS標準断面表に基づく代表値です。使用する実際の鋼材の規格証明書・メーカー仕様で最終確認してください。",
  ],
  examples: [
    { label: "単管・スパン2m・等分布1kN/m", values: { caseType: "simple_udl", spanM: 2, udlKnPerM: 1, pointKn: 0.5, section: "pipe48_6", customICm4: 9.32, customZCm3: 3.83, eNmm2: 205000, allowableStressNmm2: 156, deflectionRatio: "300" } },
    { label: "H150・スパン4m・等分布2kN/m", values: { caseType: "simple_udl", spanM: 4, udlKnPerM: 2, pointKn: 0.5, section: "h150", customICm4: 9.32, customZCm3: 3.83, eNmm2: 205000, allowableStressNmm2: 156, deflectionRatio: "300" } },
    { label: "単管の片持ち・張り出し1m・先端荷重0.5kN", values: { caseType: "cantilever_point", spanM: 1, udlKnPerM: 1, pointKn: 0.5, section: "pipe48_6", customICm4: 9.32, customZCm3: 3.83, eNmm2: 205000, allowableStressNmm2: 156, deflectionRatio: "300" } },
  ],
  keywords: [
    "たわみ",
    "曲げ応力",
    "梁",
    "単純梁",
    "片持ち梁",
    "単管",
    "H形鋼",
    "断面二次モーメント",
    "断面係数",
    "仮設材",
    "支保工",
  ],
  relatedSlugs: ["formwork-shoring-check"],
  compute: computeBeamDeflection,
};
