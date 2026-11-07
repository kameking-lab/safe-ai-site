import {
  MAX_COUNT,
  MAX_LINEAR_METRES,
  MAX_MASS_KG,
  applyRounding,
  ceilCount,
  compactIssues,
  enumIssue,
  integerIssue,
  invalid,
  nonNegativeIssue,
  normalizeRounding,
  positiveIssue,
  resultTooLargeIssue,
  validResult,
} from "./core";
import { DEFORMED_REBAR_TABLE, rebarProperties, STEEL_DENSITY_KG_M3 } from "./rebar-weight";
import type { CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres } from "./units";

export const REBAR_SPACING_CALCULATOR_ID = "rebar-spacing";
export const REBAR_SPACING_FORMULA_VERSION = "1.2.0";

export interface RebarSpacingInput {
  barType?: "deformed" | "round";
  barDesignation?: string;
  constructionWidth: number;
  leftCover: number;
  rightCover: number;
  requestedPitch: number;
  barLength: number;
  diameterMm: number;
  dimensionUnit: LengthUnit;
  layers: number;
  rounding?: RoundingConfig;
}

export function calculateRebarSpacing(input: RebarSpacingInput): CalculationOutcome {
  const properties = rebarProperties(input);
  const issues = compactIssues([
    input.barType === undefined ? null : enumIssue("barType",input.barType,["deformed","round"]),
    properties.tableBased ? enumIssue("barDesignation",input.barDesignation,Object.keys(DEFORMED_REBAR_TABLE)) : null,
    enumIssue("dimensionUnit", input.dimensionUnit, ["mm", "cm", "m"]),
    positiveIssue("constructionWidth", toMetres(input.constructionWidth, input.dimensionUnit), MAX_LINEAR_METRES),
    nonNegativeIssue("leftCover", toMetres(input.leftCover, input.dimensionUnit), MAX_LINEAR_METRES),
    nonNegativeIssue("rightCover", toMetres(input.rightCover, input.dimensionUnit), MAX_LINEAR_METRES),
    positiveIssue("requestedPitch", toMetres(input.requestedPitch, input.dimensionUnit), MAX_LINEAR_METRES),
    positiveIssue("barLength", toMetres(input.barLength, input.dimensionUnit), MAX_LINEAR_METRES),
    positiveIssue("diameterMm", properties.diameterMm, 1_000),
    integerIssue("layers", input.layers, 1, 100),
  ]);
  if (issues.length) return invalid(issues);

  const widthM = toMetres(input.constructionWidth, input.dimensionUnit);
  const leftCoverM = toMetres(input.leftCover, input.dimensionUnit);
  const rightCoverM = toMetres(input.rightCover, input.dimensionUnit);
  const diameterM = properties.diameterMm / 1_000;
  // かぶりはコンクリート表面から鉄筋表面まで。両端鉄筋の中心間は
  // 左右のかぶりに加え、半径2つ（径1本分）を施工幅から控除する。
  const effectiveWidthM = widthM - leftCoverM - rightCoverM - diameterM;
  if (effectiveWidthM <= 0) {
    return invalid([{ field: "leftCover", code: "inconsistent", message: "左右かぶりと鉄筋径の合計を施工幅より小さくしてください。" }]);
  }
  const pitchM = toMetres(input.requestedPitch, input.dimensionUnit);
  const intervals = ceilCount(effectiveWidthM / pitchM);
  const barsPerLayer = intervals + 1;
  const totalBars = barsPerLayer * input.layers;
  if (totalBars > MAX_COUNT) {
    return invalid([{ field: "requestedPitch", code: "too-large", message: "必要本数が計算可能範囲を超えています。ピッチと単位を確認してください。" }]);
  }
  const actualSpacingM = effectiveWidthM / intervals;
  const barLengthM = toMetres(input.barLength, input.dimensionUnit);
  const totalLengthM = totalBars * barLengthM;
  const totalMassKg = totalLengthM * properties.massPerMetreKg;
  const resultIssue = resultTooLargeIssue("totalMassKg", totalMassKg, MAX_MASS_KG);
  if (resultIssue) return invalid([resultIssue]);
  const rounding = normalizeRounding(input.rounding);
  const outputs = {
    effectiveWidthM: applyRounding(effectiveWidthM, rounding),
    intervals,
    barsPerLayer,
    totalBars,
    actualSpacingM: applyRounding(actualSpacingM, rounding),
    totalLengthM: applyRounding(totalLengthM, rounding),
    totalMassKg: applyRounding(totalMassKg, rounding),
  };
  return validResult({
    calculatorId: REBAR_SPACING_CALCULATOR_ID,
    formulaVersion: REBAR_SPACING_FORMULA_VERSION,
    rawOutputs: { effectiveWidthM, intervals, barsPerLayer, totalBars, actualSpacingM, totalLengthM, totalMassKg },
    outputs,
    displayValues: [
      { key: "effectiveWidthM", label: "有効幅", value: outputs.effectiveWidthM, unit: "m" },
      { key: "totalBars", label: "必要本数", value: totalBars, unit: "本" },
      { key: "actualSpacingM", label: "実際の配置間隔", value: outputs.actualSpacingM, unit: "m" },
      { key: "totalLengthM", label: "総延長", value: outputs.totalLengthM, unit: "m" },
      { key: "totalMassKg", label: properties.tableBased ? "重量（規格表）" : "重量（丸鋼概算）", value: outputs.totalMassKg, unit: "kg" },
    ],
    usedInputs: { ...input, diameterMm: properties.diameterMm, effectiveDiameterMm: properties.diameterMm, massMethod: properties.tableBased ? "JFE規格単位質量表" : "丸鋼の真円計算", steelDensityKgM3: STEEL_DENSITY_KG_M3, rounding: { ...rounding } },
    formula: [
      "中心間有効幅 = 施工幅 − 左かぶり − 右かぶり − 鉄筋径",
      "区間数 = ceil(有効幅 ÷ 指定ピッチ)",
      "1段の本数 = 区間数 + 1（両端を含む）",
      "実配置間隔 = 有効幅 ÷ 区間数",
      "総延長 = 1段の本数 × 段数 × 1本長さ",
      properties.tableBased ? "重量 = 総延長 × 指定D呼び名の規格単位質量" : "重量 = 総延長 × π × (丸鋼直径÷1000)² ÷ 4 × 7,850",
    ],
    rounding,
    assumptions: [
      "かぶりはコンクリート表面から端部鉄筋表面までとし、両端鉄筋の中心間を等分する。",
      "継手、定着、曲げ、加工ロス、配筋可能性、必要かぶりは判定しない。",
      properties.tableBased ? "中心間距離は規格表の公称直径、重量は規格単位質量から算出。" : "丸鋼の重量は真円断面と鋼密度7,850 kg/m³による概算。",
    ],
    warnings: properties.tableBased ? ["規格表による概算です。加工ロスと実重量は別途確認してください。"] : ["異形鉄筋の公称単位質量ではありません。製品規格・ミルシートを確認してください。"],
  });
}
