import {
  MAX_LINEAR_METRES,
  applyRounding,
  compactIssues,
  enumIssue,
  finiteIssue,
  integerIssue,
  invalid,
  normalizeRounding,
  positiveIssue,
  resultTooLargeIssue,
  validResult,
} from "./core";
import type { CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres } from "./units";

export const DRAINAGE_SLOPE_CALCULATOR_ID = "drainage-slope";
export const DRAINAGE_SLOPE_FORMULA_VERSION = "1.0.0";

export interface DrainageSlopeInput {
  length: number;
  lengthUnit: LengthUnit;
  gradeMode: "percent" | "permille" | "ratio";
  gradeValue: number;
  referencePoint: "start" | "end";
  referenceElevationM: number;
  flowDirection: "start-to-end" | "end-to-start";
  intervalCount: number;
  rounding?: RoundingConfig;
}

export function calculateDrainageSlope(input: DrainageSlopeInput): CalculationOutcome {
  const issues = compactIssues([
    enumIssue("lengthUnit", input.lengthUnit, ["mm", "cm", "m"]),
    enumIssue("gradeMode", input.gradeMode, ["percent", "permille", "ratio"]),
    enumIssue("referencePoint", input.referencePoint, ["start", "end"]),
    enumIssue("flowDirection", input.flowDirection, ["start-to-end", "end-to-start"]),
    positiveIssue("length", toMetres(input.length, input.lengthUnit), MAX_LINEAR_METRES),
    finiteIssue("gradeValue", input.gradeValue),
    finiteIssue("referenceElevationM", input.referenceElevationM),
    integerIssue("intervalCount", input.intervalCount, 1, 100),
  ]);
  if (issues.length) return invalid(issues);
  if (input.gradeMode === "ratio" && input.gradeValue <= 0) {
    return invalid([{ field: "gradeValue", code: input.gradeValue === 0 ? "zero" : "negative", message: "1:nのnは0より大きくしてください。" }]);
  }
  if (Math.abs(input.gradeValue) > 1_000_000) {
    return invalid([{ field: "gradeValue", code: "too-large", message: "勾配値が計算可能範囲を超えています。単位を確認してください。" }]);
  }
  const referenceIssue = resultTooLargeIssue(
    "referenceElevationM",
    input.referenceElevationM,
    MAX_LINEAR_METRES,
  );
  if (referenceIssue) return invalid([referenceIssue]);
  const lengthM = toMetres(input.length, input.lengthUnit);
  const gradeDecimal =
    input.gradeMode === "percent"
      ? input.gradeValue / 100
      : input.gradeMode === "permille"
        ? input.gradeValue / 1_000
        : 1 / input.gradeValue;
  const requiredDifferenceM = lengthM * gradeDecimal;
  const directionMultiplier = input.flowDirection === "start-to-end" ? -1 : 1;
  const endMinusStartM = requiredDifferenceM * directionMultiplier;
  const startElevationM =
    input.referencePoint === "start"
      ? input.referenceElevationM
      : input.referenceElevationM - endMinusStartM;
  const endElevationM = startElevationM + endMinusStartM;
  const resultIssues = compactIssues([
    resultTooLargeIssue("gradeValue", requiredDifferenceM, MAX_LINEAR_METRES),
    resultTooLargeIssue("referenceElevationM", startElevationM, MAX_LINEAR_METRES),
    resultTooLargeIssue("referenceElevationM", endElevationM, MAX_LINEAR_METRES),
  ]);
  if (resultIssues.length) return invalid(resultIssues);
  const stationElevations = Array.from({ length: input.intervalCount + 1 }, (_, index) => {
    const stationM = (lengthM * index) / input.intervalCount;
    const elevationM = startElevationM + (endMinusStartM * index) / input.intervalCount;
    return { stationM, elevationM };
  });
  const reverseSlopeWarning = gradeDecimal < 0;
  const rounding = normalizeRounding(input.rounding);
  const roundedStations = stationElevations.map((station) => ({
    stationM: applyRounding(station.stationM, rounding),
    elevationM: applyRounding(station.elevationM, rounding),
  }));
  const outputs = {
    requiredDifferenceM: applyRounding(requiredDifferenceM, rounding),
    startElevationM: applyRounding(startElevationM, rounding),
    endElevationM: applyRounding(endElevationM, rounding),
    stationElevations: roundedStations,
    reverseSlopeWarning,
  };
  return validResult({
    calculatorId: DRAINAGE_SLOPE_CALCULATOR_ID,
    formulaVersion: DRAINAGE_SLOPE_FORMULA_VERSION,
    rawOutputs: { requiredDifferenceM, startElevationM, endElevationM, stationElevations, reverseSlopeWarning },
    outputs,
    displayValues: [
      { key: "requiredDifferenceM", label: "必要高低差", value: outputs.requiredDifferenceM, unit: "m" },
      { key: "startElevationM", label: "始点標高", value: outputs.startElevationM, unit: "m" },
      { key: "endElevationM", label: "終点標高", value: outputs.endElevationM, unit: "m" },
      { key: "reverseSlopeWarning", label: "逆勾配警告", value: reverseSlopeWarning ? "あり" : "なし", unit: "" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: [
      "必要高低差 = 延長 × 勾配（%÷100、‰÷1000、1:nは1÷n）",
      "始点→終点に流す場合: 終点標高 = 始点標高 − 必要高低差",
      "終点→始点に流す場合: 始点標高 = 終点標高 − 必要高低差",
      "区間標高は始終点間を等距離で線形補間",
    ],
    rounding,
    assumptions: [
      "勾配は一定で、標高の単位はmとする。",
      "負の勾配値は指定した流下方向に対して上りとなるため逆勾配警告を表示する。",
      "設計上必要な勾配、流量、管径、施工誤差、適否は判定しない。",
    ],
    warnings: reverseSlopeWarning ? ["入力した勾配では指定流下方向に上り勾配です。符号と流下方向を確認してください。"] : [],
  });
}
