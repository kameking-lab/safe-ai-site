import { calculateSlope } from "./slope";
import { describe, expect, it } from "vitest";
import { calculateConcrete } from "./concrete";
import { applyRounding, calculationDisplayValues } from "./core";
import { buildCalculationCopyText, buildCalculationCsv } from "@/lib/construction-calculator-exports";

describe("060 非ゼロの小さい計算値", () => {
  it.each([
    [0.0001, "round", "表示精度未満"],
    [-0.0001, "round", "表示精度未満（負の値）"],
    [0.009, "floor", "表示精度未満"],
    [-0.009, "ceil", "表示精度未満（負の値）"],
    [0, "round", 0],
    [0.006, "round", 0.01],
    [0.0001, "ceil", 0.01],
  ] as const)("符号と丸めを維持する: %s / %s", (raw, mode, expected) => {
    const rounded = applyRounding(raw, { decimalPlaces: 2, mode });
    const result = { rawOutputs: { quantity: raw }, displayValues: [{ key: "quantity", label: "数量", value: rounded, unit: "m³" }] };
    expect(calculationDisplayValues(result)[0]?.value).toBe(expected);
    expect(result.rawOutputs.quantity).toBe(raw);
    expect(result.displayValues[0]?.value).toBe(rounded);
  });

  it("1mm角の正味量・最終車を0にせず、表示・コピー・CSVの正本を一致させる", () => {
    const outcome = calculateConcrete({ shape: "rectangular", length: 1, width: 1, height: 1, dimensionUnit: "mm", quantity: 1, lossPercent: 0, truckCapacityM3: 4 });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const result = outcome.result;
    expect(result.rawOutputs.netVolumeM3).toBeCloseTo(1e-9, 16);
    expect(result.outputs.netVolumeM3).toBe(0);
    expect(result.outputs.truckCount).toBe(1);
    expect(result.displayValues.find(item => item.key === "netVolumeM3")?.value).toBe("表示精度未満");
    expect(result.displayValues.find(item => item.key === "finalTruckVolumeM3")?.value).toBe("表示精度未満");
    const legacy = { ...result, displayValues: result.displayValues.map(item => item.key === "truckCount" ? item : { ...item, value: 0 }) };
    expect(calculationDisplayValues(legacy)).toEqual(result.displayValues);
    expect(buildCalculationCopyText("数量", legacy, [])).toContain("正味体積: 表示精度未満m³");
    expect(buildCalculationCsv("数量", legacy, [])).toContain('"正味体積","表示精度未満","m³"');
    expect(legacy.displayValues[0]?.value).toBe(0);
    expect(legacy.rawOutputs).toEqual(result.rawOutputs);
  });
});


it("1:0へ丸められた比率も、旧記録を含め全出力で微小値と示す", () => {
  const outcome = calculateSlope({ mode: "rise-run", horizontalDistance: 0.001, rise: 1, lengthUnit: "m" });
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  const result = outcome.result;
  expect(result.rawOutputs.ratioN).toBe(0.001);
  expect(result.outputs.ratioN).toBe(0);
  expect(result.displayValues.find(item => item.key === "ratioN")?.value).toBe("1:表示精度未満");
  const legacy = { ...result, displayValues: result.displayValues.map(item => item.key === "ratioN" ? { ...item, value: "1:0" } : item) };
  expect(calculationDisplayValues(legacy)).toEqual(result.displayValues);
  expect(buildCalculationCopyText("勾配", legacy, [])).toContain("比率: 1:表示精度未満");
  expect(buildCalculationCsv("勾配", legacy, [])).toContain('"比率","1:表示精度未満",""');
  expect(legacy.outputs.ratioN).toBe(0);
});
