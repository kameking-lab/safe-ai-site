/**
 * CREATE-SIMPLE ver3.2.1 の計算関数（VBA modCalc の移植）。
 * 各関数の見出しに対応する「CREATE-SIMPLE の設計基準（2025年6月）」の節・図表を記す。
 * 設計基準の記載と Excel ツールの実装が異なる箇所は、利用者が公式ツールで得る結果に合わせて
 * Excel ツール（ver3.2.1）の実装どおりにしている（該当箇所に注記）。
 */
import { roundDownSignificant } from "./excel";
import type {
  CsAmountLevel,
  CsGhs,
  CsOelSet,
  CsOelSource,
  CsOelUnit,
  CsOelValue,
  CsPropertyType,
  CsRiskLevel,
} from "./types";

/** 公式 VBA の「値なし」 */
export const NA = -9999;

export function unitFor(propertyType: number): CsOelUnit {
  return propertyType === 1 || propertyType === 3 ? "ppm" : "mg/m3";
}

/** 設計基準 図表15 含有率の補正係数（modFunction.CalculateConcentrationCoeff） */
export function concentrationCoeff(contentPercent: number): number {
  if (contentPercent === 0) return NA;
  if (contentPercent >= 25) return 1;
  if (contentPercent >= 5) return 0.6;
  if (contentPercent >= 1) return 0.2;
  return 0.1;
}

/** 蒸気圧を Pa に換算（modCalc.ConvertToPascals。未知の単位は 0） */
export function toPascals(value: number, unit: string): number {
  switch (unit) {
    case "Pa":
      return value * 1;
    case "kPa":
      return value * 1000;
    case "hPa":
      return value * 100;
    case "mPa":
      return value * 0.001;
    case "mmHg":
    case "Torr":
      return value * 133.3;
    default:
      return 0;
  }
}

/** 水溶解度を mg/cm³ に換算（modCalc.ConvertToMgPerCm3）。未知の単位は null（公式ツールはエラーで停止） */
export function toMgPerCm3(value: number, unit: string): number | null {
  switch (unit) {
    case "mg/L":
      return value * 0.001;
    case "g/100mL":
      return value * 10;
    case "g/L":
    case "mg/mL":
    case "mg/cm3":
      return value * 1;
    default:
      return null;
  }
}

function oelVal(v: CsOelValue | undefined): number {
  return v ? v.value : NA;
}

function oelUnitMatches(v: CsOelValue | undefined, unit: CsOelUnit): boolean {
  return v !== undefined && v.unit === unit;
}

/** 設計基準 2.1・図表3 長時間（8時間）のばく露限界値の選定（modCalc.SelectOEL8Hour） */
export function selectOel8h(propertyType: number, oel: CsOelSet, source: CsOelSource): number {
  const unit = unitFor(propertyType);
  let preferred = 0;
  switch (source) {
    case 0:
    case 1:
      if (oelUnitMatches(oel.cs8, unit)) preferred = oelVal(oel.cs8);
      break;
    case 2:
      if (oelUnitMatches(oel.jsoh, unit)) preferred = oelVal(oel.jsoh);
      break;
    case 3:
      if (oelUnitMatches(oel.tlvTwa, unit)) preferred = oelVal(oel.tlvTwa);
      break;
    case 4:
      if (oelUnitMatches(oel.mak, unit)) preferred = oelVal(oel.mak);
      break;
    case 5:
      if (oelUnitMatches(oel.other8, unit)) preferred = oelVal(oel.other8);
      break;
  }
  if (preferred > 0) return preferred;
  let min = 99999;
  for (const v of [oel.cs8, oel.jsoh, oel.tlvTwa, oel.mak, oel.other8]) {
    if (oelUnitMatches(v, unit) && oelVal(v) > 0) min = Math.min(min, oelVal(v));
  }
  return min === 99999 ? NA : min;
}

/** 設計基準 2.1・図表4 短時間のばく露限界値の選定（modCalc.SelectOELShortTerm） */
export function selectOelShort(
  propertyType: number,
  oel: CsOelSet,
  source: CsOelSource,
  selectedOel8h: number,
  acrMax: number,
): number {
  const unit = unitFor(propertyType);
  let preferred = 0;
  switch (source) {
    case 0:
    case 1:
      if (oelUnitMatches(oel.csShort, unit)) preferred = oelVal(oel.csShort);
      break;
    case 2:
      if (oelUnitMatches(oel.jsohCeiling, unit)) preferred = oelVal(oel.jsohCeiling);
      break;
    case 3:
      if (oelUnitMatches(oel.tlvStel, unit) && oelVal(oel.tlvStel) > 0) preferred = oelVal(oel.tlvStel);
      else if (oelUnitMatches(oel.tlvC, unit) && oelVal(oel.tlvC) > 0) preferred = oelVal(oel.tlvC);
      break;
    case 4:
      if (oelUnitMatches(oel.makPeak, unit)) preferred = oelVal(oel.makPeak);
      break;
    case 5:
      if (oelUnitMatches(oel.otherShort, unit)) preferred = oelVal(oel.otherShort);
      break;
  }
  if (preferred > 0) return preferred;
  // 8時間濃度基準値がある場合は、その3倍値を採用する
  if (oelUnitMatches(oel.cs8, unit) && oelVal(oel.cs8) > 0) return oelVal(oel.cs8) * 3;
  let min = 99999;
  for (const v of [oel.csShort, oel.jsohCeiling, oel.tlvStel, oel.tlvC, oel.makPeak, oel.otherShort]) {
    if (oelUnitMatches(v, unit) && oelVal(v) > 0) min = Math.min(min, oelVal(v));
  }
  if (min !== 99999) return min;
  if (selectedOel8h > 0) return selectedOel8h * 3;
  if (acrMax > 0) return acrMax * 3;
  return NA;
}

const isAny = (value: string | undefined, ...candidates: string[]) =>
  value !== undefined && candidates.includes(value);

/**
 * 設計基準 2.2・図表5 管理目標濃度の上限（modCalc.CalculateACRMax）。
 * 「吸入の GHS 区分がない場合」は、ガス・蒸気・粉じんミストのいずれかが未分類なら該当（Excel ツールの実装）。
 */
export function acrMax(ghs: CsGhs, propertyType: number): number {
  const liquid = propertyType === 1 || propertyType === 3;
  const oral = ghs.acuteToxOral;
  const gas = ghs.acuteToxInhalationGases;
  const vapor = ghs.acuteToxInhalationVapors;
  const dust = ghs.acuteToxInhalationDustOrMist;
  const inhalationMissing = gas === undefined || vapor === undefined || dust === undefined;
  const inh = (cat: string) => gas === cat || vapor === cat || dust === cat;
  const { skinCorrOrIrrit: skin, eyeCorrOrIrrit: eye, respSens, skinSens, muta, carc, repr, stotSe, stotRe } = ghs;

  if (
    (oral === "1" && inhalationMissing) ||
    inh("1") ||
    isAny(muta, "1", "1A", "1B") ||
    isAny(carc, "1", "1A", "1B")
  ) {
    return liquid ? 0.05 : 0.001;
  }
  if (
    (oral === "2" && inhalationMissing) ||
    inh("2") ||
    skin === "1A" ||
    isAny(respSens, "1", "1A", "1B") ||
    isAny(muta, "2", "2A", "2B") ||
    isAny(carc, "2", "2A", "2B") ||
    isAny(repr, "1A", "1B", "1") ||
    stotRe === "1"
  ) {
    return liquid ? 0.5 : 0.01;
  }
  if (
    (oral === "3" && inhalationMissing) ||
    inh("3") ||
    isAny(skin, "1B", "1C", "1") ||
    eye === "1" ||
    isAny(skinSens, "1", "1A", "1B") ||
    repr === "2" ||
    stotSe === "1" ||
    stotRe === "2"
  ) {
    return liquid ? 5 : 0.1;
  }
  if (
    (oral === "4" && inhalationMissing) ||
    inh("4") ||
    skin === "2" ||
    eye === "2" ||
    isAny(stotSe, "2", "3")
  ) {
    return liquid ? 50 : 1;
  }
  return liquid ? 500 : 10;
}

/** 設計基準 4.2 経皮ばく露限界値（modCalc.CalculateOELDermal）。有効数字4桁で切り捨て */
export function oelDermal(selectedOel8h: number, acr: number, propertyType: number, molecularWeight: number): number | null {
  const standard = selectedOel8h === NA ? acr : selectedOel8h;
  if (standard <= 0) return null;
  let v: number;
  if (propertyType === 1) {
    v = (((molecularWeight / ((22.41 * 298.15) / 273.15)) * standard) * 0.75) * 10;
  } else if (propertyType === 2) {
    v = standard * 0.75 * 10;
  } else {
    return null;
  }
  return roundDownSignificant(v, 3);
}

/**
 * 設計基準 4.3 経皮吸収量（modCalc.CalculateDermalAbsorption）。有効数字3桁で切り捨て。
 * 計算できない入力のときは NA（公式ツールの表示は「-」）。
 */
export function dermalAbsorption(
  molecularWeight: number,
  vaporPressurePa: number,
  solubilityMgCm3: number,
  logKow: number,
  propertyType: number,
  workingHours: number,
  surfaceArea: number,
  gloveCoeff: number,
): number {
  if (
    molecularWeight <= 0 ||
    vaporPressurePa < 0 ||
    solubilityMgCm3 < 0 ||
    (propertyType !== 1 && propertyType !== 2) ||
    logKow === NA ||
    workingHours <= 0 ||
    surfaceArea <= 0 ||
    gloveCoeff <= 0
  ) {
    return NA;
  }
  const gasConstant = 8.314;
  const airVelocity = 1080;
  const kinematicViscosity = 0.054;
  const evaporationAreaLength = 0.1;
  const temperature = 293;

  const logKpSc = -1.326 + 0.6097 * logKow - 0.1786 * Math.sqrt(molecularWeight);
  const kpSc = 10 ** logKpSc;
  const kPol = 0.0001519 / Math.sqrt(molecularWeight);
  const kAq = 2.5 / Math.sqrt(molecularWeight);
  const kp = 1 / (1 / (kpSc + kPol) + 1 / kAq);
  const absorptionRate = kp * solubilityMgCm3;

  const molecularDiffusivity = 0.06 * (76 / molecularWeight) ** (1 / 2);
  const beta =
    (0.0111 * airVelocity ** 0.96 * molecularDiffusivity ** 0.19) /
    (kinematicViscosity ** 0.15 * evaporationAreaLength ** 0.04);
  const evaporationRate = (beta * vaporPressurePa * molecularWeight) / (gasConstant * temperature * 10);

  const denominator = absorptionRate + evaporationRate;
  if (denominator === 0) return NA; // 公式はゼロ除算エラー → -9999
  const retention = (propertyType === 1 ? 7 : 3) / denominator;
  let total = workingHours + retention;
  if (total > 10) total = 10;
  const absorption = absorptionRate * total * surfaceArea * gloveCoeff;
  if (!(absorption > 0) || !Number.isFinite(absorption)) return NA; // Log(0) エラー → -9999
  return roundDownSignificant(absorption, 2);
}

export interface ExposureBandInput {
  propertyType: number;
  volatility: number;
  shortTermEffect: boolean;
  concentrationCoeff: number;
  amountLevel: number;
  sprayCoeff: number;
  ventilationCoeff: number;
  workingAreaCoeff: number;
  frequencyWeekly: boolean;
  frequencyDays: number;
  workingHours: number;
  exposureVariationCoeff: number;
  respiratorCoeff: number;
}

const LIQUID_INITIAL: Record<number, Record<number, number>> = {
  1: { 1: 5000, 2: 500, 3: 50, 4: 50, 5: 5 },
  2: { 1: 500, 2: 500, 3: 50, 4: 5, 5: 5 },
  3: { 1: 50, 2: 50, 3: 5, 4: 5, 5: 0.5 },
  4: { 1: 5, 2: 5, 3: 0.5, 4: 0.5, 5: 0.05 },
};
const SOLID_INITIAL: Record<number, Record<number, number>> = {
  1: { 1: 100, 2: 10, 3: 1, 4: 0.1, 5: 0.1 },
  2: { 1: 100, 2: 10, 3: 0.1, 4: 0.1, 5: 0.1 },
  3: { 1: 1, 2: 1, 3: 0.1, 4: 0.1, 5: 0.01 },
};

/** 設計基準 3.2 図表13・14 初期ばく露濃度範囲の上限 */
export function initialExposureBand(propertyType: number, volatility: number, amountLevel: number): number {
  const table = propertyType === 1 ? LIQUID_INITIAL : propertyType === 2 ? SOLID_INITIAL : undefined;
  return table?.[volatility]?.[amountLevel] ?? 0;
}

/** 設計基準 3.3 図表20・21 作業時間・頻度による補正係数 */
export function timeCoeff(shortTermEffect: boolean, weekly: boolean, days: number, hours: number): number {
  if (shortTermEffect) return 1;
  let frequency = days;
  if (weekly) {
    if (frequency > 7) frequency = 7;
    if (hours * frequency > 40) return 10;
    if (hours > 8 && frequency >= 3) return 10;
    if (hours * frequency <= 4) return 0.1;
    return 1;
  }
  // Excel ツールは 31 日を超える入力を 0 日として扱う（VBA の実装どおり）
  if (frequency > 31) frequency = 0;
  return hours * frequency * 12 > 192 ? 1 : 0.1;
}

/**
 * 設計基準 3.3〜3.5 推定ばく露濃度範囲の上限（8時間・短時間）
 * （modCalc.CalculateExposureBands）
 */
export function exposureBands(input: ExposureBandInput): { exposure8h: number; exposureShort: number } {
  const initial = initialExposureBand(input.propertyType, input.volatility, input.amountLevel);
  let venti = input.ventilationCoeff;
  // 極低揮発性は飽和蒸気濃度を基準としているため、換気の係数（>1）は適用しない
  if (input.volatility === 4 && venti > 1) venti = 1;
  const tc = timeCoeff(input.shortTermEffect, input.frequencyWeekly, input.frequencyDays, input.workingHours);
  const c = input.concentrationCoeff;
  const s = input.sprayCoeff;
  const a = input.workingAreaCoeff;
  const apf = input.respiratorCoeff;

  let ep = initial * c * s * a * venti * tc * apf;
  ep = roundDownSignificant(ep, 2);
  const min = input.propertyType === 1 ? 0.005 : input.propertyType === 2 ? 0.001 : undefined;
  if (min !== undefined && ep < min) ep = min;

  let eps: number;
  if (input.volatility === 4 && s === 1) {
    eps = ep;
  } else {
    eps = initial * c * s * a * venti * input.exposureVariationCoeff * apf;
  }
  if (min !== undefined && eps < min) eps = min;
  eps = roundDownSignificant(eps, 2);
  if (ep > 5000) ep = 5000;
  if (eps > 5000) eps = 5000;
  return { exposure8h: ep, exposureShort: eps };
}

/** 設計基準 5.1 図表28 長時間のリスクレベル */
export function level8h(rcr: number): CsRiskLevel {
  if (rcr > 10) return "IV";
  if (rcr > 1) return "III";
  if (rcr > 0.5) return "II-B";
  if (rcr > 0.1) return "II-A";
  return "I";
}

/** 設計基準 5.1 図表29（短時間）・5.2 図表30（経皮）・5.3（合算） */
export function level4(rcr: number): CsRiskLevel {
  if (rcr > 10) return "IV";
  if (rcr > 1) return "III";
  if (rcr > 0.1) return "II";
  return "I";
}

export type PhysicalLevel = 1 | 2 | 3 | 4;

function clampLevel(t: number): PhysicalLevel {
  if (t >= 4) return 4;
  if (t === 3) return 3;
  if (t === 2) return 2;
  return 1;
}

const pick = (amount: CsAmountLevel, table: [number, number, number, number, number]) => table[amount - 1];

function reduceBy(t: number, a: boolean, b: boolean): number {
  if (a && b) return t - 2;
  if (a || b) return t - 1;
  return t;
}

/** 設計基準 図表31 可燃性・引火性ガス（エアゾールも Excel ツールはこの関数で判定する） */
export function flamGasLevel(cat: string, amount: CsAmountLevel, ignitionRemoved: boolean, atmospherePrevented: boolean): PhysicalLevel {
  let t = 0;
  if (cat === "1") t = pick(amount, [5, 5, 5, 4, 3]);
  else if (cat === "2") t = pick(amount, [5, 5, 4, 3, 2]);
  return clampLevel(reduceBy(t, ignitionRemoved, atmospherePrevented));
}

/** 設計基準 図表33 支燃性・酸化性ガス */
export function oxGasLevel(amount: CsAmountLevel): PhysicalLevel {
  return clampLevel(pick(amount, [5, 4, 3, 2, 2]));
}

/** 設計基準 図表34 高圧ガス */
export function gasesUnderPressureLevel(amount: CsAmountLevel): PhysicalLevel {
  return clampLevel(pick(amount, [2, 2, 2, 1, 1]));
}

/**
 * 設計基準 図表35 引火性液体。
 * Excel ツールの実装どおり、GHS 区分がなくても引火点があれば判定し、取扱温度＞引火点で区分1・2と同じ表を使う
 * （設計基準本文の「10℃の安全マージン」は Excel ツール ver3.2.1 には実装されていない）。
 */
export function flamLiqLevel(
  cat: string | undefined,
  flashPoint: number,
  processTemp: number,
  amount: CsAmountLevel,
  ignitionRemoved: boolean,
  atmospherePrevented: boolean,
): PhysicalLevel | null {
  if (cat === undefined && flashPoint === NA) return null;
  let fp = flashPoint;
  if (fp === NA) {
    if (cat === "1" || cat === "2" || cat === "3") fp = 23;
    else if (cat === "4") fp = 60;
  }
  let t = 0;
  if (processTemp > fp || cat === "1" || cat === "2") t = pick(amount, [5, 5, 4, 3, 2]);
  else if (cat === "3") t = pick(amount, [4, 3, 2, 2, 2]);
  else if (cat === "4") t = pick(amount, [3, 2, 2, 2, 1]);
  return clampLevel(reduceBy(t, ignitionRemoved, atmospherePrevented));
}

/**
 * 設計基準 図表36 可燃性固体。
 * 区分2の補正は Excel ツールの実装（VBA の Boolean と Integer のビット演算）どおり。
 * 揮発性／飛散性の値は 0 以外なら「真」として扱われるため、0 以外では常に1段階余分に下がる。
 */
export function flamSolLevel(
  cat: string,
  amount: CsAmountLevel,
  ignitionRemoved: boolean,
  atmospherePrevented: boolean,
  volatility: number,
): PhysicalLevel {
  let t = 0;
  if (cat === "1") {
    t = reduceBy(pick(amount, [5, 5, 4, 3, 2]), ignitionRemoved, atmospherePrevented);
  } else if (cat === "2") {
    t = pick(amount, [5, 5, 4, 3, 2]);
    const i = ignitionRemoved ? -1 : 0;
    const e = atmospherePrevented ? -1 : 0;
    const v = volatility | 0;
    if ((i & e & v) !== 0) t -= 3;
    else if (((i & e) | (i & v) | (e & v)) !== 0) t -= 2;
    else if ((i | e | v) !== 0) t -= 1;
  }
  return clampLevel(t);
}

/** 設計基準 図表37 自己反応性化学品・有機過酸化物 */
export function selfReactLevel(cat: string, amount: CsAmountLevel): PhysicalLevel {
  if (["A", "B", "C", "D", "E", "F"].includes(cat)) return 4;
  if (cat === "G") return clampLevel(pick(amount, [5, 4, 3, 2, 1]));
  return 1;
}

/** 設計基準 図表38 自己発熱性化学品 */
export function selfHeatLevel(amount: CsAmountLevel, noAirWaterContact: boolean): PhysicalLevel {
  let t = pick(amount, [5, 4, 3, 2, 2]);
  if (noAirWaterContact) t -= 1;
  return clampLevel(t);
}

/** 設計基準 図表39 水反応可燃性化学品 */
export function waterReactLevel(cat: string, amount: CsAmountLevel, ignitionRemoved: boolean, noAirWaterContact: boolean): PhysicalLevel {
  if (cat === "1") return 4;
  if (cat === "2") return clampLevel(reduceBy(pick(amount, [5, 5, 4, 4, 3]), ignitionRemoved, noAirWaterContact));
  if (cat === "3") return clampLevel(reduceBy(pick(amount, [5, 4, 3, 3, 2]), ignitionRemoved, noAirWaterContact));
  return 1;
}

/** 設計基準 図表40 酸化性液体・酸化性固体 */
export function oxLiqSolLevel(cat: string, amount: CsAmountLevel, noOrganicNearby: boolean): PhysicalLevel {
  let t = 0;
  if (cat === "1") t = pick(amount, [5, 4, 3, 2, 2]);
  else if (cat === "2") t = pick(amount, [4, 3, 2, 2, 2]);
  else if (cat === "3") t = pick(amount, [3, 2, 2, 2, 1]);
  if (noOrganicNearby) t -= 1;
  return clampLevel(t);
}

export function isConcreteOel(v: number): boolean {
  return v !== NA;
}

export type { CsPropertyType };
