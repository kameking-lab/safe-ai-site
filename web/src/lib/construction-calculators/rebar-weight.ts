import {
  MAX_COUNT,
  MAX_LINEAR_METRES,
  MAX_MASS_KG,
  applyRounding,
  compactIssues,
  enumIssue,
  integerIssue,
  invalid,
  normalizeRounding,
  positiveIssue,
  resultTooLargeIssue,
  validResult,
} from "./core";
import type { CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres } from "./units";

export const REBAR_WEIGHT_CALCULATOR_ID = "rebar-weight";
export const REBAR_WEIGHT_FORMULA_VERSION = "1.1.0";
export const STEEL_DENSITY_KG_M3 = 7_850;

export interface RebarWeightInput {
  barType?: "deformed" | "round";
  barDesignation?: string;
  diameterMm: number;
  length: number;
  lengthUnit: LengthUnit;
  quantity: number;
  rounding?: RoundingConfig;
}

// JFE 建材ナビゲーター PDF p.70（紙面2-12）の寸法・単位質量表。
// JFE条鋼の寸法・重量表（2025.01、PDF p.5）と12径を照合。
export const DEFORMED_REBAR_TABLE: Record<string,{diameterMm:number;kgPerMetre:number}> = {
 D10:{diameterMm:9.53,kgPerMetre:.560},D13:{diameterMm:12.7,kgPerMetre:.995},D16:{diameterMm:15.9,kgPerMetre:1.56},D19:{diameterMm:19.1,kgPerMetre:2.25},D22:{diameterMm:22.2,kgPerMetre:3.04},D25:{diameterMm:25.4,kgPerMetre:3.98},D29:{diameterMm:28.6,kgPerMetre:5.04},D32:{diameterMm:31.8,kgPerMetre:6.23},D35:{diameterMm:34.9,kgPerMetre:7.51},D38:{diameterMm:38.1,kgPerMetre:8.95},D41:{diameterMm:41.3,kgPerMetre:10.5},D51:{diameterMm:50.8,kgPerMetre:15.9},
};
export function rebarProperties(input:{diameterMm:number;barType?:string;barDesignation?:string}) {
 const tableBased=input.barType==="deformed";
 const record=tableBased?DEFORMED_REBAR_TABLE[input.barDesignation ?? ""]:undefined;
 return {tableBased,diameterMm:tableBased?(record?.diameterMm ?? Number.NaN):input.diameterMm,massPerMetreKg:tableBased?(record?.kgPerMetre ?? Number.NaN):rebarMassPerMetreKg(input.diameterMm)};
}

export function rebarMassPerMetreKg(diameterMm: number): number {
  const diameterM = diameterMm / 1_000;
  return (Math.PI * diameterM ** 2 * STEEL_DENSITY_KG_M3) / 4;
}

export function calculateRebarWeight(input: RebarWeightInput): CalculationOutcome {
  const properties = rebarProperties(input);
  const issues = compactIssues([
    input.barType === undefined ? null : enumIssue("barType",input.barType,["deformed","round"]),
    properties.tableBased ? enumIssue("barDesignation",input.barDesignation,Object.keys(DEFORMED_REBAR_TABLE)) : null,
    enumIssue("lengthUnit", input.lengthUnit, ["mm", "cm", "m"]),
    positiveIssue("diameterMm", properties.diameterMm, 1_000),
    positiveIssue("length", toMetres(input.length, input.lengthUnit), MAX_LINEAR_METRES),
    integerIssue("quantity", input.quantity, 1, MAX_COUNT),
  ]);
  if (issues.length) return invalid(issues);
  const lengthM = toMetres(input.length, input.lengthUnit);
  const massPerMetreKg = properties.massPerMetreKg;
  const massPerBarKg = massPerMetreKg * lengthM;
  const totalLengthM = lengthM * input.quantity;
  const totalMassKg = massPerMetreKg * totalLengthM;
  const resultIssue = resultTooLargeIssue("totalMassKg", totalMassKg, MAX_MASS_KG);
  if (resultIssue) return invalid([resultIssue]);
  const rounding = normalizeRounding(input.rounding);
  const outputs = {
    massPerMetreKg: applyRounding(massPerMetreKg, rounding),
    massPerBarKg: applyRounding(massPerBarKg, rounding),
    totalLengthM: applyRounding(totalLengthM, rounding),
    totalMassKg: applyRounding(totalMassKg, rounding),
    totalMassT: applyRounding(totalMassKg / 1_000, rounding),
  };
  return validResult({
    calculatorId: REBAR_WEIGHT_CALCULATOR_ID,
    formulaVersion: REBAR_WEIGHT_FORMULA_VERSION,
    rawOutputs: { massPerMetreKg, massPerBarKg, totalLengthM, totalMassKg, totalMassT: totalMassKg / 1_000 },
    outputs,
    displayValues: [
      { key: "massPerMetreKg", label: properties.tableBased ? "1m当たり重量（規格表）" : "1m当たり重量（丸鋼概算）", value: outputs.massPerMetreKg, unit: "kg/m" },
      { key: "massPerBarKg", label: "1本重量", value: outputs.massPerBarKg, unit: "kg" },
      { key: "totalLengthM", label: "総延長", value: outputs.totalLengthM, unit: "m" },
      { key: "totalMassKg", label: "総重量", value: outputs.totalMassKg, unit: "kg" },
      { key: "totalMassT", label: "t換算", value: outputs.totalMassT, unit: "t" },
    ],
    usedInputs: { ...input, diameterMm: properties.diameterMm, effectiveDiameterMm: properties.diameterMm, massMethod: properties.tableBased ? "JFE規格単位質量表" : "丸鋼の真円計算", steelDensityKgM3: STEEL_DENSITY_KG_M3, rounding: { ...rounding } },
    formula: properties.tableBased ? ["1m当たり重量 = 指定したD呼び名の規格単位質量", "総重量 = 規格単位質量 × 1本長さ × 本数"] : [
      "断面積 = π × (呼び径 ÷ 1000)² ÷ 4",
      "1m当たり重量 = 断面積 × 鋼の密度7,850 kg/m³",
      "総重量 = 1m当たり重量 × 1本長さ × 本数",
    ],
    rounding,
    assumptions: properties.tableBased ? ["異形棒鋼はJFEの公称単位質量表を使用。実重量・加工ロスは含まない。", "対象製品の規格・ミルシートを確認してください。"] : [
      "呼び径を真円の直径とみなす幾何学的概算で、異形鉄筋のJIS単位質量表の転載・照合値ではない。",
      "鋼の密度は7,850 kg/m³とする。ミルシート、製品規格、加工ロスは別途確認する。",
    ],
    warnings: properties.tableBased ? ["規格表による概算です。加工ロスと実重量は別途確認してください。"] : ["異形鉄筋の公称単位質量ではありません。製品規格・ミルシートを確認してください。"],
  });
}
