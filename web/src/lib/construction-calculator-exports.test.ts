import { describe, expect, it } from "vitest";
import { calculateConcrete } from "@/lib/construction-calculators/concrete";
import { buildCalculationCopyText, buildCalculationCsv } from "./construction-calculator-exports";

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
    const copy = buildCalculationCopyText("コンクリート数量", outcome.result);
    const csv = buildCalculationCsv("コンクリート数量", outcome.result);
    for (const expected of ["12.42", "4台", "lossPercent", "四捨五入", "概算結果"]) {
      if (expected === "四捨五入") continue;
      expect(copy).toContain(expected);
    }
    expect(copy).toContain("切上げ（+∞方向）");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"12.42"');
    expect(csv).toContain('"lossPercent"');
    expect(csv).toContain('"roundingMode","ceil"');
    expect(csv).toContain('"roundingLabel","切上げ（+∞方向）"');
    expect(csv).toContain('"estimate","true"');
    expect(copy).toContain("使用した仮定");
    expect(csv).toContain('"section","warnings"');
  });
});
