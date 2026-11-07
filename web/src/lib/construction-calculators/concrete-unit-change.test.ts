import { describe, expect, it } from "vitest";
import { calculateConcrete } from "./concrete";
import { changeConcreteDimensionUnit } from "./concrete-unit-change";

describe("コンクリート数量の寸法単位変更", () => {
  it("直方体の寸法をまとめて換算し、物理量と計算結果を保つ", () => {
    const before = { shape: "rectangular" as const, length: "5", width: "4", height: "0.5", diameter: "2", dimensionUnit: "m" as const, quantity: 1, lossPercent: 3, truckCapacityM3: 4.5 };
    const changed = changeConcreteDimensionUnit(before, "cm");
    expect(changed).toMatchObject({ length: "500", width: "400", height: "50", diameter: "200", dimensionUnit: "cm" });
    const first = calculateConcrete({ ...before, length: 5, width: 4, height: 0.5, diameter: 2 });
    const second = calculateConcrete({ ...changed, length: Number(changed.length), width: Number(changed.width), height: Number(changed.height), diameter: Number(changed.diameter) } as Parameters<typeof calculateConcrete>[0]);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.result.rawOutputs).toEqual(first.result.rawOutputs);
    expect(before.dimensionUnit).toBe("m");
  });

  it("空欄は空欄のまま保ち、円柱の直径も換算する", () => {
    expect(changeConcreteDimensionUnit({ dimensionUnit: "mm", length: "", width: "", height: "250", diameter: "1000" }, "m"))
      .toMatchObject({ length: "", width: "", height: "0.25", diameter: "1", dimensionUnit: "m" });
  });
});
