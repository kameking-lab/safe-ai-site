/**
 * 土量換算（地山・ほぐし・締固め）＋10tダンプ概算台数
 *
 * 根拠（法令ではない・出典明記）:
 * - 国土交通省「土木工事数量算出要領」／「道路土工要綱」（日本道路協会）の土量変化率。
 *   L（ほぐし率）= ほぐした土量 ÷ 地山土量、C（締固め率）= 締め固めた土量 ÷ 地山土量。
 * - 収録している L・C は土質区分ごとの**代表値（参考値）**。実際の変化率は土質試験・
 *   現場条件により異なるため、設計・積算では所定の資料・試験値を用いること。
 *
 * 計算は決定論的な比率換算のみ（AIは使わない）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type SoilCategory = "sand" | "gravel" | "clay" | "soft_rock" | "hard_rock" | "custom";

/** 土質区分ごとの土量変化率 代表値（道路土工要綱等の参考値） */
export const SOIL_CHANGE_RATES: Record<Exclude<SoilCategory, "custom">, { L: number; C: number; label: string }> = {
  sand: { L: 1.2, C: 0.9, label: "砂・砂質土" },
  gravel: { L: 1.2, C: 0.93, label: "礫・礫質土" },
  clay: { L: 1.25, C: 0.9, label: "粘性土" },
  soft_rock: { L: 1.5, C: 1.15, label: "軟岩" },
  hard_rock: { L: 1.65, C: 1.3, label: "硬岩" },
};

export type SoilBaseState = "natural" | "loose" | "compacted";

export const SOIL_STATE_LABELS: Record<SoilBaseState, string> = {
  natural: "地山土量",
  loose: "ほぐし土量",
  compacted: "締固め土量",
};

/** 土質区分から L・C を取得（custom は入力値） */
export function resolveChangeRates(
  soil: SoilCategory,
  customL: number,
  customC: number,
): { L: number; C: number; label: string } {
  if (soil === "custom") return { L: customL, C: customC, label: "手入力の変化率" };
  return SOIL_CHANGE_RATES[soil];
}

function computeSoilVolume(values: CalcValues): CalcOutcome {
  const soil = String(values.soil) as SoilCategory;
  const baseState = String(values.baseState) as SoilBaseState;
  const volume = values.volume as number;
  const customL = values.customL as number;
  const customC = values.customC as number;
  const dumpCapacity = values.dumpCapacity as number; // 10tダンプ1台の積載（ほぐし土量 m³）

  const { L, C, label } = resolveChangeRates(soil, customL, customC);

  // 入力状態から地山土量を復元
  let naturalM3: number;
  if (baseState === "natural") naturalM3 = volume;
  else if (baseState === "loose") naturalM3 = volume / L;
  else naturalM3 = volume / C;

  const looseM3 = naturalM3 * L;
  const compactedM3 = naturalM3 * C;
  const dumpCount = dumpCapacity > 0 ? Math.ceil(looseM3 / dumpCapacity) : 0;

  const warnings: string[] = [];
  warnings.push(
    "土量変化率 L・C は土質区分ごとの参考代表値です。実際の値は土質試験・現場条件で異なるため、設計・積算では所定の資料・試験値を用いてください。",
  );
  warnings.push(
    `ダンプ台数は「ほぐし土量 ÷ 1台の積載土量（${formatNumber(dumpCapacity, 1)}m³）」の概算です。実際の積載量はダンプの規格・土質・すりきり/山盛りで変わります。`,
  );
  if (soil === "custom") {
    warnings.push("手入力モードでは、入力した L・C の妥当性はご自身で確認してください。");
  }

  return {
    tone: "info",
    headline: "地山土量",
    value: formatNumber(naturalM3, 1),
    unit: "m³",
    summary: `${label}（L=${formatNumber(L, 2)}・C=${formatNumber(C, 2)}）で、地山 ${formatNumber(naturalM3, 1)}m³ ＝ ほぐし ${formatNumber(looseM3, 1)}m³ ＝ 締固め ${formatNumber(compactedM3, 1)}m³。運搬は10tダンプ約${dumpCount}台です。`,
    items: [
      { label: "地山土量（掘削前の自然状態）", value: `${formatNumber(naturalM3, 1)}m³` },
      { label: "ほぐし土量（掘削・積込み後）", value: `${formatNumber(looseM3, 1)}m³`, note: `L=${formatNumber(L, 2)}` },
      { label: "締固め土量（盛土・転圧後）", value: `${formatNumber(compactedM3, 1)}m³`, note: `C=${formatNumber(C, 2)}` },
      { label: "運搬（10tダンプ概算台数）", value: `約${dumpCount}台`, note: `1台 ${formatNumber(dumpCapacity, 1)}m³（ほぐし）で計算` },
      { label: "土質区分", value: label },
    ],
    steps: [
      `土量変化率: L（ほぐし率）=${formatNumber(L, 2)} / C（締固め率）=${formatNumber(C, 2)}（${label}）`,
      baseState === "natural"
        ? `入力は地山土量 ${formatNumber(volume, 1)}m³`
        : `入力(${SOIL_STATE_LABELS[baseState]} ${formatNumber(volume, 1)}m³) ÷ ${baseState === "loose" ? `L ${formatNumber(L, 2)}` : `C ${formatNumber(C, 2)}`} = 地山 ${formatNumber(naturalM3, 1)}m³`,
      `ほぐし = 地山 ${formatNumber(naturalM3, 1)} × L ${formatNumber(L, 2)} = ${formatNumber(looseM3, 1)}m³ / 締固め = 地山 × C ${formatNumber(C, 2)} = ${formatNumber(compactedM3, 1)}m³`,
      `ダンプ台数 = ほぐし ${formatNumber(looseM3, 1)}m³ ÷ ${formatNumber(dumpCapacity, 1)}m³ = 約${dumpCount}台（切り上げ）`,
    ],
    warnings,
  };
}

export const soilVolumeConversionCalculator: ConstructionCalculator = {
  slug: "soil-volume-conversion",
  title: "土量換算（地山・ほぐし・締固め）と10tダンプ台数",
  shortTitle: "土量換算",
  summary:
    "土質区分の土量変化率（L・C）で、地山・ほぐし・締固めの3状態を相互換算し、運搬に必要な10tダンプの概算台数も求めます。変化率は道路土工要綱等の参考代表値を出典明記で収録（手入力も可）。",
  fields: [
    {
      kind: "select",
      id: "soil",
      label: "土質区分",
      options: [
        { value: "sand", label: "砂・砂質土（L1.20/C0.90）" },
        { value: "gravel", label: "礫・礫質土（L1.20/C0.93）" },
        { value: "clay", label: "粘性土（L1.25/C0.90）" },
        { value: "soft_rock", label: "軟岩（L1.50/C1.15）" },
        { value: "hard_rock", label: "硬岩（L1.65/C1.30）" },
        { value: "custom", label: "手入力（L・Cを指定）" },
      ],
      defaultValue: "sand",
      help: "代表値。実値は土質試験による",
    },
    {
      kind: "select",
      id: "baseState",
      label: "入力する土量の状態",
      options: [
        { value: "natural", label: "地山土量（掘削前）" },
        { value: "loose", label: "ほぐし土量（積込み後）" },
        { value: "compacted", label: "締固め土量（盛土後）" },
      ],
      defaultValue: "natural",
    },
    {
      kind: "number",
      id: "volume",
      label: "土量",
      unit: "m³",
      min: 0.1,
      max: 1000000,
      step: 1,
      defaultValue: 100,
    },
    {
      kind: "number",
      id: "customL",
      label: "L（ほぐし率）※手入力時",
      unit: "",
      min: 1,
      max: 2.5,
      step: 0.01,
      defaultValue: 1.2,
      help: "土質区分「手入力」を選んだときのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "customC",
      label: "C（締固め率）※手入力時",
      unit: "",
      min: 0.7,
      max: 1.5,
      step: 0.01,
      defaultValue: 0.9,
      help: "土質区分「手入力」を選んだときのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "dumpCapacity",
      label: "10tダンプ1台の積載（ほぐし土量）",
      unit: "m³",
      min: 1,
      max: 12,
      step: 0.5,
      defaultValue: 5.5,
      help: "土質・規格で変動。標準的には5〜6m³",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "国土交通省「土木工事数量算出要領」／日本道路協会「道路土工要綱」（土量変化率）",
      description:
        "土量変化率 L（ほぐし率）・C（締固め率）の定義と土質区分ごとの標準値。法令ではなく積算・設計の技術資料です。収録値は参考代表値で、実値は土質試験・現場条件により異なります。",
    },
  ],
  cautions: [
    "土量変化率は参考代表値です。積算・設計では所定の資料・土質試験値を用いてください（本計算は概算）。",
    "ダンプ積載量はダンプ規格・土質・すりきり/山盛りで変わります。台数は概算です。",
    "岩の掘削は変化率が大きく分散します。軟岩・硬岩の値は目安として扱ってください。",
  ],
  examples: [
    { label: "砂質土 地山100m³", values: { soil: "sand", baseState: "natural", volume: 100, dumpCapacity: 5.5 } },
    { label: "粘性土 ほぐし120m³から地山を逆算", values: { soil: "clay", baseState: "loose", volume: 120, dumpCapacity: 5.5 } },
  ],
  keywords: [
    "土量",
    "残土",
    "地山",
    "ほぐし",
    "締固め",
    "変化率",
    "ダンプ",
    "運搬",
    "掘削土",
    "盛土",
    "切土",
    "土工",
    "土積",
  ],
  compute: computeSoilVolume,
};
