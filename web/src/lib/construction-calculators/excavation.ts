import {
  MAX_LINEAR_METRES,
  MAX_VOLUME_M3,
  applyRounding,
  compactIssues,
  enumIssue,
  invalid,
  nonNegativeIssue,
  normalizeRounding,
  positiveIssue,
  resultTooLargeIssue,
  validResult,
} from "./core";
import type { CalculationOutcome, LengthUnit, RoundingConfig, VolumeUnit } from "./types";
import { toCubicMetres, toMetres } from "./units";

export const EXCAVATION_CALCULATOR_ID = "excavation-backfill";
export const EXCAVATION_FORMULA_VERSION = "1.0.0";

export interface ExcavationInput {
  shape: "vertical" | "sloped-trench" | "sloped-pit";
  length: number;
  width: number;
  depth: number;
  dimensionUnit: LengthUnit;
  sideSlopeHorizontalPerVertical: number;
  structureVolume: number;
  baseMaterialVolume: number;
  deductionVolumeUnit: VolumeUnit;
  rounding?: RoundingConfig;
}

export function calculateExcavation(input: ExcavationInput): CalculationOutcome {
  const issues = compactIssues([
    enumIssue("shape", input.shape, ["vertical", "sloped-trench", "sloped-pit"]),
    enumIssue("dimensionUnit", input.dimensionUnit, ["mm", "cm", "m"]),
    enumIssue("deductionVolumeUnit", input.deductionVolumeUnit, ["L", "m3"]),
    positiveIssue("length", toMetres(input.length, input.dimensionUnit), MAX_LINEAR_METRES),
    positiveIssue("width", toMetres(input.width, input.dimensionUnit), MAX_LINEAR_METRES),
    positiveIssue("depth", toMetres(input.depth, input.dimensionUnit), MAX_LINEAR_METRES),
    nonNegativeIssue("sideSlopeHorizontalPerVertical", input.sideSlopeHorizontalPerVertical, 100),
    nonNegativeIssue("structureVolume", input.structureVolume, MAX_VOLUME_M3),
    nonNegativeIssue("baseMaterialVolume", input.baseMaterialVolume, MAX_VOLUME_M3),
  ]);
  if (issues.length) return invalid(issues);

  const lengthM = toMetres(input.length, input.dimensionUnit);
  const widthM = toMetres(input.width, input.dimensionUnit);
  const depthM = toMetres(input.depth, input.dimensionUnit);
  const slope = input.sideSlopeHorizontalPerVertical;
  let excavationVolumeM3: number;
  if (input.shape === "vertical") {
    excavationVolumeM3 = lengthM * widthM * depthM;
  } else if (input.shape === "sloped-trench") {
    excavationVolumeM3 = lengthM * (widthM * depthM + slope * depthM ** 2);
  } else {
    excavationVolumeM3 =
      depthM *
      (lengthM * widthM +
        slope * depthM * (lengthM + widthM) +
        (4 / 3) * slope ** 2 * depthM ** 2);
  }
  const deductionM3 =
    toCubicMetres(input.structureVolume, input.deductionVolumeUnit) +
    toCubicMetres(input.baseMaterialVolume, input.deductionVolumeUnit);
  if (deductionM3 > excavationVolumeM3) {
    return invalid([
      {
        field: "structureVolume",
        code: "inconsistent",
        message: "構造物体積と基礎材体積の合計が掘削量を超えています。",
      },
    ]);
  }
  const backfillVolumeM3 = excavationVolumeM3 - deductionM3;
  const resultIssue = resultTooLargeIssue("excavationVolumeM3", excavationVolumeM3, MAX_VOLUME_M3);
  if (resultIssue) return invalid([resultIssue]);
  const rounding = normalizeRounding(input.rounding);
  const rounded = {
    excavationVolumeM3: applyRounding(excavationVolumeM3, rounding),
    deductionVolumeM3: applyRounding(deductionM3, rounding),
    backfillVolumeM3: applyRounding(backfillVolumeM3, rounding),
  };
  const shapeFormula =
    input.shape === "vertical"
      ? "掘削量 = 長さ × 幅 × 深さ"
      : input.shape === "sloped-trench"
        ? "掘削量 = 長さ × (底幅 × 深さ + 法勾配 × 深さ²)"
        : "掘削量 = 深さ × {長さ×幅 + 法勾配×深さ×(長さ+幅) + 4/3×法勾配²×深さ²}";

  return validResult({
    calculatorId: EXCAVATION_CALCULATOR_ID,
    formulaVersion: EXCAVATION_FORMULA_VERSION,
    rawOutputs: { excavationVolumeM3, deductionVolumeM3: deductionM3, backfillVolumeM3 },
    outputs: rounded,
    displayValues: [
      { key: "excavationVolumeM3", label: "掘削量", value: rounded.excavationVolumeM3, unit: "m³" },
      { key: "deductionVolumeM3", label: "控除量", value: rounded.deductionVolumeM3, unit: "m³" },
      { key: "backfillVolumeM3", label: "埋戻し量", value: rounded.backfillVolumeM3, unit: "m³" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: [shapeFormula, "控除量 = 構造物体積 + 基礎材体積", "埋戻し量 = 掘削量 − 控除量"],
    rounding,
    assumptions: [
      "法勾配は水平/鉛直の比で入力する。",
      input.shape === "sloped-trench" ? "法付き溝は幅方向の両側だけが同じ勾配で広がり、延長方向の端面は鉛直とする。" : "法付き掘削は四辺が同じ勾配で連続的に広がるものとして積分する。",
      "余掘り、土量変化、締固めはこの計算に含めない。",
    ],
  });
}
