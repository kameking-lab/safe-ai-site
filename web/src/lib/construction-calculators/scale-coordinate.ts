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

export const SCALE_COORDINATE_CALCULATOR_ID = "scale-coordinate";
export const SCALE_COORDINATE_FORMULA_VERSION = "1.0.0";

export type ScaleCoordinateInput =
  | {
      mode: "scale";
      solveFor: "actual";
      scaleDenominator: number;
      drawingLength: number;
      drawingUnit: LengthUnit;
      actualUnit: LengthUnit;
      rounding?: RoundingConfig;
    }
  | {
      mode: "scale";
      solveFor: "drawing";
      scaleDenominator: number;
      actualLength: number;
      actualUnit: LengthUnit;
      drawingUnit: LengthUnit;
      rounding?: RoundingConfig;
    }
  | {
      mode: "coordinate";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      coordinateUnit: LengthUnit;
      rounding?: RoundingConfig;
    };

function fromMetres(value: number, unit: LengthUnit): number {
  return value / (unit === "m" ? 1 : unit === "cm" ? 0.01 : 0.001);
}

export function calculateScaleCoordinate(input: ScaleCoordinateInput): CalculationOutcome {
  const rounding = normalizeRounding(input.rounding);
  const modeIssue = enumIssue("mode", input.mode, ["scale", "coordinate"]);
  if (modeIssue) return invalid([modeIssue]);
  if (input.mode === "scale") {
    const sourceValue = input.solveFor === "actual" ? input.drawingLength : input.actualLength;
    const sourceField = input.solveFor === "actual" ? "drawingLength" : "actualLength";
    const sourceUnit = input.solveFor === "actual" ? input.drawingUnit : input.actualUnit;
    const issues = compactIssues([
      enumIssue("solveFor", input.solveFor, ["actual", "drawing"]),
      enumIssue("drawingUnit", input.drawingUnit, ["mm", "cm", "m"]),
      enumIssue("actualUnit", input.actualUnit, ["mm", "cm", "m"]),
      positiveIssue("scaleDenominator", input.scaleDenominator, 1_000_000_000),
      positiveIssue(sourceField, toMetres(sourceValue, sourceUnit), MAX_LINEAR_METRES),
    ]);
    if (issues.length) return invalid(issues);
    if (input.scaleDenominator < 1) {
      return invalid([
        {
          field: "scaleDenominator",
          code: "out-of-range",
          message: "縮尺1:NのNは1以上にしてください。",
        },
      ]);
    }
    const drawingLengthM =
      input.solveFor === "actual"
        ? toMetres(input.drawingLength, input.drawingUnit)
        : toMetres(input.actualLength, input.actualUnit) / input.scaleDenominator;
    const actualLengthM = drawingLengthM * input.scaleDenominator;
    const resultIssue = resultTooLargeIssue("actualLengthM", actualLengthM, MAX_LINEAR_METRES);
    if (resultIssue) return invalid([resultIssue]);
    const drawingLength = fromMetres(drawingLengthM, input.drawingUnit);
    const actualLength = fromMetres(actualLengthM, input.actualUnit);
    const outputs = {
      drawingLength: applyRounding(drawingLength, rounding),
      drawingUnit: input.drawingUnit,
      actualLength: applyRounding(actualLength, rounding),
      actualUnit: input.actualUnit,
    };
    return validResult({
      calculatorId: SCALE_COORDINATE_CALCULATOR_ID,
      formulaVersion: SCALE_COORDINATE_FORMULA_VERSION,
      rawOutputs: { drawingLength, drawingUnit: input.drawingUnit, actualLength, actualUnit: input.actualUnit },
      outputs,
      displayValues: [
        { key: "drawingLength", label: "図上寸法", value: outputs.drawingLength, unit: input.drawingUnit },
        { key: "actualLength", label: "実寸", value: outputs.actualLength, unit: input.actualUnit },
      ],
      usedInputs: { ...input, rounding: { ...rounding } },
      formula: ["縮尺1:Nの実寸 = 図上寸法 × N", "図上寸法 = 実寸 ÷ N", "乗除前に長さ単位を揃える"],
      rounding,
      assumptions: ["線形縮尺が全方向で同じ図面を対象とし、印刷・表示時の拡大縮小誤差は含めない。"],
    });
  }

  const issues = compactIssues([
    enumIssue("coordinateUnit", input.coordinateUnit, ["mm", "cm", "m"]),
    finiteIssue("x1", input.x1),
    finiteIssue("y1", input.y1),
    finiteIssue("x2", input.x2),
    finiteIssue("y2", input.y2),
  ]);
  if (issues.length) return invalid(issues);
  const x1M = toMetres(input.x1, input.coordinateUnit);
  const y1M = toMetres(input.y1, input.coordinateUnit);
  const x2M = toMetres(input.x2, input.coordinateUnit);
  const y2M = toMetres(input.y2, input.coordinateUnit);
  if ([x1M, y1M, x2M, y2M].some((value) => Math.abs(value) > MAX_LINEAR_METRES)) {
    return invalid([{ field: "x1", code: "too-large", message: "座標値が計算可能範囲を超えています。単位を確認してください。" }]);
  }
  const deltaXM = x2M - x1M;
  const deltaYM = y2M - y1M;
  const horizontalDistanceM = Math.hypot(deltaXM, deltaYM);
  if (horizontalDistanceM === 0) {
    return invalid([{ field: "x2", code: "inconsistent", message: "2点が同一座標のため方位角を求められません。" }]);
  }
  const azimuthDegrees = ((Math.atan2(deltaYM, deltaXM) * 180) / Math.PI + 360) % 360;
  const outputs = {
    deltaXM: applyRounding(deltaXM, rounding),
    deltaYM: applyRounding(deltaYM, rounding),
    horizontalDistanceM: applyRounding(horizontalDistanceM, rounding),
    azimuthDegrees: applyRounding(azimuthDegrees, rounding),
  };
  return validResult({
    calculatorId: SCALE_COORDINATE_CALCULATOR_ID,
    formulaVersion: SCALE_COORDINATE_FORMULA_VERSION,
    rawOutputs: { deltaXM, deltaYM, horizontalDistanceM, azimuthDegrees },
    outputs,
    displayValues: [
      { key: "deltaXM", label: "ΔX", value: outputs.deltaXM, unit: "m" },
      { key: "deltaYM", label: "ΔY", value: outputs.deltaYM, unit: "m" },
      { key: "horizontalDistanceM", label: "水平距離", value: outputs.horizontalDistanceM, unit: "m" },
      { key: "azimuthDegrees", label: "方位角", value: outputs.azimuthDegrees, unit: "°" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: ["ΔX = X₂ − X₁", "ΔY = Y₂ − Y₁", "水平距離 = √(ΔX² + ΔY²)", "方位角 = atan2(ΔY, ΔX)を0°以上360°未満へ正規化"],
    rounding,
    assumptions: [
      "平面上の局所座標を対象とし、X軸を北、Y軸を東、方位角を北から時計回りとする。",
      "緯度・経度、地球曲率、投影縮尺、標高補正を含む測地線計算ではない。測量成果の確定には用いない。",
    ],
  });
}
