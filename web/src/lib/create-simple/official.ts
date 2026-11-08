/**
 * 公式物質リスト（CREATE-SIMPLE ver3.2.1 の SubstanceList）の1件から、
 * リスクアセスメントシート STEP2 の1行を作る（VBA modFunction.CasSearch と wsRA.Worksheet_Change の移植）。
 */
import { toPascals } from "./calc";
import { vbCInt } from "./excel";
import type { CsOelSet, CsOelUnit, CsPropertyType, CsSubstance, CsVolatility } from "./types";

/**
 * web/src/data/create-simple/substances.json の1件。
 * [CAS, 物質名, 英語名, GHS, ばく露限界値18列, 物化性状9列, 法規制13列]
 * - ばく露限界値: 濃度基準値8h(ppm,mg) 短時間(ppm,mg) / 産衛 許容(ppm,mg) 最大(ppm,mg) /
 *   ACGIH TWA(ppm,mg) STEL(ppm,mg) C(ppm,mg) / DFG MAK(ppm,mg) Peak(ppm,mg)
 * - 物化性状: 性状(1液体/2固体/3気体), 分子量, 沸点, logKow, 引火点, 水溶解度, 単位, 蒸気圧, 単位
 * - 法規制: 皮膚等障害・特化則, がん原性, 濃度基準値設定, 皮膚等障害裾切, 特化1類, 2類, 3類, 特化裾切,
 *   有機1種, 2種, 3種, 鉛, 四アルキル鉛
 */
export type OfficialSubstanceRecord = [
  cas: string,
  name: string,
  nameEn: string,
  ghs: Record<string, string>,
  oel: Array<number | null>,
  phys: [
    propertyType: number | null,
    molecularWeight: number | null,
    boilingPoint: number | null,
    logKow: number | null,
    flashPoint: number | null,
    solubility: number | null,
    solubilityUnit: string,
    vaporPressure: number | null,
    vaporPressureUnit: string,
  ],
  reg: string[],
];

export interface OfficialSubstanceData {
  source: { title: string; url: string; designDocument: string; count: number };
  substances: OfficialSubstanceRecord[];
}

const OEL_KEYS = ["cs8", "csShort", "jsoh", "jsohCeiling", "tlvTwa", "tlvStel", "tlvC", "mak", "makPeak"] as const;

function asPropertyType(v: number | null): CsPropertyType | null {
  return v === 1 || v === 2 || v === 3 ? v : null;
}

/** 液体の沸点から揮発性（CasSearch: CInt で整数化して 50 未満/50〜149/150 以上） */
export function volatilityFromBoilingPoint(boilingPoint: number): 1 | 2 | 3 {
  const bp = vbCInt(boilingPoint);
  if (bp < 50) return 1;
  if (bp <= 149) return 2;
  return 3;
}

/**
 * 作業温度が室温以外の場合の揮発性（公式「物質情報の編集」フォームの式。設計基準 3.1 の ILO のグラフ）
 * 沸点 ≦ 2×温度+10 → 高、沸点 < 5×温度+50 → 中、それ以外 → 低
 */
export function volatilityAtProcessTemperature(boilingPoint: number, processTemp: number): 1 | 2 | 3 {
  if (boilingPoint <= 2 * processTemp + 10) return 1;
  if (boilingPoint < 5 * processTemp + 50) return 2;
  return 3;
}

/** 昇華性など蒸気圧のある固体を液体製品で扱う場合の揮発性（設計基準 図表10） */
export function volatilityFromVaporPressure(vaporPressurePa: number): 1 | 2 | 3 {
  if (vaporPressurePa > 25000) return 1;
  if (vaporPressurePa >= 500) return 2;
  return 3;
}

export function substanceFromOfficial(record: OfficialSubstanceRecord, productType: CsPropertyType): CsSubstance {
  const [cas, name, , ghs, oel, phys, reg] = record;
  const [rawType, mw, bp, logKow, flashPoint, solubility, solubilityUnit, vp, vpUnit] = phys;
  const propertyType = asPropertyType(rawType);
  let oelType: CsPropertyType | null = propertyType;
  let volatility: number | null = null;

  if (propertyType === 1 && bp !== null) volatility = volatilityFromBoilingPoint(bp);
  const vaporPressurePa = vp !== null ? toPascals(vp, vpUnit) : 0;
  // 蒸気圧 0.5 Pa 未満の液体は極低揮発性
  if (propertyType === 1 && vaporPressurePa > 0 && vaporPressurePa < 0.5) volatility = 4;
  // 蒸気圧のある固体を液体製品で扱う場合は蒸気（ppm）として推計
  if (productType === 1 && propertyType === 2 && vaporPressurePa >= 0.5) {
    oelType = 1;
    volatility = volatilityFromVaporPressure(vaporPressurePa);
  }

  const unit: CsOelUnit = oelType === 2 ? "mg/m3" : "ppm";
  const offset = oelType === 2 ? 1 : 0;
  const oelSet: CsOelSet = {};
  OEL_KEYS.forEach((key, i) => {
    const value = oel[i * 2 + offset];
    if (value !== null && value !== undefined) oelSet[key] = { value, unit };
  });

  // 揮発性／飛散性の欄: 液体は上で決まった値、気体は「-」（=0）、それ以外は利用者が選ぶ
  let finalVolatility: CsVolatility | null = null;
  if (oelType === 1 && volatility !== null) finalVolatility = volatility as CsVolatility;
  else if (oelType === 3) finalVolatility = 0;

  const r = (i: number) => reg[i] ?? "";
  return {
    name,
    cas,
    propertyType,
    volatility: finalVolatility,
    ghs: { ...ghs },
    oel: oelSet,
    oelSource: 0,
    molecularWeight: mw,
    boilingPoint: bp,
    logKow,
    flashPoint,
    solubility: solubility !== null ? { value: solubility, unit: solubilityUnit } : null,
    vaporPressure: vp !== null ? { value: vp, unit: vpUnit } : null,
    regulatory: {
      skinEffect: r(0),
      carcinogenic: r(1),
      concentrationStandard: r(2),
      skinCutoff: r(3),
      specifiedClass1: r(4),
      specifiedClass2: r(5),
      specifiedClass3: r(6),
      specifiedCutoff: r(7),
      organicClass1: r(8),
      organicClass2: r(9),
      organicClass3: r(10),
      lead: r(11),
      tetraalkylLead: r(12),
    },
  };
}
