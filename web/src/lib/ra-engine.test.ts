import { describe, it, expect } from "vitest";
import { runRiskAssessment } from "./ra-engine";
import type { SdsProduct } from "./sds-fetcher";

function makeProduct(overrides?: Partial<SdsProduct>): SdsProduct {
  return {
    id: "test",
    productName: "テスト製品",
    manufacturer: "テストメーカー",
    category: "test",
    use: "test",
    sdsRevised: "2024-01-01",
    components: [
      { cas: "108-88-3", name: "トルエン", contentPct: 50 },
    ],
    ...overrides,
  };
}

describe("runRiskAssessment", () => {
  it("low-risk 条件（局所排気・少量・短時間）は I/II レベル", () => {
    const result = runRiskAssessment({
      product: makeProduct(),
      ventilation: "local",
      amount: "small",
      durationHours: 1,
    });
    expect(["I", "II"]).toContain(result.overallLevel);
  });

  it("high-risk 条件（換気なし・大量・長時間）は III/IV レベル", () => {
    const result = runRiskAssessment({
      product: makeProduct(),
      ventilation: "none",
      amount: "large",
      durationHours: 8,
    });
    expect(["III", "IV"]).toContain(result.overallLevel);
  });

  it("作業時間は 24h で上限クリップされる", () => {
    const a = runRiskAssessment({
      product: makeProduct(),
      ventilation: "general",
      amount: "medium",
      durationHours: 24,
    });
    const b = runRiskAssessment({
      product: makeProduct(),
      ventilation: "general",
      amount: "medium",
      durationHours: 100, // 24 と同じ扱いになるはず
    });
    expect(a.overallLevel).toBe(b.overallLevel);
  });

  it("レベル IV は『直ちに改善』の推奨を含む", () => {
    const result = runRiskAssessment({
      product: makeProduct(),
      ventilation: "none",
      amount: "large",
      durationHours: 8,
    });
    if (result.overallLevel === "IV") {
      const joined = result.recommendations.join("\n");
      expect(joined).toMatch(/直ちに改善|代替物質|呼吸用保護具/);
    }
  });

  it("複数成分を評価し、最も高いレベルを overallLevel に採用する", () => {
    const product = makeProduct({
      components: [
        { cas: "67-64-1", name: "アセトン", contentPct: 5 }, // 低含有率
        { cas: "108-88-3", name: "トルエン", contentPct: 95 }, // 高含有率
      ],
    });
    const result = runRiskAssessment({
      product,
      ventilation: "general",
      amount: "large",
      durationHours: 8,
    });
    expect(result.components).toHaveLength(2);
    // overallLevel は最悪の成分のレベル
    const max = result.components.reduce(
      (acc, c) => (["I", "II", "III", "IV"].indexOf(c.level) > ["I", "II", "III", "IV"].indexOf(acc) ? c.level : acc),
      "I" as "I" | "II" | "III" | "IV",
    );
    expect(result.overallLevel).toBe(max);
  });

  it("inputSummary が日本語ラベルで返る", () => {
    const result = runRiskAssessment({
      product: makeProduct(),
      ventilation: "local",
      amount: "medium",
      durationHours: 4,
    });
    expect(result.inputSummary.ventilation).toBe("局所排気");
    expect(result.inputSummary.amount).toBe("中量（1〜10L/日）");
    expect(result.inputSummary.durationHours).toBe(4);
  });

  it("0% 含有率の成分はばく露指数 0 で I レベル", () => {
    const product = makeProduct({
      components: [{ cas: "108-88-3", name: "トルエン", contentPct: 0 }],
    });
    const result = runRiskAssessment({
      product,
      ventilation: "none",
      amount: "large",
      durationHours: 24,
    });
    expect(result.components[0].level).toBe("I");
  });
});
