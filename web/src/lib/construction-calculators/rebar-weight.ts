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
export const REBAR_WEIGHT_FORMULA_VERSION = "1.0.0";
export const STEEL_DENSITY_KG_M3 = 7_850;

export interface RebarWeightInput {
  diameterMm: number;
  length: number;
  lengthUnit: LengthUnit;
  quantity: number;
  rounding?: RoundingConfig;
}

export function rebarMassPerMetreKg(diameterMm: number): number {
  const diameterM = diameterMm / 1_000;
  return (Math.PI * diameterM ** 2 * STEEL_DENSITY_KG_M3) / 4;
}

export function calculateRebarWeight(input: RebarWeightInput): CalculationOutcome {
  const issues = compactIssues([
    enumIssue("lengthUnit", input.lengthUnit, ["mm", "cm", "m"]),
    positiveIssue("diameterMm", input.diameterMm, 1_000),
    positiveIssue("length", toMetres(input.length, input.lengthUnit), MAX_LINEAR_METRES),
    integerIssue("quantity", input.quantity, 1, MAX_COUNT),
  ]);
  if (issues.length) return invalid(issues);
  const lengthM = toMetres(input.length, input.lengthUnit);
  const massPerMetreKg = rebarMassPerMetreKg(input.diameterMm);
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
      { key: "massPerMetreKg", label: "1m当たり重量", value: outputs.massPerMetreKg, unit: "kg/m" },
      { key: "massPerBarKg", label: "1本重量", value: outputs.massPerBarKg, unit: "kg" },
      { key: "totalLengthM", label: "総延長", value: outputs.totalLengthM, unit: "m" },
      { key: "totalMassKg", label: "総重量", value: outputs.totalMassKg, unit: "kg" },
      { key: "totalMassT", label: "t換算", value: outputs.totalMassT, unit: "t" },
    ],
    usedInputs: { ...input, steelDensityKgM3: STEEL_DENSITY_KG_M3, rounding: { ...rounding } },
    formula: [
      "断面積 = π × (呼び径 ÷ 1000)² ÷ 4",
      "1m当たり重量 = 断面積 × 鋼の密度7,850 kg/m³",
      "総重量 = 1m当たり重量 × 1本長さ × 本数",
    ],
    rounding,
    assumptions: [
      "呼び径を真円の直径とみなす幾何学的概算で、異形鉄筋のJIS単位質量表の転載・照合値ではない。",
      "鋼の密度は7,850 kg/m³とする。ミルシート、製品規格、加工ロスは別途確認する。",
    ],
  });
}
