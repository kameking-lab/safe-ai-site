/**
 * 鉄筋の質量・本数換算（JIS G 3112 鉄筋コンクリート用棒鋼）
 *
 * 根拠・出典:
 * - JIS G 3112「鉄筋コンクリート用棒鋼」は、呼び名（D10〜D51）ごとに公称直径 d を定めている。
 *   公称断面積 A = π/4・d²、単位質量（1mあたりの質量）= A[mm²] × 7.85(鋼材の密度・g/cm³) ÷ 1000
 *   [kg/m] で算定される（強度区分 SD295・SD345・SD390・SD490 いずれも同じ断面寸法系列で共通）。
 *   本計算は表引きの定数ではなく、この式を公称直径から直接計算する（**径ズレ（呼び名の
 *   取り違え）を防ぐため**。例: D13とD16の単位質量を混同しないよう、呼び名ごとに
 *   公称直径から都度算定する）。
 * - 総質量 = 単位質量 × 長さ × 本数、または 本数 = 総質量 ÷（単位質量 × 長さ）で相互換算する。
 *
 * 外部突合: D13（公称直径12.7mm）→ 断面積126.7mm² → 単位質量0.995kg/m、
 *           D16（公称直径15.9mm）→ 断面積198.6mm² → 単位質量1.56kg/m（公表値と一致）。
 *
 * 判定は決定論（AIは使わない）。定尺・ロス、継手（重ね継手・ガス圧接等）・フックによる
 * 長さ・質量の割増は含まない（現場の鉄筋加工図・加工帳で別途確認）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 鋼材の密度 [g/cm³]（JIS G 3112 の単位質量算定に用いる標準値） */
export const STEEL_DENSITY_G_PER_CM3 = 7.85;

/** JIS G 3112 呼び名別の公称直径 [mm] */
export const REBAR_NOMINAL_DIAMETER_MM: Record<string, number> = {
  D10: 9.53,
  D13: 12.7,
  D16: 15.9,
  D19: 19.1,
  D22: 22.2,
  D25: 25.4,
  D29: 28.6,
  D32: 31.8,
  D35: 34.9,
  D38: 38.1,
  D41: 41.3,
  D51: 50.8,
};

export const REBAR_SIZES = Object.keys(REBAR_NOMINAL_DIAMETER_MM);

/** 公称断面積 A = π/4・d² [mm²] */
export function rebarNominalArea(barSize: string): number {
  const d = REBAR_NOMINAL_DIAMETER_MM[barSize];
  return (Math.PI / 4) * d * d;
}

/** 単位質量 = 断面積[mm²] × 7.85 ÷ 1000 [kg/m] */
export function rebarUnitMass(barSize: string): number {
  return (rebarNominalArea(barSize) * STEEL_DENSITY_G_PER_CM3) / 1000;
}

export type RebarCalcMode = "lengthToMass" | "massToCount";

function computeRebarMass(values: CalcValues): CalcOutcome {
  const mode = values.calcMode as RebarCalcMode;
  const barSize = values.barSize as string;
  const length = values.length as number;
  const count = values.count as number;
  const totalMass = values.totalMass as number;

  const area = rebarNominalArea(barSize);
  const unitMass = rebarUnitMass(barSize);

  if (mode === "lengthToMass") {
    const mass = unitMass * length * count;
    const items: CalcCheckItem[] = [
      { label: "呼び名", value: barSize, note: `公称直径 ${formatNumber(REBAR_NOMINAL_DIAMETER_MM[barSize], 2)}mm` },
      { label: "公称断面積 A", value: `${formatNumber(area, 1)} mm²`, note: "A = π/4・d²" },
      { label: "単位質量（1mあたり）", value: `${formatNumber(unitMass, 3)} kg/m`, note: "A × 7.85 ÷ 1000" },
      { label: "長さ × 本数", value: `${formatNumber(length, 2)}m × ${formatNumber(count, 0)}本` },
      { label: "総質量", value: `${formatNumber(mass, 1)} kg`, tone: "info" },
    ];
    return {
      tone: "info",
      headline: "総質量を算定",
      value: formatNumber(mass, 1),
      unit: "kg",
      summary: `${barSize}（単位質量${formatNumber(unitMass, 3)}kg/m）を長さ${formatNumber(length, 2)}m×${formatNumber(count, 0)}本使うと、総質量は約 ${formatNumber(mass, 1)} kg です。`,
      items,
      steps: [
        `公称断面積 A = π/4・d² = π/4 × ${formatNumber(REBAR_NOMINAL_DIAMETER_MM[barSize], 2)}² = ${formatNumber(area, 2)} mm²`,
        `単位質量 = A × 7.85 ÷ 1000 = ${formatNumber(area, 2)} × 7.85 ÷ 1000 = ${formatNumber(unitMass, 3)} kg/m`,
        `総質量 = 単位質量 × 長さ × 本数 = ${formatNumber(unitMass, 3)} × ${formatNumber(length, 2)} × ${formatNumber(count, 0)} = ${formatNumber(mass, 2)} kg`,
      ],
      warnings: [
        "本計算は直線材の質量です。定尺（規格長さ）による切断ロス、重ね継手・ガス圧接等の継手による重複・加工代、フック（末端加工）による長さの割増は含みません。鉄筋加工図・加工帳で別途確認してください。",
        "単位質量はJIS G 3112の公称直径から算定した理論値です。実際の質量はミルシート（製造者の検査証明書）の値とわずかに異なる場合があります。",
      ],
    };
  }

  // massToCount
  const perBarMass = unitMass * length;
  const countRaw = perBarMass > 0 ? totalMass / perBarMass : 0;
  const countCeil = Math.ceil(countRaw);
  const items: CalcCheckItem[] = [
    { label: "呼び名", value: barSize, note: `公称直径 ${formatNumber(REBAR_NOMINAL_DIAMETER_MM[barSize], 2)}mm` },
    { label: "単位質量（1mあたり）", value: `${formatNumber(unitMass, 3)} kg/m` },
    { label: `1本あたりの質量（長さ${formatNumber(length, 2)}m）`, value: `${formatNumber(perBarMass, 2)} kg`, note: "単位質量 × 長さ" },
    { label: "総質量（入力）", value: `${formatNumber(totalMass, 1)} kg` },
    { label: "本数（端数）", value: `${formatNumber(countRaw, 2)} 本`, note: "総質量 ÷ 1本あたりの質量" },
    { label: "発注本数（切り上げ）", value: `${countCeil} 本`, tone: "info", note: "端数は1本と数える（安全側）" },
  ];
  return {
    tone: "info",
    headline: "本数を算定",
    value: String(countCeil),
    unit: "本",
    summary: `${barSize}・長さ${formatNumber(length, 2)}mで総質量${formatNumber(totalMass, 1)}kgをまかなうには、約${formatNumber(countRaw, 2)}本（発注は${countCeil}本に切り上げ）必要です。`,
    items,
    steps: [
      `1本あたりの質量 = 単位質量 × 長さ = ${formatNumber(unitMass, 3)} × ${formatNumber(length, 2)} = ${formatNumber(perBarMass, 3)} kg`,
      `本数 = 総質量 ÷ 1本あたりの質量 = ${formatNumber(totalMass, 1)} ÷ ${formatNumber(perBarMass, 3)} = ${formatNumber(countRaw, 2)} 本`,
      `発注本数 = 切り上げ ${countCeil} 本`,
    ],
    warnings: [
      "本計算は直線材の質量から逆算した本数です。定尺・切断ロス・継手・フックの加工代は含みません。鉄筋加工図・加工帳で別途確認してください。",
      "総質量に鉄筋の種類（径）が混在する場合は、径ごとに分けて計算してください（本計算は単一径のみ）。",
    ],
  };
}

export const rebarMassCalculator: ConstructionCalculator = {
  slug: "rebar-mass",
  title: "鉄筋の質量・本数換算（JIS G 3112）",
  shortTitle: "鉄筋質量換算",
  summary:
    "JIS G 3112の呼び名（D10〜D51）から単位質量を公称直径ベースで算定し、長さ×本数→総質量、または総質量→本数を相互換算します。定尺ロス・継手・フックの割増は含みません。",
  fields: [
    {
      kind: "select",
      id: "calcMode",
      label: "計算する内容",
      options: [
        { value: "lengthToMass", label: "長さ×本数 → 総質量" },
        { value: "massToCount", label: "総質量 → 本数" },
      ],
      defaultValue: "lengthToMass",
    },
    {
      kind: "select",
      id: "barSize",
      label: "呼び名",
      options: REBAR_SIZES.map((s) => ({ value: s, label: `${s}（公称直径${REBAR_NOMINAL_DIAMETER_MM[s]}mm）` })),
      defaultValue: "D13",
    },
    {
      kind: "number",
      id: "length",
      label: "長さ（1本あたり）",
      unit: "m",
      min: 0.1,
      max: 20,
      step: 0.1,
      defaultValue: 4,
      help: "定尺・加工後の長さ",
    },
    {
      kind: "number",
      id: "count",
      label: "本数",
      unit: "本",
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 10,
      help: "「長さ×本数→総質量」モードのみ使用",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "totalMass",
      label: "総質量",
      unit: "kg",
      min: 0.1,
      max: 1000000,
      step: 1,
      defaultValue: 1000,
      help: "「総質量→本数」モードのみ使用",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "JIS G 3112（鉄筋コンクリート用棒鋼）呼び名別 公称直径・公称断面積・単位質量",
      description:
        "呼び名（D10〜D51）ごとの公称直径dから公称断面積A=π/4・d²、単位質量=A×7.85(鋼材密度g/cm³)÷1000[kg/m]を算定。強度区分（SD295〜SD490）にかかわらず断面寸法系列は共通です。",
    },
  ],
  cautions: [
    "定尺（規格長さ）による切断ロス、重ね継手・ガス圧接・機械式継手による重複・加工代、フック（末端加工）による長さの割増は含みません。鉄筋加工図・加工帳で別途確認してください。",
    "単位質量はJIS G 3112の公称直径から算定した理論値です。実際の質量はミルシート（製造者の検査証明書）の値とわずかに異なる場合があります。",
    "総質量に複数径が混在する場合は、径ごとに分けて計算してください（本計算は単一径のみ）。",
  ],
  examples: [
    { label: "D13・4m×10本 → 総質量", values: { calcMode: "lengthToMass", barSize: "D13", length: 4, count: 10, totalMass: 1000 } },
    { label: "D16・4m×20本 → 総質量", values: { calcMode: "lengthToMass", barSize: "D16", length: 4, count: 20, totalMass: 1000 } },
    { label: "D19・4m・総質量1000kg → 本数", values: { calcMode: "massToCount", barSize: "D19", length: 4, count: 10, totalMass: 1000 } },
  ],
  keywords: [
    "鉄筋",
    "異形棒鋼",
    "D13",
    "D16",
    "D19",
    "D22",
    "JIS G3112",
    "単位質量",
    "本数換算",
    "質量計算",
    "鉄筋加工",
    "定尺",
    "継手",
  ],
  compute: computeRebarMass,
};
