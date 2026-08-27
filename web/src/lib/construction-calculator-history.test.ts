import { beforeEach, describe, expect, it } from "vitest";
import type { CalculationResult } from "@/lib/construction-calculators/types";
import {
  addConstructionCalculatorHistory,
  clearConstructionCalculatorHistory,
  CONSTRUCTION_CALCULATOR_HISTORY_DAYS,
  CONSTRUCTION_CALCULATOR_HISTORY_KEY,
  CONSTRUCTION_CALCULATOR_HISTORY_LIMIT,
  loadConstructionCalculatorHistory,
  removeConstructionCalculatorHistory,
  type ConstructionCalculatorHistoryEntry,
} from "./construction-calculator-history";

const result: CalculationResult = {
  calculatorId: "concrete-quantity",
  formulaVersion: "1.0.0",
  outputs: { volume: 1 },
  rawOutputs: { volume: 1 },
  displayValues: [{ key: "volume", label: "必要量", value: 1, unit: "m³" }],
  usedInputs: { length: 1 },
  formula: ["1×1×1"],
  rounding: { decimalPlaces: 2, mode: "round" },
  assumptions: ["単純形状"],
  warnings: [],
  isEstimate: true,
};

function entry(id: string, createdAt: string): ConstructionCalculatorHistoryEntry {
  return { id, slug: "concrete-quantity", title: "コンクリート数量", createdAt, input: { length: 1 }, result };
}

describe("建設計算の端末内履歴", () => {
  beforeEach(() => localStorage.clear());

  it("31日を超えた履歴を捨て、最大20件を新しい順で端末内だけへ保存する", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const entries = Array.from({ length: 24 }, (_, index) =>
      entry(String(index), new Date(now.getTime() - index * 60_000).toISOString()),
    );
    entries.push(
      entry("expired", new Date(now.getTime() - (CONSTRUCTION_CALCULATOR_HISTORY_DAYS + 1) * 86_400_000).toISOString()),
    );
    localStorage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, JSON.stringify(entries));
    const loaded = loadConstructionCalculatorHistory(localStorage, now);
    expect(loaded).toHaveLength(CONSTRUCTION_CALCULATOR_HISTORY_LIMIT);
    expect(loaded[0].id).toBe("0");
    expect(loaded.some((item) => item.id === "expired")).toBe(false);
    expect(Object.keys(localStorage)).toEqual([CONSTRUCTION_CALCULATOR_HISTORY_KEY]);
  });

  it("追加・個別削除・全削除を同じlocalStorage正本へ反映する", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    expect(addConstructionCalculatorHistory(localStorage, entry("a", now.toISOString()), now)).toHaveLength(1);
    expect(removeConstructionCalculatorHistory(localStorage, "a", now)).toEqual([]);
    addConstructionCalculatorHistory(localStorage, entry("b", now.toISOString()), now);
    expect(clearConstructionCalculatorHistory(localStorage)).toEqual([]);
    expect(localStorage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY)).toBe("[]");
  });

  it("破損JSONを安全に空配列へ戻す", () => {
    localStorage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, "{broken");
    expect(loadConstructionCalculatorHistory(localStorage)).toEqual([]);
    expect(localStorage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY)).toBe("[]");
  });
});
