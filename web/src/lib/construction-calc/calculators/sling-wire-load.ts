/**
 * 玉掛けワイヤロープの安全荷重・張力計算
 *
 * 根拠:
 * - クレーン等安全規則 第213条: 玉掛用具であるワイヤロープの安全係数は 6以上
 *   （安全係数 = ワイヤロープの切断荷重 ÷ ワイヤロープにかかる荷重の最大の値）
 * - クレーン等安全規則 第215条: 著しい損傷・腐食等のあるワイヤロープの使用禁止
 * - 玉掛け作業の安全に係るガイドライン（平成12年2月24日 基発第96号）
 * - 切断荷重はJIS G 3525 6×24 A種（裸）の公称値を参考値として収録
 *
 * 計算式（玉掛け技能講習テキストと同じ考え方）:
 *   1本あたり張力 T = 荷の質量 W ÷ 有効吊り本数 n × 張力増加係数(1/cos(θ/2))
 *   判定: ロープの切断荷重 ÷ T ≥ 6 で使用可
 * 有効吊り本数は荷重の不均等を考慮した安全側の値（3本吊り→2本、4本吊り→3本）を使う。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber, kgfToKn } from "../schema";

/**
 * ワイヤロープ公称切断荷重 [kN]（JIS G 3525 6×24 A種・裸の参考値）
 * 玉掛け技能講習テキストの基本安全荷重表（例: φ10mm→約0.8t、φ16mm→約2t）と整合する値。
 */
export const WIRE_BREAKING_LOAD_KN: Record<string, number> = {
  "8": 30.1,
  "9": 38.1,
  "10": 47.0,
  "12": 67.7,
  "14": 92.1,
  "16": 120,
  "18": 152,
  "20": 188,
  "22": 228,
  "24": 271,
  "26": 318,
  "28": 369,
  "30": 423,
};

/** クレーン則第213条の安全係数 */
export const WIRE_SAFETY_FACTOR = 6;

/**
 * 吊り角度→張力増加係数（= 1 / cos(θ/2)）。
 * 講習テキストの表（30°→1.04, 60°→1.16, 90°→1.41, 120°→2.00）と同一の式。
 */
export function tensionFactor(angleDeg: number): number {
  return 1 / Math.cos(((angleDeg / 2) * Math.PI) / 180);
}

/**
 * 有効吊り本数（安全側）。3本・4本吊りは荷重が均等にかからないおそれがあるため、
 * 玉掛け実務の慣行に従い 3本→2本・4本→3本 で計算する。
 */
export function effectiveStrands(strands: number): number {
  if (strands >= 4) return 3;
  if (strands === 3) return 2;
  return strands;
}

function computeSlingWireLoad(values: CalcValues): CalcOutcome {
  const loadKg = values.loadKg as number;
  const strands = Number(values.strands);
  const angleDeg = Number(values.angle);
  const diameter = String(values.diameter);

  const nEff = effectiveStrands(strands);
  const factor = tensionFactor(angleDeg);
  const tensionKgf = (loadKg / nEff) * factor;
  const tensionKn = kgfToKn(tensionKgf);

  const breakingKn = WIRE_BREAKING_LOAD_KN[diameter];
  const actualSafetyFactor = breakingKn / tensionKn;
  const ok = actualSafetyFactor >= WIRE_SAFETY_FACTOR - 1e-9;
  // 表示は安全側（切り捨て）: 5.98 を四捨五入で「6」と表示すると
  // 「6 なのに使用不可」という見かけの矛盾が生じるため（実測で検出）
  const sfDisplay = formatNumber(Math.floor(actualSafetyFactor * 100) / 100, 2);

  // 基本安全荷重（垂直1本吊りで吊れる質量）= 切断荷重 ÷ 6 を kg へ換算
  const basicSafeLoadKg = (breakingKn * 1000) / 9.80665 / WIRE_SAFETY_FACTOR;
  // この掛け方（本数・角度）での最大吊り質量
  const maxLoadKg = (basicSafeLoadKg * nEff) / factor;

  // 使用可となる最小径の提案（NG のときの次の一手）
  let recommended: string | undefined;
  if (!ok) {
    for (const [d, bk] of Object.entries(WIRE_BREAKING_LOAD_KN)) {
      if (bk / tensionKn >= WIRE_SAFETY_FACTOR - 1e-9) {
        recommended = d;
        break;
      }
    }
  }

  const strandsNote =
    strands !== nEff
      ? `（${strands}本吊りは荷重の不均等を考慮し安全側の${nEff}本で計算）`
      : "";

  const warnings: string[] = [];
  if (strands !== nEff) {
    warnings.push(
      `${strands}本吊りは各ロープに荷重が均等にかからないおそれがあるため、有効本数${nEff}本として安全側で計算しています。`,
    );
  }
  if (angleDeg >= 90) {
    warnings.push(
      "吊り角度が90°以上になると張力が急増します。可能な限り吊り角度は60°以内に収めてください。",
    );
  }
  if (!ok && recommended) {
    warnings.push(
      `この条件ではφ${diameter}mmは使用できません。φ${recommended}mm以上への変更、吊り本数の増加、または吊り角度を小さくすることを検討してください。`,
    );
  }
  if (!ok && !recommended) {
    warnings.push(
      "収録範囲（φ30mmまで）では安全係数6を確保できません。掛け方の変更・専用吊り具の検討など、有資格者による揚重計画の見直しが必要です。",
    );
  }
  warnings.push(
    "切断荷重はJIS参考値です。実際に使用するロープの切断荷重は製造者の検査証明書で確認してください。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "使用可" : "使用不可",
    value: sfDisplay,
    unit: "",
    summary: ok
      ? `φ${diameter}mmの安全係数は${sfDisplay}で、クレーン等安全規則第213条の基準（6以上）を満たします。`
      : `φ${diameter}mmの安全係数は${sfDisplay}で、基準（6以上）を満たしません。このままでは使用できません。`,
    items: [
      {
        label: "安全係数（6以上で使用可）",
        value: sfDisplay,
        tone: ok ? "safe" : "danger",
      },
      {
        label: "ワイヤ1本あたりの張力",
        value: `${formatNumber(tensionKgf, 0)}kg（${formatNumber(tensionKn, 1)}kN）`,
      },
      {
        label: `φ${diameter}mmの切断荷重（JIS参考値）`,
        value: `${formatNumber(breakingKn, 0)}kN`,
      },
      {
        label: `φ${diameter}mmの基本安全荷重（垂直1本吊り）`,
        value: `${formatNumber(basicSafeLoadKg, 0)}kg`,
      },
      {
        label: "この掛け方で吊れる最大質量",
        value: `${formatNumber(Math.floor(maxLoadKg), 0)}kg`,
      },
      ...(recommended
        ? [{ label: "使用可となる最小径（同条件）", value: `φ${recommended}mm`, tone: "info" as const }]
        : []),
    ],
    steps: [
      `張力増加係数 = 1 ÷ cos(${angleDeg}° ÷ 2) = ${formatNumber(factor, 2)}`,
      `1本あたり張力 T = ${formatNumber(loadKg, 0)}kg ÷ ${nEff}本 × ${formatNumber(factor, 2)} = ${formatNumber(tensionKgf, 0)}kg（${formatNumber(tensionKn, 1)}kN）${strandsNote}`,
      `安全係数 = 切断荷重 ${formatNumber(breakingKn, 0)}kN ÷ 張力 ${formatNumber(tensionKn, 1)}kN = ${sfDisplay}`,
      `判定: ${sfDisplay} ${ok ? "≥" : "<"} 6（クレーン則第213条）→ ${ok ? "使用可" : "使用不可"}`,
    ],
    warnings,
  };
}

export const slingWireLoadCalculator: ConstructionCalculator = {
  slug: "sling-wire-load",
  title: "玉掛けワイヤロープの安全荷重・張力計算",
  shortTitle: "玉掛けワイヤ安全荷重",
  summary:
    "荷の質量・吊り本数・吊り角度からワイヤ1本あたりの張力を計算し、クレーン等安全規則第213条の安全係数6以上を満たすか判定します。",
  fields: [
    {
      kind: "number",
      id: "loadKg",
      label: "荷の質量",
      unit: "kg",
      min: 1,
      max: 50000,
      step: 10,
      defaultValue: 1000,
      help: "吊り具・パレット等の質量も含めた総質量",
    },
    {
      kind: "select",
      id: "strands",
      label: "吊り本数",
      options: [
        { value: "1", label: "1本吊り" },
        { value: "2", label: "2本吊り" },
        { value: "3", label: "3本吊り（安全側: 2本で計算）" },
        { value: "4", label: "4本吊り（安全側: 3本で計算）" },
      ],
      defaultValue: "2",
    },
    {
      kind: "select",
      id: "angle",
      label: "吊り角度",
      options: [
        { value: "0", label: "0°（垂直吊り）" },
        { value: "30", label: "30°（張力 約1.04倍）" },
        { value: "45", label: "45°（張力 約1.08倍）" },
        { value: "60", label: "60°（張力 約1.16倍）" },
        { value: "90", label: "90°（張力 約1.41倍）" },
        { value: "120", label: "120°（張力 2倍・非推奨）" },
      ],
      defaultValue: "60",
      help: "2本のロープがなす角度（フック部の内角）",
    },
    {
      kind: "select",
      id: "diameter",
      label: "ワイヤロープ径（6×24 A種）",
      options: Object.keys(WIRE_BREAKING_LOAD_KN).map((d) => ({
        value: d,
        label: `φ${d}mm`,
      })),
      defaultValue: "12",
    },
  ],
  basis: [
    {
      label: "クレーン等安全規則 第213条（玉掛け用ワイヤロープの安全係数）",
      description: "玉掛用具であるワイヤロープの安全係数は6以上と定められています。",
      lawNaviPath: "/law-navi/347M50002000034/213",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_213",
    },
    {
      label: "クレーン等安全規則 第215条（不適格なワイヤロープの使用禁止）",
      description:
        "素線切れ10%以上・直径の減少が公称径の7%を超えるもの・キンク・著しい形くずれ/腐食のあるワイヤロープは使用できません。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_215",
    },
    {
      label: "玉掛け作業の安全に係るガイドライン（平成12年2月24日 基発第96号）",
      description: "玉掛け方法の選定・作業手順など玉掛け作業全般の安全基準。",
      egovUrl:
        "https://www.mhlw.go.jp/web/t_doc?dataId=00tb1150&dataType=1",
    },
    {
      label: "JIS G 3525（ワイヤロープ）",
      description: "切断荷重の公称値（6×24 A種・裸）を参考値として使用しています。",
    },
  ],
  cautions: [
    "つり上げ荷重1t以上のクレーン等の玉掛け作業には玉掛け技能講習の修了が必要です（安衛法第61条・安衛令第20条第16号）。",
    "端末加工（アイスプライス・圧縮止め等）や使用損耗による強度低下は本計算では考慮していません。",
    "つりチェーン・繊維スリング・フック等は安全係数が異なります（クレーン則第213条の2・第214条）。本計算機はワイヤロープ専用です。",
  ],
  examples: [
    { label: "2t の鉄骨を2本吊り60°・φ16", values: { loadKg: 2000, strands: "2", angle: "60", diameter: "16" } },
    { label: "500kg の資材を4本吊り90°・φ10", values: { loadKg: 500, strands: "4", angle: "90", diameter: "10" } },
  ],
  keywords: [
    "玉掛け",
    "玉掛",
    "ワイヤ",
    "ワイヤロープ",
    "吊り",
    "吊る",
    "つり",
    "スリング",
    "安全係数",
    "張力",
    "クレーン",
    "揚重",
    "荷重",
  ],
  compute: computeSlingWireLoad,
};
