import { describe, it, expect } from "vitest";
import { fiberSlingLoadCalculator, HITCH_MODES, GRADE_LABELS } from "./fiber-sling-load";
import { normalizeValues } from "../schema";

/**
 * 繊維スリング使用荷重計算の数値固定テスト。
 * 期待値は 使用荷重 = WLL × 掛け方係数 × cos(θ/2)(バスケットのみ) を独立に手計算した値で固定する。
 */

const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(fiberSlingLoadCalculator, raw);
  expect(errors).toEqual([]);
  return fiberSlingLoadCalculator.compute(values);
};

describe("fiber-sling-load: 掛け方係数の定義", () => {
  it("ストレート=1・バスケット=2・チョーク=0.8", () => {
    expect(HITCH_MODES.find((m) => m.value === "straight")!.factor).toBe(1);
    expect(HITCH_MODES.find((m) => m.value === "basket")!.factor).toBe(2);
    expect(HITCH_MODES.find((m) => m.value === "choke")!.factor).toBe(0.8);
  });
  it("角度係数はバスケットのみ適用", () => {
    expect(HITCH_MODES.find((m) => m.value === "straight")!.angleApplies).toBe(false);
    expect(HITCH_MODES.find((m) => m.value === "basket")!.angleApplies).toBe(true);
    expect(HITCH_MODES.find((m) => m.value === "choke")!.angleApplies).toBe(false);
  });
});

describe("fiber-sling-load: ストレート吊り", () => {
  it("使用荷重はWLLそのまま。500kg/WLL1000kgは使用可", () => {
    const out = run({ hitch: "straight", wllKg: 1000, angle: "0", loadKg: 500 });
    expect(out.tone).toBe("safe");
    expect(out.value).toBe("1,000");
    expect(out.items.some((i) => i.label.includes("吊り角度"))).toBe(false);
  });
  it("WLL400kgで荷500kgは使用不可", () => {
    const out = run({ hitch: "straight", wllKg: 400, loadKg: 500 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("使用不可");
  });
});

describe("fiber-sling-load: バスケット吊り", () => {
  it("垂直（角度0°）は最大2倍。WLL1000kgで使用荷重2000kg", () => {
    const out = run({ hitch: "basket", wllKg: 1000, angle: "0", loadKg: 1900 });
    expect(out.value).toBe("2,000");
    expect(out.tone).toBe("safe");
  });
  it("60°では使用荷重が約1732kg（WLL1000kg×2×cos30°）", () => {
    const out = run({ hitch: "basket", wllKg: 1000, angle: "60", loadKg: 1500 });
    expect(out.tone).toBe("safe");
    const cap = Number(out.value!.replace(/,/g, ""));
    expect(cap).toBeGreaterThan(1700);
    expect(cap).toBeLessThan(1740);
  });
  it("90°では使用荷重が約1414kgに低下し、1500kgは使用不可", () => {
    const out = run({ hitch: "basket", wllKg: 1000, angle: "90", loadKg: 1500 });
    expect(out.tone).toBe("danger");
    const cap = Number(out.value!.replace(/,/g, ""));
    expect(cap).toBeGreaterThan(1400);
    expect(cap).toBeLessThan(1420);
  });
  it("角度が60°を超えると強警告", () => {
    const out = run({ hitch: "basket", wllKg: 1000, angle: "90", loadKg: 1000 });
    expect(out.warnings.join("\n")).toContain("60°を超える");
  });
});

describe("fiber-sling-load: チョーク吊り", () => {
  it("使用荷重はWLLの0.8倍。WLL1000kgなら800kg", () => {
    const out = run({ hitch: "choke", wllKg: 1000, loadKg: 600 });
    expect(out.value).toBe("800");
    expect(out.tone).toBe("safe");
  });
  it("荷900kgは使用不可（800kg未満）", () => {
    const out = run({ hitch: "choke", wllKg: 1000, loadKg: 900 });
    expect(out.tone).toBe("danger");
  });
  it("低減係数がメーカー公表の代表値である旨の警告", () => {
    const out = run({ hitch: "choke", wllKg: 1000, loadKg: 600 });
    expect(out.warnings.join("\n")).toContain("メーカー公表");
  });
});

describe("fiber-sling-load: 共通の注意", () => {
  it("当て物・劣化・不適格品の使用禁止に触れる", () => {
    const out = run({ hitch: "straight", wllKg: 1000, loadKg: 500 });
    expect(out.warnings.join("\n")).toContain("当て物");
    expect(out.warnings.join("\n")).toContain("クレーン則第218条");
  });
  it("等級色は参考表示のみで判定に使わない", () => {
    const withGrade = run({ hitch: "straight", wllKg: 1000, loadKg: 500, grade: "green" });
    const withoutGrade = run({ hitch: "straight", wllKg: 1000, loadKg: 500 });
    expect(withGrade.tone).toBe(withoutGrade.tone);
    expect(withGrade.value).toBe(withoutGrade.value);
    expect(withGrade.items.find((i) => i.label.includes("等級色"))?.value).toBe(GRADE_LABELS.green);
  });
});

describe("fiber-sling-load: 入力正規化", () => {
  it("範囲外の荷重は既定値へ戻しエラーを返す", () => {
    const { values, errors } = normalizeValues(fiberSlingLoadCalculator, { loadKg: -1 });
    expect(values.loadKg).toBe(500);
    expect(errors.length).toBe(1);
  });
  it("選択肢外の掛け方は既定値(straight)へ戻す", () => {
    const { values, errors } = normalizeValues(fiberSlingLoadCalculator, { hitch: "double" });
    expect(values.hitch).toBe("straight");
    expect(errors.length).toBe(1);
  });
});
