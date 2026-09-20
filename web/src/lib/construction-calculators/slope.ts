import {
  MAX_LINEAR_METRES,
  applyRounding,
  compactIssues,
  enumIssue,
  finiteIssue,
  invalid,
  normalizeRounding,
  positiveIssue,
  resultTooLargeIssue,
  validResult,
} from "./core";
import type { CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres } from "./units";

export const SLOPE_CALCULATOR_ID = "slope-angle-length";
export const SLOPE_FORMULA_VERSION = "1.0.0";

const MAX_SLOPE_PERCENT = 100_000_000;
const MAX_SLOPE_PERMILLE = 1_000_000_000;
const MAX_RATIO_N = 1_000_000_000;

export type SlopeInput = {
  horizontalDistance: number;
  lengthUnit: LengthUnit;
  rounding?: RoundingConfig;
} & (
  | { mode: "rise-run"; rise: number }
  | { mode: "percent-run"; slopePercent: number }
  | { mode: "angle-run"; angleDegrees: number }
  | { mode: "ratio-run"; ratioN: number }
);

export function calculateSlope(input: SlopeInput): CalculationOutcome {
  const modeIssue =
    input.mode === "rise-run"
      ? finiteIssue("rise", input.rise)
      : input.mode === "percent-run"
        ? finiteIssue("slopePercent", input.slopePercent)
        : input.mode === "angle-run"
          ? finiteIssue("angleDegrees", input.angleDegrees)
          : positiveIssue("ratioN", input.ratioN, 1_000_000);
  const issues = compactIssues([
    enumIssue("mode", input.mode, ["rise-run", "percent-run", "angle-run", "ratio-run"]),
    enumIssue("lengthUnit", input.lengthUnit, ["mm", "cm", "m"]),
    positiveIssue("horizontalDistance", toMetres(input.horizontalDistance, input.lengthUnit), MAX_LINEAR_METRES),
    modeIssue,
  ]);
  if (issues.length) return invalid(issues);
  if (input.mode === "angle-run" && Math.abs(input.angleDegrees) >= 89.999999) {
    return invalid([{ field: "angleDegrees", code: "out-of-range", message: "角度は-89.999999°より大きく89.999999°未満で入力してください。" }]);
  }
  const horizontalM = toMetres(input.horizontalDistance, input.lengthUnit);
  const riseM =
    input.mode === "rise-run"
      ? toMetres(input.rise, input.lengthUnit)
      : input.mode === "percent-run"
        ? horizontalM * (input.slopePercent / 100)
        : input.mode === "angle-run"
          ? horizontalM * Math.tan((input.angleDegrees * Math.PI) / 180)
          : horizontalM / input.ratioN;
  const gradeDecimal = riseM / horizontalM;
  const slopePercent = gradeDecimal * 100;
  const slopePermille = gradeDecimal * 1_000;
  const ratioN = gradeDecimal === 0 ? null : 1 / Math.abs(gradeDecimal);
  const angleDegrees = (Math.atan(gradeDecimal) * 180) / Math.PI;
  const slopedLengthM = Math.hypot(horizontalM, riseM);
  const drivingField =
    input.mode === "rise-run"
      ? "rise"
      : input.mode === "percent-run"
        ? "slopePercent"
        : input.mode === "angle-run"
          ? "angleDegrees"
          : "ratioN";
  const resultIssues = compactIssues([
    resultTooLargeIssue(drivingField, riseM, MAX_LINEAR_METRES),
    resultTooLargeIssue(
      drivingField,
      slopedLengthM,
      Math.hypot(MAX_LINEAR_METRES, MAX_LINEAR_METRES),
    ),
    resultTooLargeIssue(drivingField, slopePercent, MAX_SLOPE_PERCENT),
    resultTooLargeIssue(drivingField, slopePermille, MAX_SLOPE_PERMILLE),
    ratioN === null ? null : resultTooLargeIssue(drivingField, ratioN, MAX_RATIO_N),
    resultTooLargeIssue(drivingField, angleDegrees, 90),
  ]);
  if (resultIssues.length) return invalid(resultIssues);
  const rounding = normalizeRounding(input.rounding);
  const outputs = {
    horizontalDistanceM: applyRounding(horizontalM, rounding),
    riseM: applyRounding(riseM, rounding),
    slopePercent: applyRounding(slopePercent, rounding),
    slopePermille: applyRounding(slopePermille, rounding),
    ratioN: ratioN === null ? null : applyRounding(ratioN, rounding),
    angleDegrees: applyRounding(angleDegrees, rounding),
    slopedLengthM: applyRounding(slopedLengthM, rounding),
  };
  return validResult({
    calculatorId: SLOPE_CALCULATOR_ID,
    formulaVersion: SLOPE_FORMULA_VERSION,
    rawOutputs: { horizontalDistanceM: horizontalM, riseM, slopePercent, slopePermille, ratioN, angleDegrees, slopedLengthM },
    outputs,
    displayValues: [
      { key: "slopePercent", label: "勾配", value: outputs.slopePercent, unit: "%" },
      { key: "slopePermille", label: "勾配", value: outputs.slopePermille, unit: "‰" },
      { key: "ratioN", label: "比率", value: outputs.ratioN === null ? "水平" : `1:${outputs.ratioN}`, unit: "" },
      { key: "angleDegrees", label: "角度", value: outputs.angleDegrees, unit: "°" },
      { key: "riseM", label: "高低差", value: outputs.riseM, unit: "m" },
      { key: "slopedLengthM", label: "斜長", value: outputs.slopedLengthM, unit: "m" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: [
      "勾配(%) = 高低差 ÷ 水平距離 × 100",
      "勾配(‰) = 高低差 ÷ 水平距離 × 1000",
      "1:n の n = 水平距離 ÷ |高低差|",
      "角度 = atan(高低差 ÷ 水平距離)",
      "斜長 = √(水平距離² + 高低差²)",
    ],
    rounding,
    assumptions: ["水平距離と高低差は同一平面内の直角三角形として扱う。", "負の高低差・勾配・角度は下り方向を示すだけで、適否は判定しない。"],
  });
}
