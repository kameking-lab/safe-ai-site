/**
 * 電圧降下（内線規程）チェック（電線許容電流「cable-ampacity」の姉妹版）
 *
 * 根拠（出典明記・一次資料で必ず確認）:
 * - 内線規程（JEAC 8001）1310節「電圧降下」の簡略計算式（力率を考慮しない直流式に近似した実務式）:
 *     単相2線式・単相3線式（中性線・外側線間）: e = 35.6・L・I / (1,000・A)
 *     三相3線式: e = 30.8・L・I / (1,000・A)
 *   （L=こう長[m]、I=電流[A]、A=電線の公称断面積[mm²]、e=電圧降下[V]）
 * - 内線規程の電圧降下の目安（低圧で電気事業者から供給を受ける場合）:
 *     原則: 幹線・分岐回路の電圧降下の合計を標準電圧の2%以下とする。
 *     ただし、こう長が長い場合は区分に応じて緩和できる（代表値）:
 *       こう長120m以下: 4%以下 / 200m以下: 5%以下 / 200m超: 6%以下
 *   係数（35.6/30.8）・許容率の区分は版により変わり得るため、内線規程の最新版で必ず確認すること。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。※本計算は概算・参考値。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type VoltagePhase = "single_2wire" | "three_3wire" | "single_3wire";

export const PHASE_COEFFICIENT: Record<VoltagePhase, number> = {
  single_2wire: 35.6,
  three_3wire: 30.8,
  single_3wire: 35.6,
};

export const PHASE_LABELS: Record<VoltagePhase, string> = {
  single_2wire: "単相2線式（係数35.6）",
  three_3wire: "三相3線式（係数30.8）",
  single_3wire: "単相3線式・中性線と外側線間（係数35.6）",
};

export type AllowanceCategory = "general2" | "under120" | "under200" | "over200";

export const ALLOWANCE_PERCENT: Record<AllowanceCategory, number> = {
  general2: 2,
  under120: 4,
  under200: 5,
  over200: 6,
};

export const ALLOWANCE_LABELS: Record<AllowanceCategory, string> = {
  general2: "原則（標準電圧の2%以下）",
  under120: "こう長60m超〜120m以下（4%以下）",
  under200: "こう長120m超〜200m以下（5%以下）",
  over200: "こう長200m超（6%以下）",
};

/** 電圧降下 e = 係数 × L × I / (1000 × A) [V]（内線規程の簡略計算式） */
export function voltageDropV(coefficient: number, lengthM: number, currentA: number, sizeMm2: number): number {
  return (coefficient * lengthM * currentA) / (1000 * sizeMm2);
}

function computeVoltageDrop(values: CalcValues): CalcOutcome {
  const phase = String(values.phase) as VoltagePhase;
  const lengthM = values.lengthM as number;
  const currentA = values.currentA as number;
  const sizeMm2 = Number(values.sizeMm2);
  const standardVoltageV = Number(values.standardVoltageV);
  const allowance = String(values.allowance) as AllowanceCategory;

  const coefficient = PHASE_COEFFICIENT[phase];
  const eV = voltageDropV(coefficient, lengthM, currentA, sizeMm2);
  const actualPercent = (eV / standardVoltageV) * 100;
  const allowedPercent = ALLOWANCE_PERCENT[allowance];
  const allowedVoltsV = (standardVoltageV * allowedPercent) / 100;
  const ok = eV <= allowedVoltsV + 1e-9;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(
      `電圧降下${formatNumber(eV, 2)}Vが許容値${formatNumber(allowedVoltsV, 2)}Vを超えています。電線を太くする・こう長を短くする・電流を分割する等の対策が必要です。`,
    );
  }
  warnings.push(
    "電圧降下の計算式（係数35.6/30.8）・許容電圧降下率の区分は内線規程の版により変わり得ます。最新版で必ず確認してください。本計算は力率を考慮しない簡略式（直流式に近似）の概算です。",
  );
  warnings.push(
    "許容電流（電線が流せる上限）は別基準です。「電線（600V IV）の許容電流チェック」計算機（cable-ampacity）とセットで確認してください。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "許容範囲内" : "許容超過",
    value: formatNumber(eV, 2),
    unit: "V",
    summary: ok
      ? `${PHASE_LABELS[phase]}・こう長${formatNumber(lengthM, 0)}m・電流${formatNumber(currentA, 0)}A・断面積${formatNumber(sizeMm2, 2)}mm²の電圧降下は${formatNumber(eV, 2)}V（${formatNumber(actualPercent, 1)}%）で、許容値${formatNumber(allowedPercent, 0)}%以下を満たします。`
      : `${PHASE_LABELS[phase]}の電圧降下は${formatNumber(eV, 2)}V（${formatNumber(actualPercent, 1)}%）で、許容値${formatNumber(allowedPercent, 0)}%（${formatNumber(allowedVoltsV, 2)}V）を超えています。`,
    items: [
      { label: "電圧降下 e", value: `${formatNumber(eV, 2)}V`, tone: ok ? "safe" : "danger" },
      { label: "標準電圧に対する割合", value: `${formatNumber(actualPercent, 1)}%`, tone: ok ? "safe" : "danger" },
      { label: "許容電圧降下（この区分）", value: `${formatNumber(allowedPercent, 0)}%（${formatNumber(allowedVoltsV, 2)}V）`, note: ALLOWANCE_LABELS[allowance] },
      { label: "配線方式", value: PHASE_LABELS[phase] },
      { label: "こう長・電流・断面積", value: `${formatNumber(lengthM, 0)}m・${formatNumber(currentA, 0)}A・${formatNumber(sizeMm2, 2)}mm²` },
    ],
    steps: [
      `e = 係数${formatNumber(coefficient, 1)} × こう長${formatNumber(lengthM, 0)}m × 電流${formatNumber(currentA, 0)}A ÷ (1000 × 断面積${formatNumber(sizeMm2, 2)}mm²) = ${formatNumber(eV, 2)}V`,
      `標準電圧${formatNumber(standardVoltageV, 0)}Vに対する割合 = ${formatNumber(eV, 2)} ÷ ${formatNumber(standardVoltageV, 0)} × 100 = ${formatNumber(actualPercent, 1)}%`,
      `許容電圧降下（${ALLOWANCE_LABELS[allowance]}）= ${formatNumber(allowedPercent, 0)}% = ${formatNumber(allowedVoltsV, 2)}V`,
      `判定: ${formatNumber(eV, 2)}V ${ok ? "≤" : ">"} ${formatNumber(allowedVoltsV, 2)}V → ${ok ? "許容範囲内" : "許容超過"}`,
    ],
    warnings,
  };
}

export const voltageDropCalculator: ConstructionCalculator = {
  slug: "voltage-drop",
  title: "電圧降下チェック（内線規程）",
  shortTitle: "電圧降下チェック",
  summary:
    "こう長・電流・電線サイズから内線規程の簡略式で電圧降下を計算し、標準電圧に対する許容電圧降下率と比較します。電線許容電流チェック（cable-ampacity）の姉妹版です。",
  fields: [
    {
      kind: "select",
      id: "phase",
      label: "配線方式",
      options: [
        { value: "single_2wire", label: "単相2線式" },
        { value: "three_3wire", label: "三相3線式" },
        { value: "single_3wire", label: "単相3線式（中性線-外側線間）" },
      ],
      defaultValue: "single_2wire",
    },
    {
      kind: "number",
      id: "lengthM",
      label: "こう長",
      unit: "m",
      min: 1,
      max: 300,
      step: 1,
      defaultValue: 50,
    },
    {
      kind: "number",
      id: "currentA",
      label: "電流",
      unit: "A",
      min: 0.1,
      max: 400,
      step: 1,
      defaultValue: 20,
    },
    {
      kind: "select",
      id: "sizeMm2",
      label: "電線の公称断面積",
      options: [
        { value: "1.25", label: "1.25mm²" },
        { value: "2", label: "2mm²" },
        { value: "3.5", label: "3.5mm²" },
        { value: "5.5", label: "5.5mm²" },
        { value: "8", label: "8mm²" },
        { value: "14", label: "14mm²" },
        { value: "22", label: "22mm²" },
        { value: "38", label: "38mm²" },
        { value: "60", label: "60mm²" },
        { value: "100", label: "100mm²" },
      ],
      defaultValue: "5.5",
    },
    {
      kind: "select",
      id: "standardVoltageV",
      label: "標準電圧",
      options: [
        { value: "100", label: "100V" },
        { value: "200", label: "200V" },
        { value: "400", label: "400V" },
      ],
      defaultValue: "100",
      help: "電圧降下率(%)の計算に使用します",
    },
    {
      kind: "select",
      id: "allowance",
      label: "許容電圧降下の区分",
      options: [
        { value: "general2", label: "原則（2%以下）" },
        { value: "under120", label: "こう長60m超〜120m以下（4%以下）" },
        { value: "under200", label: "こう長120m超〜200m以下（5%以下）" },
        { value: "over200", label: "こう長200m超（6%以下）" },
      ],
      defaultValue: "general2",
      help: "内線規程の代表的な区分。実際の適用は内線規程の最新版・供給形態で確認",
    },
  ],
  basis: [
    {
      label: "内線規程（JEAC 8001）1310節「電圧降下」の簡略計算式・許容電圧降下率",
      description:
        "単相2線式・単相3線式は e=35.6LI/(1000A)、三相3線式は e=30.8LI/(1000A)（力率を考慮しない簡略式）。許容電圧降下は原則2%、こう長が長い場合は区分に応じて4〜6%に緩和できる代表値です。内線規程は民間規程（技術資料）で、係数・許容率は版により変わり得るため最新版で必ず確認してください。",
    },
    {
      label: "電線（600V IV）の許容電流チェック（cable-ampacity）との関係",
      description:
        "電圧降下と許容電流は別基準です。電線サイズを決めるときは、電圧降下の許容と併せて許容電流（cable-ampacity）も必ず確認してください。",
    },
  ],
  cautions: [
    "本計算は力率を考慮しない内線規程の簡略式（直流式に近似）による概算です。長距離・大電流・力率が低い負荷では別途精算が必要です。",
    "許容電圧降下率の区分（2/4/5/6%）は代表的な目安です。実際の適用区分・供給形態（高圧受電・自家用発電設備等）は内線規程の最新版で確認してください。",
    "電気工事は電気工事士等の有資格者が施工してください。",
  ],
  examples: [
    { label: "単相2線式 5.5mm²・こう長50m・20A", values: { phase: "single_2wire", lengthM: 50, currentA: 20, sizeMm2: "5.5", standardVoltageV: "100", allowance: "general2" } },
    { label: "三相3線式 14mm²・こう長30m・15A・200V", values: { phase: "three_3wire", lengthM: 30, currentA: 15, sizeMm2: "14", standardVoltageV: "200", allowance: "general2" } },
  ],
  keywords: [
    "電圧降下",
    "内線規程",
    "電線",
    "こう長",
    "配線",
    "サイズ選定",
    "電気",
    "断面積",
    "許容電圧降下",
  ],
  relatedSlugs: ["cable-ampacity"],
  compute: computeVoltageDrop,
};
