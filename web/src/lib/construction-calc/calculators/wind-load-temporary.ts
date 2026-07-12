/**
 * 仮設足場・仮囲いの風荷重の概算（速度圧×風力係数×受圧面積）
 *
 * 根拠・出典（数式はすべて公表された告示・指針に基づく）:
 * - 建築基準法施行令 第87条（風圧力）＋ 平成12年建設省告示第1454号:
 *     速度圧 q = 0.6 · E · Vo²   [N/m²]
 *       E = Er² · Gf
 *       Er（平均風速の高さ方向分布係数）: H>Zb で Er = 1.7·(H/ZG)^α、H≤Zb で Er = 1.7·(Zb/ZG)^α
 *       Zb・ZG・α は地表面粗度区分 I〜IV で規定（告示1454 第2）
 *       Gf（ガスト影響係数）は粗度区分と高さで規定（告示1454 第3。表を高さで線形補間）
 *       Vo（基準風速）は地域別に 30〜46 m/s（告示1454 第1）
 * - 仮設工業会「風荷重に対する足場の安全技術指針」:
 *     メッシュシート・防音パネル等の充実率 φ と風力係数 Cf の扱い。
 *     受圧面積は「見付面積 × 充実率」で正味の受風面積とする考え方。
 *   本計算は施行令87条の速度圧（恒久構造物向け）を用いた **安全側の概算** で、
 *   仮設専用の再現期間短縮による低減は考慮していない（＝過大側＝安全側）。正式には
 *   仮設工業会指針・構造計算で確認すること。
 *
 * 風力 W = q · Cf · (A · φ)  [N]
 *   A: 見付面積 [m²]、φ: 充実率、Cf: 風力係数（仮囲い平板の代表 1.2。値は指針で確認）
 *
 * 判定は決定論（AIは使わない）。地域係数 Vo・粗度区分・Cf は現場条件で入力する。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 地表面粗度区分ごとの係数（平成12年告示第1454号）。Gf は H=10m 以下と 40m 以上の値（間を線形補間） */
export const ROUGHNESS = {
  I: { Zb: 5, ZG: 250, alpha: 0.1, gf10: 2.0, gf40: 1.8, label: "I（海岸・干拓地等の障害物のない区域）" },
  II: { Zb: 5, ZG: 350, alpha: 0.15, gf10: 2.2, gf40: 1.9, label: "II（田園・樹木のまばらな区域）" },
  III: { Zb: 5, ZG: 450, alpha: 0.2, gf10: 2.5, gf40: 2.1, label: "III（樹木・低層建築物が多い市街地）" },
  IV: { Zb: 10, ZG: 550, alpha: 0.27, gf10: 3.1, gf40: 2.3, label: "IV（中高層建築物が多い市街地）" },
} as const;

export type RoughnessKey = keyof typeof ROUGHNESS;

/** Er = 1.7·(max(H,Zb)/ZG)^α */
export function windEr(roughness: RoughnessKey, H: number): number {
  const p = ROUGHNESS[roughness];
  const z = Math.max(H, p.Zb);
  return 1.7 * (z / p.ZG) ** p.alpha;
}

/** Gf: 高さ10m以下は gf10、40m以上は gf40、間は線形補間（告示1454 第3の表の簡略運用） */
export function windGf(roughness: RoughnessKey, H: number): number {
  const p = ROUGHNESS[roughness];
  if (H <= 10) return p.gf10;
  if (H >= 40) return p.gf40;
  return p.gf10 + ((p.gf40 - p.gf10) * (H - 10)) / 30;
}

/** 速度圧 q = 0.6·E·Vo²、E = Er²·Gf  [N/m²] */
export function velocityPressure(roughness: RoughnessKey, H: number, Vo: number): { Er: number; Gf: number; E: number; q: number } {
  const Er = windEr(roughness, H);
  const Gf = windGf(roughness, H);
  const E = Er * Er * Gf;
  const q = 0.6 * E * Vo * Vo;
  return { Er, Gf, E, q };
}

function computeWindLoadTemporary(values: CalcValues): CalcOutcome {
  const Vo = values.baseWind as number;
  const roughness = values.roughness as RoughnessKey;
  const H = values.height as number;
  const area = values.area as number;
  const phi = values.fillRatio as number;
  const Cf = values.forceCoef as number;

  const { Er, Gf, E, q } = velocityPressure(roughness, H, Vo);
  const netArea = area * phi;
  const forceN = q * Cf * netArea; // [N]
  const forceKn = forceN / 1000;
  const qKnm2 = q / 1000;

  const items: CalcCheckItem[] = [
    { label: "速度圧 q", value: `${formatNumber(q, 0)} N/m²（${formatNumber(qKnm2, 2)} kN/m²）`, note: "令87条・告示1454" },
    { label: "高さ方向分布係数 Er", value: formatNumber(Er, 3) },
    { label: "ガスト影響係数 Gf", value: formatNumber(Gf, 2) },
    { label: "環境係数 E＝Er²·Gf", value: formatNumber(E, 3) },
    { label: "正味受風面積 A·φ", value: `${formatNumber(netArea, 1)} m²（見付 ${formatNumber(area, 1)} × 充実率 ${formatNumber(phi, 2)}）` },
    { label: "風力係数 Cf", value: formatNumber(Cf, 2) },
    {
      label: "設計用風力 W",
      value: `${formatNumber(forceKn, 1)} kN`,
      tone: "warning",
      note: "壁つなぎ・控え・アンカーの検討外力",
    },
  ];

  const warnings: string[] = [
    "本計算は建築基準法施行令87条の速度圧（恒久構造物向け）を用いた安全側の概算です。仮設専用の再現期間短縮による低減は考慮していません（＝過大側＝安全側）。正式には仮設工業会「風荷重に対する足場の安全技術指針」・構造計算で確認してください。",
    "風力係数 Cf・充実率 φ は部材形状・シート種別（メッシュシート・防音パネル・養生シート）で変わります。メッシュシートは充実率0.5前後、防音パネル・養生シートは1.0に近い（隙間なし）等、指針・製品資料の値を用いてください。",
    "算定した風力は壁つなぎ・控え・ベース・倒壊防止アンカーの引抜き／せん断の検討外力です。壁つなぎ間隔（安衛則第570条）と併せ、強風時の作業中止・シート畳み・部材増設の措置を計画してください。",
  ];
  if (Vo >= 40) {
    warnings.push(`基準風速 Vo=${formatNumber(Vo, 0)} m/s は強風地域です。台風常襲地域では暴風時のシート開放・部材撤去計画を必須としてください。`);
  }
  if (phi >= 0.9) {
    warnings.push("充実率が高い（≒隙間の少ない防音パネル・全面シート）ため受風面積が大きく、風力が支配的になります。壁つなぎ・アンカーの増設を優先検討してください。");
  }

  return {
    tone: "warning",
    headline: "風力を算定",
    value: formatNumber(forceKn, 1),
    unit: "kN",
    summary: `速度圧 ${formatNumber(qKnm2, 2)} kN/m²、正味受風面積 ${formatNumber(netArea, 1)} m² のとき、設計用風力は約 ${formatNumber(forceKn, 1)} kN です。壁つなぎ・控え・アンカーの検討外力に用いてください。`,
    items,
    steps: [
      `Er = 1.7·(max(H,Zb)/ZG)^α = 1.7·(max(${formatNumber(H, 1)},${ROUGHNESS[roughness].Zb})/${ROUGHNESS[roughness].ZG})^${ROUGHNESS[roughness].alpha} = ${formatNumber(Er, 3)}（粗度区分${roughness}）`,
      `Gf = ${formatNumber(Gf, 2)}（粗度区分${roughness}・高さ${formatNumber(H, 1)}mで補間）`,
      `E = Er²·Gf = ${formatNumber(Er, 3)}²·${formatNumber(Gf, 2)} = ${formatNumber(E, 3)}`,
      `速度圧 q = 0.6·E·Vo² = 0.6·${formatNumber(E, 3)}·${formatNumber(Vo, 0)}² = ${formatNumber(q, 0)} N/m²`,
      `風力 W = q·Cf·(A·φ) = ${formatNumber(q, 0)}·${formatNumber(Cf, 2)}·(${formatNumber(area, 1)}·${formatNumber(phi, 2)}) = ${formatNumber(forceN, 0)} N ≒ ${formatNumber(forceKn, 1)} kN`,
    ],
    warnings,
  };
}

export const windLoadTemporaryCalculator: ConstructionCalculator = {
  slug: "wind-load-temporary",
  title: "仮設足場・仮囲いの風荷重の概算（令87条・告示1454）",
  shortTitle: "風荷重（仮設）",
  summary:
    "基準風速・地表面粗度区分・高さから建築基準法施行令87条の速度圧を求め、風力係数と充実率（メッシュシート等）を掛けて足場・仮囲いの設計用風力を概算します。安全側（過大側）の概算です。",
  fields: [
    {
      kind: "number",
      id: "baseWind",
      label: "基準風速 Vo",
      unit: "m/s",
      min: 30,
      max: 46,
      step: 1,
      defaultValue: 34,
      help: "地域別に30〜46m/s（告示1454第1・e-Govで市区町村を確認）。多くの平野部は32〜36",
    },
    {
      kind: "select",
      id: "roughness",
      label: "地表面粗度区分",
      options: [
        { value: "I", label: "I（海岸・障害物なし）" },
        { value: "II", label: "II（田園・樹木まばら）" },
        { value: "III", label: "III（一般市街地）" },
        { value: "IV", label: "IV（中高層が多い市街地）" },
      ],
      defaultValue: "III",
      help: "都市部の一般的な現場はIIIが目安",
    },
    {
      kind: "number",
      id: "height",
      label: "地上高さ H",
      unit: "m",
      min: 2,
      max: 60,
      step: 1,
      defaultValue: 10,
      help: "足場・仮囲いの頂部までの地上高さ",
    },
    {
      kind: "number",
      id: "area",
      label: "見付面積 A",
      unit: "m²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 10,
      help: "風を受ける正面の見付面積（幅×高さ）。壁つなぎ1スパン分など検討単位で",
    },
    {
      kind: "number",
      id: "fillRatio",
      label: "充実率 φ",
      unit: "",
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      help: "メッシュシート約0.5・防音パネル/養生シート約1.0・素の枠組のみは0.1〜0.2（指針・製品資料）",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "forceCoef",
      label: "風力係数 Cf",
      unit: "",
      min: 0.8,
      max: 2.4,
      step: 0.1,
      defaultValue: 1.2,
      help: "仮囲い等の平板で1.2前後。正式には仮設工業会指針・告示の値を用いる",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "建築基準法施行令 第87条（風圧力）",
      description: "風圧力＝速度圧×風力係数。速度圧・風力係数の算定方法を国土交通大臣が定める（＝告示1454）と規定。",
      egovUrl: "https://laws.e-gov.go.jp/law/325CO0000000338#Mp-At_87",
    },
    {
      label: "平成12年建設省告示第1454号（Eの数値・風力係数・基準風速Vo）",
      description:
        "速度圧 q=0.6·E·Vo²、E=Er²·Gf、地表面粗度区分I〜IVのZb・ZG・α・Gf、地域別の基準風速Voを規定。",
    },
    {
      label: "仮設工業会「風荷重に対する足場の安全技術指針」",
      description:
        "メッシュシート・防音パネルの充実率と風力係数、仮設構造物としての風荷重の扱い。本計算の充実率・Cfはこの指針・製品資料で確認してください。",
    },
  ],
  cautions: [
    "本計算は施行令87条の速度圧を用いた安全側（過大側）の概算です。仮設専用の低減や局部風圧・部材ごとの風力係数は含みません。正式な構造計算・仮設計画は有資格者が行ってください。",
    "風力係数Cf・充実率φはシート種別・部材形状で大きく変わります。メーカー製品資料・仮設工業会指針の値を用いてください。",
    "強風・台風時は本計算の可否判定に関わらず、作業中止・シート開放・部材増設等の暴風対策を安全衛生計画に定めてください。",
  ],
  examples: [
    {
      label: "市街地・高さ10m・メッシュシート（φ0.5）",
      values: { baseWind: 34, roughness: "III", height: 10, area: 10, fillRatio: 0.5, forceCoef: 1.2 },
    },
    {
      label: "仮囲い（防音パネルφ1.0）高さ3m・幅10m",
      values: { baseWind: 34, roughness: "III", height: 3, area: 30, fillRatio: 1.0, forceCoef: 1.2 },
    },
    {
      label: "海岸沿い・強風地域 Vo42・高さ20m",
      values: { baseWind: 42, roughness: "II", height: 20, area: 10, fillRatio: 0.5, forceCoef: 1.2 },
    },
  ],
  keywords: [
    "風荷重",
    "風圧",
    "風力",
    "速度圧",
    "仮囲い",
    "メッシュシート",
    "防音パネル",
    "足場",
    "壁つなぎ",
    "台風",
    "暴風",
    "充実率",
    "ガスト",
  ],
  compute: computeWindLoadTemporary,
};
