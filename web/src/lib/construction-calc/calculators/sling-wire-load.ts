/**
 * 玉掛けワイヤロープの安全荷重・張力計算（モード係数方式・逆引き対応）
 *
 * 根拠:
 * - クレーン等安全規則 第213条: 玉掛用具であるワイヤロープの安全係数は 6以上
 *   （安全係数 = ワイヤロープの切断荷重 ÷ ワイヤロープにかかる荷重の最大の値）
 * - クレーン等安全規則 第215条: 著しい損傷・腐食等のあるワイヤロープの使用禁止
 * - 玉掛け作業の安全に係るガイドライン（平成12年2月24日 基発第96号）
 * - 一般社団法人 日本クレーン協会「玉掛け作業の安全」の安全荷重表・モード係数の考え方
 * - 切断荷重は JIS G 3525:2013 の公称最小破断荷重に基づく
 *
 * 計算式（玉掛け技能講習テキスト＝モード係数方式と同じ考え方）:
 *   使用荷重（この掛け方で吊れる質量）= 基本安全荷重 × モード係数
 *   モード係数 = 有効本数 n × 掛け方効率 k × cos(θ/2)
 *   基本安全荷重 = 切断荷重 ÷ 安全係数6（垂直1本吊り）
 *   安全係数 = 切断荷重 ÷ ワイヤ1本あたりの張力 ≥ 6 で使用可
 *
 * 有効本数・掛け方効率（日本クレーン協会・メーカー公表の安全荷重表の慣行）:
 *   1本つり=1 / 2本2点=2 / 3本3点=3 / 4本4点=3本扱い / 2本4点あだ巻き=3本扱い /
 *   2本4点半掛け=4点扱い / 目通し（絞り・チョーク）=強度25%減（効率0.75）
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber, kgfToKn, STANDARD_GRAVITY } from "../schema";

/** ワイヤ構成種別 */
export type WireConstruction = "6x24A" | "6x37A";

/**
 * ワイヤロープ公称切断荷重 [kN]（構成種別ごと）。
 *
 * - 6×24 A種（裸）: 玉掛け技能講習テキストの基本安全荷重表（φ10≒0.8t・φ16≒2t）と整合する
 *   参考値。JIS G 3525:2013 の公称最小破断荷重（φ10=49.3・φ16=126・φ24=284kN 等）より
 *   数%低い安全側の値を採用。
 * - 6×37 A種（裸）: JIS G 3525:2013 の 6×37 A種 / 6×24 A種 の実測比
 *   （φ10 53.1/49.3・φ16 136/126・φ24 306/284・φ32 544/505・φ40 850/789 = いずれも約1.077）
 *   を 6×24 A種基準値に適用した安全側概算値。6×37 は 6×24 よりわずかに切断荷重が高い。
 *
 * ※ IWRC（心綱ワイヤ）・B種等の追加は BACKLOG-construction-calc CC-13
 *   （JIS一次資料での径別値の確認が必要）。出典未確認の数値は載せない方針。
 */
export const WIRE_BREAKING_LOAD_KN: Record<WireConstruction, Record<string, number>> = {
  "6x24A": {
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
  },
  // 6×24 A種 × 1.077（JIS G3525:2013 の 6×37/6×24 実測比）を四捨五入した安全側概算値
  "6x37A": {
    "8": 32.4,
    "9": 41.0,
    "10": 50.6,
    "12": 72.9,
    "14": 99.2,
    "16": 129,
    "18": 164,
    "20": 202,
    "22": 246,
    "24": 292,
    "26": 342,
    "28": 397,
    "30": 456,
  },
};

export const WIRE_CONSTRUCTION_LABELS: Record<WireConstruction, string> = {
  "6x24A": "6×24 A種（裸）",
  "6x37A": "6×37 A種（裸）",
};

/** ワイヤ径の一覧（構成種別で共通） */
export const WIRE_DIAMETERS = Object.keys(WIRE_BREAKING_LOAD_KN["6x24A"]);

/** クレーン則第213条の安全係数 */
export const WIRE_SAFETY_FACTOR = 6;

/** 標準重力加速度による kgf⇔N 換算に STANDARD_GRAVITY を使用 */

/** 掛け方モード（有効本数 n・掛け方効率 k）。モード係数 = n × k × cos(θ/2） */
export type SlingMode = {
  value: string;
  label: string;
  /** 有効本数（荷重が均等にかからない掛け方は安全側に低く数える） */
  legs: number;
  /** 掛け方効率（目通し=0.75で強度25%減。通常掛けは1.0） */
  strengthK: number;
  /** 吊り角度（cos(θ/2)）を掛けるか（1本つり・目通し単体は無関係→false） */
  angleApplies: boolean;
  note: string;
};

export const SLING_MODES: SlingMode[] = [
  { value: "v1", label: "1本つり（垂直）", legs: 1, strengthK: 1, angleApplies: false, note: "垂直1本吊り" },
  { value: "s2", label: "2本つり（2点）", legs: 2, strengthK: 1, angleApplies: true, note: "標準的な2本2点吊り" },
  { value: "s3", label: "3本つり（3点）", legs: 3, strengthK: 1, angleApplies: true, note: "3本3点吊り" },
  {
    value: "s4",
    label: "4本4点つり（3本扱い）",
    legs: 3,
    strengthK: 1,
    angleApplies: true,
    note: "4本掛けでも荷重が均等にかからないため3本つりで算定（日本クレーン協会）",
  },
  {
    value: "wrap",
    label: "2本4点あだ巻きつり（3本扱い）",
    legs: 3,
    strengthK: 1,
    angleApplies: true,
    note: "2本4点あだ巻き吊りは3本つりで算定（日本クレーン協会）",
  },
  {
    value: "half",
    label: "2本4点半掛けつり（4点扱い）",
    legs: 4,
    strengthK: 1,
    angleApplies: true,
    note: "2本4点半掛け吊り。掛け外れ防止と荷の安定に注意",
  },
  {
    value: "choke",
    label: "目通し（絞り・チョーク）",
    legs: 1,
    strengthK: 0.75,
    angleApplies: false,
    note: "目通し（絞り）は曲げ・締め付けで強度が約25%低下（効率0.75）",
  },
];

const SLING_MODE_BY_VALUE = new Map(SLING_MODES.map((m) => [m.value, m]));

/**
 * D/d比（シーブ/フック径 D ÷ ロープ径 d）による曲げ効率。
 * ワイヤロープを小径で曲げると素線応力が増し実効強度が下がる。
 * 各社公表の曲げ効率曲線に基づく安全側（低め）の代表値。既定は「考慮しない（D/d≥20）」=1.0。
 * ※ この係数は常に安全側（切断荷重を割り引く方向）にのみ働く。
 */
export type DdRatio = "none" | "15" | "10" | "6" | "4" | "2";

export const DD_BENDING_EFFICIENCY: Record<DdRatio, number> = {
  none: 1.0,
  "15": 0.9,
  "10": 0.85,
  "6": 0.77,
  "4": 0.72,
  "2": 0.65,
};

export const DD_LABELS: Record<DdRatio, string> = {
  none: "考慮しない（D/d ≥ 20・十分大きい）",
  "15": "D/d = 15（効率 約0.90）",
  "10": "D/d = 10（効率 約0.85）",
  "6": "D/d = 6（効率 約0.77）",
  "4": "D/d = 4（効率 約0.72）",
  "2": "D/d = 2（効率 約0.65・強い曲げ）",
};

/**
 * 吊り角度→張力増加係数（= 1 / cos(θ/2)）。
 * 講習テキストの表（30°→1.04, 60°→1.16, 90°→1.41, 120°→2.00）と同一の式。
 */
export function tensionFactor(angleDeg: number): number {
  return 1 / Math.cos(((angleDeg / 2) * Math.PI) / 180);
}

/** cos(θ/2)（モード係数の角度項） */
export function angleCos(angleDeg: number): number {
  return Math.cos(((angleDeg / 2) * Math.PI) / 180);
}

/**
 * ある径・条件での安全係数を返す（純関数・テストで数値固定）。
 * SF = 切断荷重 × 曲げ効率 × 有効本数 × 掛け方効率 × cos(θ/2) ÷ 荷重張力
 */
export function safetyFactorFor(params: {
  breakingKn: number;
  loadKg: number;
  mode: SlingMode;
  angleDeg: number;
  ddEff: number;
}): number {
  const { breakingKn, loadKg, mode, angleDeg, ddEff } = params;
  const cos = mode.angleApplies ? angleCos(angleDeg) : 1;
  const loadKn = (loadKg * STANDARD_GRAVITY) / 1000;
  const capacityKn = breakingKn * ddEff * mode.legs * mode.strengthK * cos;
  return capacityKn / loadKn;
}

function computeSlingWireLoad(values: CalcValues): CalcOutcome {
  const calcMode = String(values.calcMode); // "forward" | "reverse"
  const construction = String(values.construction) as WireConstruction;
  const loadKg = values.loadKg as number;
  const mode = SLING_MODE_BY_VALUE.get(String(values.mode)) ?? SLING_MODES[1];
  const angleDeg = Number(values.angle);
  const diameter = String(values.diameter);
  const dd = String(values.dd) as DdRatio;

  const table = WIRE_BREAKING_LOAD_KN[construction] ?? WIRE_BREAKING_LOAD_KN["6x24A"];
  const ddEff = DD_BENDING_EFFICIENCY[dd] ?? 1;
  const cos = mode.angleApplies ? angleCos(angleDeg) : 1;
  const modeCoefficient = mode.legs * mode.strengthK * cos; // モード係数

  const commonWarnings: string[] = [];
  if (mode.value === "s4" || mode.value === "wrap") {
    commonWarnings.push(
      "4本4点吊り・2本4点あだ巻き吊りは各ロープに荷重が均等にかからないため、有効本数3本として安全側で算定しています（日本クレーン協会）。",
    );
  }
  if (mode.value === "choke") {
    commonWarnings.push(
      "目通し（絞り）は曲げと締め付けにより強度が約25%低下するため、効率0.75で算定しています。荷が回転・脱落しないよう注意してください。",
    );
  }
  if (mode.angleApplies && angleDeg > 60) {
    commonWarnings.push(
      "吊り角度が60°を超えると張力が急増します（90°で約1.41倍・120°で2倍）。可能な限り吊り角度は60°以内に収めてください。",
    );
  }
  if (dd !== "none") {
    commonWarnings.push(
      `フック・シャックル等での小径曲げ（${DD_LABELS[dd]}）を考慮し、切断荷重を曲げ効率で割り引いています。曲げ効率は安全側の参考値です。`,
    );
  }
  commonWarnings.push(
    "切断荷重はJIS参考値です。実際に使用するロープの切断荷重は製造者の検査証明書で確認してください。",
  );

  /* ---------- 逆引きモード: 荷重・条件 → 適合する最小ワイヤ径 ---------- */
  if (calcMode === "reverse") {
    let picked: { d: string; sf: number } | undefined;
    for (const d of WIRE_DIAMETERS) {
      const sf = safetyFactorFor({ breakingKn: table[d], loadKg, mode, angleDeg, ddEff });
      if (sf >= WIRE_SAFETY_FACTOR - 1e-9) {
        picked = { d, sf };
        break;
      }
    }
    const constructionLabel = WIRE_CONSTRUCTION_LABELS[construction];
    if (!picked) {
      return {
        tone: "danger",
        headline: "収録範囲外",
        value: "—",
        summary: `${formatNumber(loadKg, 0)}kg をこの掛け方で安全係数6を確保できるワイヤ径は、収録範囲（φ${WIRE_DIAMETERS[0]}〜φ${WIRE_DIAMETERS[WIRE_DIAMETERS.length - 1]}mm）にありません。掛け方の変更・専用吊り具の検討など、有資格者による揚重計画の見直しが必要です。`,
        items: [
          { label: "荷の質量", value: `${formatNumber(loadKg, 0)}kg` },
          { label: "掛け方", value: mode.label },
          { label: "ワイヤ構成", value: constructionLabel },
          { label: "モード係数", value: formatNumber(modeCoefficient, 3), note: `有効本数${mode.legs} × 効率${mode.strengthK} × cos(θ/2)${formatNumber(cos, 3)}` },
        ],
        steps: [
          `モード係数 = 有効本数${mode.legs} × 掛け方効率${mode.strengthK} × cos(${angleDeg}°/2)${formatNumber(cos, 3)} = ${formatNumber(modeCoefficient, 3)}`,
          `各径で 安全係数 = 切断荷重 × 曲げ効率${formatNumber(ddEff, 2)} × モード係数 ÷ 荷重張力 を試算 → いずれも6未満`,
        ],
        warnings: commonWarnings,
      };
    }
    const breakingKn = table[picked.d];
    const maxLoadKg = (breakingKn * ddEff * modeCoefficient * 1000) / STANDARD_GRAVITY / WIRE_SAFETY_FACTOR;
    return {
      tone: "safe",
      headline: "適合径",
      value: `φ${picked.d}`,
      unit: "mm",
      summary: `${formatNumber(loadKg, 0)}kg を「${mode.label}」で吊るには、${constructionLabel}なら φ${picked.d}mm 以上が必要です（安全係数 ${formatNumber(Math.floor(picked.sf * 100) / 100, 2)} ≥ 6）。`,
      items: [
        { label: "推奨する最小ワイヤ径", value: `φ${picked.d}mm`, tone: "safe" },
        { label: "荷の質量", value: `${formatNumber(loadKg, 0)}kg` },
        { label: "掛け方", value: mode.label, note: mode.note },
        { label: "ワイヤ構成", value: constructionLabel },
        { label: "モード係数", value: formatNumber(modeCoefficient, 3), note: `有効本数${mode.legs} × 効率${mode.strengthK} × cos(θ/2)${formatNumber(cos, 3)}` },
        {
          label: `φ${picked.d}mm でこの掛け方が吊れる最大質量`,
          value: `${formatNumber(Math.floor(maxLoadKg), 0)}kg`,
        },
        {
          label: `φ${picked.d}mm の安全係数（この荷）`,
          value: formatNumber(Math.floor(picked.sf * 100) / 100, 2),
          tone: "safe",
        },
      ],
      steps: [
        `モード係数 = 有効本数${mode.legs} × 掛け方効率${mode.strengthK} × cos(${angleDeg}°/2)${formatNumber(cos, 3)} = ${formatNumber(modeCoefficient, 3)}`,
        `${constructionLabel} の各径で 安全係数 = 切断荷重 × 曲げ効率${formatNumber(ddEff, 2)} × モード係数 ÷ 荷重張力 を径の小さい順に試算`,
        `最小で安全係数6以上になるのは φ${picked.d}mm（安全係数 ${formatNumber(Math.floor(picked.sf * 100) / 100, 2)}）`,
      ],
      warnings: commonWarnings,
    };
  }

  /* ---------- 順算モード: 指定径での張力・安全係数判定 ---------- */
  const breakingKn = table[diameter];
  const cosFactor = cos === 0 ? 1e-9 : cos;
  // 1本あたり張力（掛け方効率で割り増し）
  const tensionKgf = (loadKg / (mode.legs * mode.strengthK)) / cosFactor;
  const tensionKn = kgfToKn(tensionKgf);
  const effectiveBreakingKn = breakingKn * ddEff;
  const actualSafetyFactor = safetyFactorFor({ breakingKn, loadKg, mode, angleDeg, ddEff });
  const ok = actualSafetyFactor >= WIRE_SAFETY_FACTOR - 1e-9;
  // 表示は安全側（切り捨て）
  const sfDisplay = formatNumber(Math.floor(actualSafetyFactor * 100) / 100, 2);

  // 基本安全荷重（垂直1本吊り・曲げ効率込み）
  const basicSafeLoadKg = (effectiveBreakingKn * 1000) / STANDARD_GRAVITY / WIRE_SAFETY_FACTOR;
  // この掛け方での最大吊り質量 = 基本安全荷重 × モード係数
  const maxLoadKg = basicSafeLoadKg * modeCoefficient;

  // 使用可となる最小径の提案（NG のときの次の一手）
  let recommended: string | undefined;
  if (!ok) {
    for (const d of WIRE_DIAMETERS) {
      if (safetyFactorFor({ breakingKn: table[d], loadKg, mode, angleDeg, ddEff }) >= WIRE_SAFETY_FACTOR - 1e-9) {
        recommended = d;
        break;
      }
    }
  }

  const warnings: string[] = [...commonWarnings];
  if (!ok && recommended) {
    warnings.unshift(
      `この条件ではφ${diameter}mmは使用できません。φ${recommended}mm以上への変更、吊り本数の増加、または吊り角度を小さくすることを検討してください。`,
    );
  }
  if (!ok && !recommended) {
    warnings.unshift(
      "収録範囲では安全係数6を確保できません。掛け方の変更・専用吊り具の検討など、有資格者による揚重計画の見直しが必要です。",
    );
  }

  const constructionLabel = WIRE_CONSTRUCTION_LABELS[construction];
  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "使用可" : "使用不可",
    value: sfDisplay,
    unit: "",
    summary: ok
      ? `${constructionLabel} φ${diameter}mm・${mode.label}での安全係数は${sfDisplay}で、クレーン等安全規則第213条の基準（6以上）を満たします。`
      : `${constructionLabel} φ${diameter}mm・${mode.label}での安全係数は${sfDisplay}で、基準（6以上）を満たしません。このままでは使用できません。`,
    items: [
      { label: "安全係数（6以上で使用可）", value: sfDisplay, tone: ok ? "safe" : "danger" },
      { label: "掛け方", value: mode.label, note: mode.note },
      {
        label: "モード係数",
        value: formatNumber(modeCoefficient, 3),
        note: `有効本数${mode.legs} × 掛け方効率${mode.strengthK} × cos(θ/2)${formatNumber(cos, 3)}`,
      },
      { label: "ワイヤ1本あたりの張力", value: `${formatNumber(tensionKgf, 0)}kg（${formatNumber(tensionKn, 1)}kN）` },
      {
        label: `${constructionLabel} φ${diameter}mmの切断荷重（JIS参考値）`,
        value: ddEff < 1 ? `${formatNumber(breakingKn, 0)}kN → 曲げ考慮 ${formatNumber(effectiveBreakingKn, 0)}kN` : `${formatNumber(breakingKn, 0)}kN`,
      },
      { label: `φ${diameter}mmの基本安全荷重（垂直1本吊り）`, value: `${formatNumber(basicSafeLoadKg, 0)}kg` },
      { label: "この掛け方で吊れる最大質量", value: `${formatNumber(Math.floor(maxLoadKg), 0)}kg` },
      ...(recommended
        ? [{ label: "使用可となる最小径（同条件）", value: `φ${recommended}mm`, tone: "info" as const }]
        : []),
    ],
    steps: [
      `モード係数 = 有効本数${mode.legs} × 掛け方効率${mode.strengthK} × cos(${angleDeg}°/2)${formatNumber(cos, 3)} = ${formatNumber(modeCoefficient, 3)}`,
      `1本あたり張力 T = ${formatNumber(loadKg, 0)}kg ÷ (有効本数${mode.legs} × 効率${mode.strengthK}) ÷ cos(θ/2) = ${formatNumber(tensionKgf, 0)}kg（${formatNumber(tensionKn, 1)}kN）`,
      `安全係数 = 切断荷重 ${formatNumber(breakingKn, 0)}kN${ddEff < 1 ? ` × 曲げ効率 ${formatNumber(ddEff, 2)}` : ""} ÷ 張力 ${formatNumber(tensionKn, 1)}kN = ${sfDisplay}`,
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
    "荷の質量・掛け方（2点/あだ巻き/半掛け/目通し等）・吊り角度・ワイヤ構成からモード係数方式で張力を計算し、クレーン等安全規則第213条の安全係数6以上を判定。荷重から適合ワイヤ径を選ぶ逆引きにも対応します。",
  fields: [
    {
      kind: "select",
      id: "calcMode",
      label: "計算モード",
      options: [
        { value: "forward", label: "順算（ワイヤ径を指定して判定）" },
        { value: "reverse", label: "逆引き（荷重・条件から適合径を選ぶ）" },
      ],
      defaultValue: "forward",
      help: "逆引きは「この荷を吊るには何ミリ必要か」を提案します",
      aiOptional: true,
    },
    {
      kind: "select",
      id: "construction",
      label: "ワイヤ構成種別",
      options: [
        { value: "6x24A", label: "6×24 A種（裸・一般的）" },
        { value: "6x37A", label: "6×37 A種（裸・柔軟）" },
      ],
      defaultValue: "6x24A",
      help: "現場で最も一般的なのは6×24 A種",
      aiOptional: true,
    },
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
      id: "mode",
      label: "掛け方（吊り方モード）",
      options: SLING_MODES.map((m) => ({ value: m.value, label: m.label })),
      defaultValue: "s2",
      help: "あだ巻き・半掛け・目通し（絞り）にも対応",
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
      help: "2本のロープがなす角度（1本つり・目通し単体では無関係）",
    },
    {
      kind: "select",
      id: "diameter",
      label: "ワイヤロープ径",
      options: WIRE_DIAMETERS.map((d) => ({ value: d, label: `φ${d}mm` })),
      defaultValue: "12",
      help: "逆引きモードでは無視されます",
    },
    {
      kind: "select",
      id: "dd",
      label: "D/d比（フック・シーブ径 ÷ ロープ径）",
      options: (Object.keys(DD_LABELS) as DdRatio[]).map((k) => ({ value: k, label: DD_LABELS[k] })),
      defaultValue: "none",
      help: "小径で曲げると強度が下がります。通常は「考慮しない」でOK",
      aiOptional: true,
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
      egovUrl: "https://www.mhlw.go.jp/web/t_doc?dataId=00tb1150&dataType=1",
    },
    {
      label: "日本クレーン協会「玉掛け作業の安全」／JIS G 3525:2013（ワイヤロープ）",
      description:
        "モード係数（有効本数・掛け方効率）の考え方は日本クレーン協会の安全荷重表に、切断荷重の公称値はJIS G 3525:2013（6×24 A種・6×37 A種）に基づきます。4本4点吊り・2本4点あだ巻き吊りは3本つりで算定します。",
    },
  ],
  cautions: [
    "つり上げ荷重1t以上のクレーン等の玉掛け作業には玉掛け技能講習の修了が必要です（安衛法第61条・安衛令第20条第16号）。",
    "端末加工（アイスプライス・圧縮止め等）や使用損耗による強度低下は本計算では考慮していません。",
    "目通し（絞り）の強度低下25%・D/d比の曲げ効率は安全側の代表値です。実荷重・実機の証明値で確認してください。",
    "つりチェーン・繊維スリング・フック・シャックル等は安全係数が異なります（クレーン則第213条の2・第214条）。本計算機はワイヤロープ専用です。",
  ],
  examples: [
    { label: "2tの鉄骨を2本吊り60°・φ16", values: { calcMode: "forward", construction: "6x24A", loadKg: 2000, mode: "s2", angle: "60", diameter: "16", dd: "none" } },
    { label: "3tを目通し（絞り）で吊れる径は？", values: { calcMode: "reverse", construction: "6x24A", loadKg: 3000, mode: "choke", angle: "0", diameter: "12", dd: "none" } },
    { label: "1.5tをあだ巻き2本4点で吊りたい", values: { calcMode: "reverse", construction: "6x24A", loadKg: 1500, mode: "wrap", angle: "60", diameter: "12", dd: "none" } },
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
    "あだ巻き",
    "あだまき",
    "目通し",
    "めどおし",
    "絞り",
    "チョーク",
    "半掛け",
    "はんがけ",
    "2点吊り",
    "二点吊り",
    "モード係数",
    "適合径",
    "6x24",
    "6x37",
  ],
  relatedSlugs: ["sling-angle-geometry"],
  compute: computeSlingWireLoad,
};
