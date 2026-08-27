import {
  MAX_AREA_M2,
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
import type { AreaUnit, CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres, toSquareMetres } from "./units";

export const AVERAGE_END_AREA_CALCULATOR_ID = "average-end-area";
export const AVERAGE_END_AREA_FORMULA_VERSION = "1.0.0";

export interface AverageEndAreaSegment {
  startArea: number;
  endArea: number;
  length: number;
}

export interface AverageEndAreaInput {
  segments: AverageEndAreaSegment[];
  areaUnit: AreaUnit;
  lengthUnit: LengthUnit;
  rounding?: RoundingConfig;
}

export function calculateAverageEndArea(input: AverageEndAreaInput): CalculationOutcome {
  const unitIssues = compactIssues([
    enumIssue("areaUnit", input.areaUnit, ["mm2", "cm2", "m2"]),
    enumIssue("lengthUnit", input.lengthUnit, ["mm", "cm", "m"]),
  ]);
  if (unitIssues.length) return invalid(unitIssues);
  if (!Array.isArray(input.segments) || input.segments.length === 0 || input.segments.length > 500) {
    return invalid([{ field: "segments", code: "out-of-range", message: "区間は1〜500件で入力してください。" }]);
  }
  const issues = input.segments.flatMap((segment, index) =>
    compactIssues([
      nonNegativeIssue(`segments.${index}.startArea`, toSquareMetres(segment.startArea, input.areaUnit), MAX_AREA_M2),
      nonNegativeIssue(`segments.${index}.endArea`, toSquareMetres(segment.endArea, input.areaUnit), MAX_AREA_M2),
      positiveIssue(`segments.${index}.length`, toMetres(segment.length, input.lengthUnit), MAX_LINEAR_METRES),
    ]),
  );
  if (issues.length) return invalid(issues);
  const emptyIndex = input.segments.findIndex(
    (segment) => segment.startArea === 0 && segment.endArea === 0,
  );
  if (emptyIndex >= 0) {
    return invalid([
      {
        field: `segments.${emptyIndex}.startArea`,
        code: "zero",
        message: "前後断面積がともに0の区間は計算できません。",
      },
    ]);
  }

  const sectionVolumes = input.segments.map((segment) => {
    const startM2 = toSquareMetres(segment.startArea, input.areaUnit);
    const endM2 = toSquareMetres(segment.endArea, input.areaUnit);
    const lengthM = toMetres(segment.length, input.lengthUnit);
    return ((startM2 + endM2) / 2) * lengthM;
  });
  const totalVolumeM3 = sectionVolumes.reduce((sum, value) => sum + value, 0);
  const resultIssue = resultTooLargeIssue("totalVolumeM3", totalVolumeM3, MAX_VOLUME_M3);
  if (resultIssue) return invalid([resultIssue]);
  const rounding = normalizeRounding(input.rounding);
  const roundedSections = sectionVolumes.map((value) => applyRounding(value, rounding));
  const roundedTotal = applyRounding(totalVolumeM3, rounding);

  return validResult({
    calculatorId: AVERAGE_END_AREA_CALCULATOR_ID,
    formulaVersion: AVERAGE_END_AREA_FORMULA_VERSION,
    rawOutputs: { sectionVolumesM3: sectionVolumes, totalVolumeM3 },
    outputs: { sectionVolumesM3: roundedSections, totalVolumeM3: roundedTotal },
    displayValues: [{ key: "totalVolumeM3", label: "合計土量", value: roundedTotal, unit: "m³" }],
    usedInputs: {
      segments: input.segments.map((segment) => ({
        startArea: segment.startArea,
        endArea: segment.endArea,
        length: segment.length,
      })),
      areaUnit: input.areaUnit,
      lengthUnit: input.lengthUnit,
      rounding: { ...rounding },
    },
    formula: ["区間土量 Vᵢ = (Aᵢ + Aᵢ₊₁) ÷ 2 × Lᵢ", "合計土量 = ΣVᵢ"],
    rounding,
    assumptions: ["区間内の断面積は両端間で線形に変化する近似とする。", "各区間の未丸め値を合計してから最終丸めを行う。"],
  });
}
