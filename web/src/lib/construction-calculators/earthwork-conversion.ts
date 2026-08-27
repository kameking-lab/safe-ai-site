import {
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
import type { CalculationOutcome, DensityUnit, MassUnit, RoundingConfig, VolumeUnit } from "./types";
import { toCubicMetres, toKilograms, toKilogramsPerCubicMetre } from "./units";

export const EARTHWORK_CONVERSION_CALCULATOR_ID = "earthwork-conversion-dump-trucks";
export const EARTHWORK_CONVERSION_FORMULA_VERSION = "1.0.0";

export interface EarthworkConversionInput {
  bankVolume: number;
  bankVolumeUnit: VolumeUnit;
  bulkingFactor: number;
  compactionFactor: number;
  density: number;
  densityUnit: DensityUnit;
  densityState: "bank" | "loose" | "compacted";
  truckPayload: number;
  truckPayloadUnit: MassUnit;
  loadingRatePercent: number;
  rounding?: RoundingConfig;
}

export function calculateEarthworkConversion(input: EarthworkConversionInput): CalculationOutcome {
  const issues = compactIssues([
    enumIssue("bankVolumeUnit", input.bankVolumeUnit, ["L", "m3"]),
    enumIssue("densityUnit", input.densityUnit, ["kg/m3", "t/m3"]),
    enumIssue("densityState", input.densityState, ["bank", "loose", "compacted"]),
    enumIssue("truckPayloadUnit", input.truckPayloadUnit, ["kg", "t"]),
    positiveIssue("bankVolume", toCubicMetres(input.bankVolume, input.bankVolumeUnit), MAX_VOLUME_M3),
    positiveIssue("bulkingFactor", input.bulkingFactor, 10),
    positiveIssue("compactionFactor", input.compactionFactor, 10),
    positiveIssue("density", toKilogramsPerCubicMetre(input.density, input.densityUnit), 50_000),
    positiveIssue("truckPayload", toKilograms(input.truckPayload, input.truckPayloadUnit), MAX_MASS_KG),
    percentageIssue("loadingRatePercent", input.loadingRatePercent, false),
  ]);
  if (issues.length) return invalid(issues);

  const bankVolumeM3 = toCubicMetres(input.bankVolume, input.bankVolumeUnit);
  const looseVolumeM3 = bankVolumeM3 * input.bulkingFactor;
  const compactedVolumeM3 = bankVolumeM3 * input.compactionFactor;
  const densityKgM3 = toKilogramsPerCubicMetre(input.density, input.densityUnit);
  const densityBasisVolumeM3 =
    input.densityState === "bank"
      ? bankVolumeM3
      : input.densityState === "loose"
        ? looseVolumeM3
        : compactedVolumeM3;
  const massKg = densityBasisVolumeM3 * densityKgM3;
  const effectivePayloadKg =
    toKilograms(input.truckPayload, input.truckPayloadUnit) * (input.loadingRatePercent / 100);
  const truckCount = ceilCount(massKg / effectivePayloadKg);
  const resultIssues = compactIssues([
    resultTooLargeIssue("looseVolumeM3", looseVolumeM3, MAX_VOLUME_M3),
    resultTooLargeIssue("compactedVolumeM3", compactedVolumeM3, MAX_VOLUME_M3),
    resultTooLargeIssue("massKg", massKg, MAX_MASS_KG),
    resultCountIssue("truckCount", truckCount),
  ]);
  if (resultIssues.length) return invalid(resultIssues);

  const rounding = normalizeRounding(input.rounding);
  const outputs = {
    looseVolumeM3: applyRounding(looseVolumeM3, rounding),
    compactedVolumeM3: applyRounding(compactedVolumeM3, rounding),
    massKg: applyRounding(massKg, rounding),
    massT: applyRounding(massKg / 1_000, rounding),
    effectivePayloadKg: applyRounding(effectivePayloadKg, rounding),
    truckCount,
  };
  return validResult({
    calculatorId: EARTHWORK_CONVERSION_CALCULATOR_ID,
    formulaVersion: EARTHWORK_CONVERSION_FORMULA_VERSION,
    rawOutputs: { looseVolumeM3, compactedVolumeM3, massKg, massT: massKg / 1_000, effectivePayloadKg, truckCount },
    outputs,
    displayValues: [
      { key: "looseVolumeM3", label: "ほぐし土量", value: outputs.looseVolumeM3, unit: "m³" },
      { key: "compactedVolumeM3", label: "締固め後土量", value: outputs.compactedVolumeM3, unit: "m³" },
      { key: "massT", label: "重量", value: outputs.massT, unit: "t" },
      { key: "truckCount", label: "必要台数", value: truckCount, unit: "台" },
    ],
    usedInputs: { ...input, rounding: { ...rounding } },
    formula: [
      "ほぐし土量 = 地山土量 × ほぐし率L",
      "締固め後土量 = 地山土量 × 締固め率C",
      "重量 = 密度の基準状態に対応する体積 × 密度",
      "有効積載量 = 定格積載量 × 積載率",
      "必要台数 = ceil(重量 ÷ 有効積載量)",
    ],
    rounding,
    assumptions: [
      "L、C、密度、積載量、積載率は土質・含水状態・車両・現場条件を確認した利用者入力値を使う。",
      `入力密度は${input.densityState === "bank" ? "地山" : input.densityState === "loose" ? "ほぐし" : "締固め後"}状態のかさ密度として重量へ適用する。`,
      "台数は端数を1台へ切り上げる。過積載可否は判定しない。",
    ],
  });
}
