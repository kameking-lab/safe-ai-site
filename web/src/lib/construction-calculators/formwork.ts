import {
  MAX_AREA_M2,
  MAX_COUNT,
  MAX_LINEAR_METRES,
  applyRounding,
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
import type { AreaUnit, CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres, toSquareMetres } from "./units";

export const FORMWORK_CALCULATOR_ID = "formwork-area";
export const FORMWORK_FORMULA_VERSION = "1.0.0";

export interface FormworkInput {
  shape: "foundation" | "column" | "beam" | "wall" | "slab-edge" | "custom";
  length: number;
  width: number;
  height: number;
  dimensionUnit: LengthUnit;
  deductionArea: number;
  deductionAreaUnit: AreaUnit;
  faces: number;
  quantity: number;
  rounding?: RoundingConfig;
}

export function calculateFormwork(input: FormworkInput): CalculationOutcome {
  const widthRequired = input.shape === "foundation" || input.shape === "column" || input.shape === "beam" || input.shape === "custom";
  const heightRequired = input.shape !== "custom";
  const facesRequired = input.shape === "wall" || input.shape === "slab-edge" || input.shape === "custom";
  const issues = compactIssues([
    enumIssue("shape", input.shape, ["foundation", "column", "beam", "wall", "slab-edge", "custom"]),
    enumIssue("dimensionUnit", input.dimensionUnit, ["mm", "cm", "m"]),
    enumIssue("deductionAreaUnit", input.deductionAreaUnit, ["mm2", "cm2", "m2"]),
    positiveIssue("length", toMetres(input.length, input.dimensionUnit), MAX_LINEAR_METRES),
    widthRequired ? positiveIssue("width", toMetres(input.width, input.dimensionUnit), MAX_LINEAR_METRES) : null,
    heightRequired ? positiveIssue("height", toMetres(input.height, input.dimensionUnit), MAX_LINEAR_METRES) : null,
    nonNegativeIssue("deductionArea", toSquareMetres(input.deductionArea, input.deductionAreaUnit), MAX_AREA_M2),
    facesRequired ? integerIssue("faces", input.faces, 1, 20) : null,
    integerIssue("quantity", input.quantity, 1, MAX_COUNT),
  ]);
  if (issues.length) return invalid(issues);
  const lengthM = toMetres(input.length, input.dimensionUnit);
  const widthM = toMetres(input.width, input.dimensionUnit);
  const heightM = toMetres(input.height, input.dimensionUnit);
  let faceBreakdown: Record<string, number>;
  if (input.shape === "foundation" || input.shape === "column") {
    faceBreakdown = { longSidesM2: 2 * lengthM * heightM, shortSidesM2: 2 * widthM * heightM };
  } else if (input.shape === "beam") {
    faceBreakdown = { sideFacesM2: 2 * lengthM * heightM, soffitM2: lengthM * widthM };
  } else if (input.shape === "wall" || input.shape === "slab-edge") {
    faceBreakdown = { selectedFacesM2: lengthM * heightM * input.faces };
  } else {
    faceBreakdown = { selectedFacesM2: lengthM * widthM * input.faces };
  }
  const grossAreaM2 = Object.values(faceBreakdown).reduce((sum, value) => sum + value, 0);
  const deductionAreaM2 = toSquareMetres(input.deductionArea, input.deductionAreaUnit);
  if (deductionAreaM2 > grossAreaM2) {
    return invalid([{ field: "deductionArea", code: "inconsistent", message: "控除面積を面別面積の合計以下にしてください。" }]);
  }
  const netAreaPerItemM2 = grossAreaM2 - deductionAreaM2;
  const totalAreaM2 = netAreaPerItemM2 * input.quantity;
  const resultIssue = resultTooLargeIssue("totalAreaM2", totalAreaM2, MAX_AREA_M2);
  if (resultIssue) return invalid([resultIssue]);
  const rounding = normalizeRounding(input.rounding);
  const roundedBreakdown = Object.fromEntries(
    Object.entries(faceBreakdown).map(([key, value]) => [key, applyRounding(value, rounding)]),
  );
  const outputs = {
    faceBreakdownM2: roundedBreakdown,
    grossAreaM2: applyRounding(grossAreaM2, rounding),
    deductionAreaM2: applyRounding(deductionAreaM2, rounding),
    netAreaPerItemM2: applyRounding(netAreaPerItemM2, rounding),
    totalAreaM2: applyRounding(totalAreaM2, rounding),
  };
  return validResult({
    calculatorId: FORMWORK_CALCULATOR_ID,
    formulaVersion: FORMWORK_FORMULA_VERSION,
    rawOutputs: { faceBreakdownM2: faceBreakdown, grossAreaM2, deductionAreaM2, netAreaPerItemM2, totalAreaM2 },
    outputs,
    displayValues: [
      { key: "grossAreaM2", label: "面別面積合計", value: outputs.grossAreaM2, unit: "m²" },
      { key: "deductionAreaM2", label: "控除面積（1個当たり）", value: outputs.deductionAreaM2, unit: "m²" },
      { key: "netAreaPerItemM2", label: "控除後面積", value: outputs.netAreaPerItemM2, unit: "m²/個" },
      { key: "totalAreaM2", label: "合計面積", value: outputs.totalAreaM2, unit: "m²" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: [
      "基礎・柱 = 2×長さ×高さ + 2×幅×高さ",
      "梁 = 2×長さ×高さ + 長さ×幅（側面2面と底面）",
      "壁・床版端部 = 長さ×高さ×面数",
      "任意面 = 長さ×幅×面数",
      "合計面積 = (面別合計 − 控除面積) × 個数",
    ],
    rounding,
    assumptions: [
      "コンクリートに接する選択面だけを数量化し、上面、妻面、目地、面木、支保工は含めない。",
      "控除の要否と数量区分は適用する数量算出要領・設計図書を別途確認する。",
    ],
  });
}
