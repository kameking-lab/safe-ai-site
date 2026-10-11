import { describe, expect, it } from "vitest";
import { calculateConcrete } from "@/lib/construction-calculators/concrete";
import { getConstructionCalculatorFormula } from "@/data/construction-calculators/formula-registry";
import { buildCalculationCopyText, buildCalculationCsv } from "./construction-calculator-exports";

const concreteInputDefinitions = getConstructionCalculatorFormula("concrete-quantity")?.inputDefinitions ?? [];

describe("建設計算のコピー・CSV共通正本", () => {
  it("純粋関数の同じresultを表示値・入力・式・丸め・概算表示へ使う", () => {
    const outcome = calculateConcrete({
      shape: "rectangular",
      length: 10,
      width: 5,
      height: 0.23,
      dimensionUnit: "m",
      quantity: 1,
      lossPercent: 8,
      truckCapacityM3: 4,
      rounding: { decimalPlaces: 2, mode: "ceil" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const copy = buildCalculationCopyText("コンクリート数量", outcome.result, concreteInputDefinitions);
    const csv = buildCalculationCsv("コンクリート数量", outcome.result, concreteInputDefinitions);
    for (const expected of ["12.42", "4台", "ロス", "四捨五入", "概算結果"]) {
      if (expected === "四捨五入") continue;
      expect(copy).toContain(expected);
    }
    expect(copy).toContain("切上げ（+∞方向）");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"12.42"');
    expect(csv).toContain("ロス");
    expect(csv).toContain('"roundingMode","ceil"');
    expect(csv).toContain('"roundingLabel","切上げ（+∞方向）"');
    expect(csv).toContain('"estimate","true"');
    expect(copy).toContain("使用した仮定");
    expect(csv).toContain('"section","warnings"');
  });
  it("直方体の未使用直径を表示・CSVへ持ち出さず、形状・寸法・単位を読み取れる", () => {
    const outcome = calculateConcrete({ shape: "rectangular", length: 10, width: 5, height: 0.2, diameter: Number.NaN, dimensionUnit: "m", quantity: 1, lossPercent: 5, truckCapacityM3: 4.5 });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const csv = buildCalculationCsv("コンクリート数量", outcome.result, concreteInputDefinitions);
    expect(csv).not.toMatch(/diameter|NaN/);
    expect(csv).toContain("直方体");
    expect(csv).toContain('"長さ","10","m"');
    expect(csv).toContain('"10.5"');
    expect(outcome.result.outputs.truckCount).toBe(3);
    expect(outcome.result.outputs.finalTruckVolumeM3).toBeCloseTo(1.5);
  });
});
