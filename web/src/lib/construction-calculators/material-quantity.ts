import {
  MAX_AREA_M2,
  MAX_LINEAR_METRES,
  MAX_MASS_KG,
  MAX_VOLUME_M3,
  applyRounding,
  ceilCount,
  compactIssues,
  enumIssue,
  invalid,
  normalizeRounding,
  percentageIssue,
  positiveIssue,
  resultTooLargeIssue,
  resultCountIssue,
  validResult,
} from "./core";
import type {
  AreaUnit,
  CalculationOutcome,
  DensityUnit,
  LengthUnit,
  MassUnit,
  RoundingConfig,
} from "./types";
import { toKilograms, toKilogramsPerCubicMetre, toMetres, toSquareMetres } from "./units";

export const AGGREGATE_BASE_CALCULATOR_ID = "aggregate-base-quantity";
export const ASPHALT_MIXTURE_CALCULATOR_ID = "asphalt-mixture-quantity";
export const MATERIAL_QUANTITY_FORMULA_VERSION = "1.0.0";

export interface MaterialQuantityInput {
  area: number;
  areaUnit: AreaUnit;
  thickness: number;
  thicknessUnit: LengthUnit;
  density: number;
  densityUnit: DensityUnit;
  lossPercent: number;
  vehicleCapacity: number;
  vehicleCapacityUnit: MassUnit;
  rounding?: RoundingConfig;
}

function calculateMaterial(
  input: MaterialQuantityInput,
  calculatorId: typeof AGGREGATE_BASE_CALCULATOR_ID | typeof ASPHALT_MIXTURE_CALCULATOR_ID,
): CalculationOutcome {
  const issues = compactIssues([
    enumIssue("areaUnit", input.areaUnit, ["mm2", "cm2", "m2"]),
    enumIssue("thicknessUnit", input.thicknessUnit, ["mm", "cm", "m"]),
    enumIssue("densityUnit", input.densityUnit, ["kg/m3", "t/m3"]),
    enumIssue("vehicleCapacityUnit", input.vehicleCapacityUnit, ["kg", "t"]),
    positiveIssue("area", toSquareMetres(input.area, input.areaUnit), MAX_AREA_M2),
    positiveIssue("thickness", toMetres(input.thickness, input.thicknessUnit), MAX_LINEAR_METRES),
    positiveIssue("density", toKilogramsPerCubicMetre(input.density, input.densityUnit), 50_000),
    percentageIssue("lossPercent", input.lossPercent),
    positiveIssue("vehicleCapacity", toKilograms(input.vehicleCapacity, input.vehicleCapacityUnit), MAX_MASS_KG),
  ]);
  if (issues.length) return invalid(issues);

  const areaM2 = toSquareMetres(input.area, input.areaUnit);
  const thicknessM = toMetres(input.thickness, input.thicknessUnit);
  const densityKgM3 = toKilogramsPerCubicMetre(input.density, input.densityUnit);
  const netVolumeM3 = areaM2 * thicknessM;
  const requiredVolumeM3 = netVolumeM3 * (1 + input.lossPercent / 100);
  const requiredMassKg = requiredVolumeM3 * densityKgM3;
  const vehicleCapacityKg = toKilograms(input.vehicleCapacity, input.vehicleCapacityUnit);
  const vehicleCount = ceilCount(requiredMassKg / vehicleCapacityKg);
  const resultIssues = compactIssues([
    resultTooLargeIssue("requiredVolumeM3", requiredVolumeM3, MAX_VOLUME_M3),
    resultTooLargeIssue("requiredMassKg", requiredMassKg, MAX_MASS_KG),
    resultCountIssue("vehicleCount", vehicleCount),
  ]);
  if (resultIssues.length) return invalid(resultIssues);
  const rounding = normalizeRounding(input.rounding);
  const outputs = {
    netVolumeM3: applyRounding(netVolumeM3, rounding),
    requiredVolumeM3: applyRounding(requiredVolumeM3, rounding),
    requiredMassKg: applyRounding(requiredMassKg, rounding),
    requiredMassT: applyRounding(requiredMassKg / 1_000, rounding),
    vehicleCount,
  };
  return validResult({
    calculatorId,
    formulaVersion: MATERIAL_QUANTITY_FORMULA_VERSION,
    rawOutputs: { netVolumeM3, requiredVolumeM3, requiredMassKg, requiredMassT: requiredMassKg / 1_000, vehicleCount },
    outputs,
    displayValues: [
      { key: "requiredVolumeM3", label: "必要体積", value: outputs.requiredVolumeM3, unit: "m³" },
      { key: "requiredMassT", label: "必要重量", value: outputs.requiredMassT, unit: "t" },
      { key: "vehicleCount", label: "車両台数", value: vehicleCount, unit: "台" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: [
      "正味体積 = 面積 × 厚さ",
      "必要体積 = 正味体積 × (1 + ロス率 ÷ 100)",
      "必要重量 = 必要体積 × 密度",
      "車両台数 = ceil(必要重量 ÷ 1台積載量)",
    ],
    rounding,
    assumptions: [
      "入力した厚さが施工後の平均厚さとして面積全体に一様に確保される近似とする。",
      "密度、ロス率、車両積載量は材料・配合・含水状態・仕様書を確認した利用者入力値を使う。",
      "車両台数は端数を1台へ切り上げる。発注単位や過積載可否は判定しない。",
    ],
  });
}

export const calculateAggregateBase = (input: MaterialQuantityInput): CalculationOutcome =>
  calculateMaterial(input, AGGREGATE_BASE_CALCULATOR_ID);

export const calculateAsphaltMixture = (input: MaterialQuantityInput): CalculationOutcome =>
  calculateMaterial(input, ASPHALT_MIXTURE_CALCULATOR_ID);
