import {
  MAX_COUNT,
  MAX_LINEAR_METRES,
  MAX_VOLUME_M3,
  applyRounding,
  ceilCount,
  compactIssues,
  enumIssue,
  integerIssue,
  invalid,
  normalizeRounding,
  percentageIssue,
  positiveIssue,
  resultTooLargeIssue,
  resultCountIssue,
  validResult,
} from "./core";
import type { CalculationOutcome, LengthUnit, RoundingConfig } from "./types";
import { toMetres } from "./units";

export const CONCRETE_CALCULATOR_ID = "concrete-quantity";
export const CONCRETE_FORMULA_VERSION = "1.0.0";

export interface ConcreteInput {
  shape: "rectangular" | "slab" | "cylinder" | "circular-foundation";
  length?: number;
  width?: number;
  height?: number;
  diameter?: number;
  dimensionUnit: LengthUnit;
  quantity: number;
  lossPercent: number;
  truckCapacityM3: number;
  rounding?: RoundingConfig;
}

export function calculateConcrete(input: ConcreteInput): CalculationOutcome {
  const circular = input.shape === "cylinder" || input.shape === "circular-foundation";
  const issues = compactIssues([
    enumIssue("shape", input.shape, ["rectangular", "slab", "cylinder", "circular-foundation"]),
    enumIssue("dimensionUnit", input.dimensionUnit, ["mm", "cm", "m"]),
    circular ? null : positiveIssue("length", toMetres(input.length as number, input.dimensionUnit), MAX_LINEAR_METRES),
    circular ? null : positiveIssue("width", toMetres(input.width as number, input.dimensionUnit), MAX_LINEAR_METRES),
    positiveIssue("height", toMetres(input.height as number, input.dimensionUnit), MAX_LINEAR_METRES),
    circular ? positiveIssue("diameter", toMetres(input.diameter as number, input.dimensionUnit), MAX_LINEAR_METRES) : null,
    integerIssue("quantity", input.quantity, 1, MAX_COUNT),
    percentageIssue("lossPercent", input.lossPercent),
    positiveIssue("truckCapacityM3", input.truckCapacityM3, MAX_VOLUME_M3),
  ]);
  if (issues.length) return invalid(issues);

  const heightM = toMetres(input.height as number, input.dimensionUnit);
  const unitVolumeM3 = circular
    ? Math.PI * (toMetres(input.diameter as number, input.dimensionUnit) / 2) ** 2 * heightM
    : toMetres(input.length as number, input.dimensionUnit) *
      toMetres(input.width as number, input.dimensionUnit) *
      heightM;
  const netVolumeM3 = unitVolumeM3 * input.quantity;
  const volumeWithLossM3 = netVolumeM3 * (1 + input.lossPercent / 100);
  const resultIssue = resultTooLargeIssue("volumeWithLossM3", volumeWithLossM3, MAX_VOLUME_M3);
  if (resultIssue) return invalid([resultIssue]);

  const truckCount = ceilCount(volumeWithLossM3 / input.truckCapacityM3);
  const countIssue = resultCountIssue("truckCount", truckCount);
  if (countIssue) return invalid([countIssue]);
  const finalTruckVolumeM3 =
    volumeWithLossM3 - input.truckCapacityM3 * Math.max(0, truckCount - 1);
  const rounding = normalizeRounding(input.rounding);
  const rounded = {
    unitVolumeM3: applyRounding(unitVolumeM3, rounding),
    netVolumeM3: applyRounding(netVolumeM3, rounding),
    volumeWithLossM3: applyRounding(volumeWithLossM3, rounding),
    truckCount,
    finalTruckVolumeM3: applyRounding(finalTruckVolumeM3, rounding),
  };

  return validResult({
    calculatorId: CONCRETE_CALCULATOR_ID,
    formulaVersion: CONCRETE_FORMULA_VERSION,
    rawOutputs: { unitVolumeM3, netVolumeM3, volumeWithLossM3, truckCount, finalTruckVolumeM3 },
    outputs: rounded,
    displayValues: [
      { key: "netVolumeM3", label: "正味体積", value: rounded.netVolumeM3, unit: "m³" },
      { key: "volumeWithLossM3", label: "ロス込み体積", value: rounded.volumeWithLossM3, unit: "m³" },
      { key: "truckCount", label: "生コン車台数", value: truckCount, unit: "台" },
      { key: "finalTruckVolumeM3", label: "最終車の数量", value: rounded.finalTruckVolumeM3, unit: "m³" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: circular
      ? ["単体体積 = π × (直径 ÷ 2)² × 高さ", "正味体積 = 単体体積 × 個数", "ロス込み体積 = 正味体積 × (1 + ロス率 ÷ 100)", "台数 = ceil(ロス込み体積 ÷ 1台積載量)"]
      : ["単体体積 = 長さ × 幅 × 高さ", "正味体積 = 単体体積 × 個数", "ロス込み体積 = 正味体積 × (1 + ロス率 ÷ 100)", "台数 = ceil(ロス込み体積 ÷ 1台積載量)"],
    rounding,
    assumptions: ["寸法は外形の直方体または真円柱として扱う。", "台数は端数を1台へ切り上げる。", "積載可能量と発注単位は利用者が確認した値を使う。"],
  });
}
