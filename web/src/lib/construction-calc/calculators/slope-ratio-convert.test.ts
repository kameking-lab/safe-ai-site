import { describe, it, expect } from "vitest";
import { slopeRatioConvertCalculator, convertSlope } from "./slope-ratio-convert";
import { normalizeValues } from "../schema";

/**
 * 勾配割合換算の数値固定テスト。
 * 期待値は三角関数の手計算（出典から独立）＋プロンプトの外部突合値
 * （1:1.5→33.69°/66.7%、45°→1:1、1:0.5→63.43°）と一致させる。
 */
describe("slope-ratio-convert: convertSlope（外部突合）", () => {
  it("割1:1.5 → 角度33.69°・百分率66.7%", () => {
    const r = convertSlope("ratio", 1.5);
    expect(r.angleDeg).toBeCloseTo(33.69, 1);
    expect(r.percent).toBeCloseTo(66.67, 1);
  });

  it("角度45° → 割1:1・百分率100%", () => {
    const r = convertSlope("angle", 45);
    expect(r.n).toBeCloseTo(1, 6);
    expect(r.percent).toBeCloseTo(100, 6);
  });

  it("割1:0.5 → 角度63.43°", () => {
    const r = convertSlope("ratio", 0.5);
    expect(r.angleDeg).toBeCloseTo(63.43, 1);
  });

  it("百分率100% → 割1:1・角度45°", () => {
    const r = convertSlope("percent", 100);
    expect(r.n).toBeCloseTo(1, 6);
    expect(r.angleDeg).toBeCloseTo(45, 6);
  });

  it("角度から割・百分率への往復が一致する（往復精度）", () => {
    const forward = convertSlope("ratio", 1.5);
    const back = convertSlope("angle", forward.angleDeg);
    expect(back.n).toBeCloseTo(1.5, 4);
    expect(back.percent).toBeCloseTo(forward.percent, 4);
  });
});

describe("slope-ratio-convert: compute", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(slopeRatioConvertCalculator, raw);
    expect(errors).toEqual([]);
    return slopeRatioConvertCalculator.compute(values);
  };

  it("割1:1.5からの換算結果を表示する", () => {
    const out = run({ from: "ratio", ratioN: 1.5, heightDiffM: 0 });
    expect(out.value).toBe("33.7");
    expect(out.summary).toContain("1:1.5");
  });

  it("高低差>0のときすりつけ長を計算する（1:1.5・高低差3m→4.5m）", () => {
    const out = run({ from: "ratio", ratioN: 1.5, heightDiffM: 3 });
    expect(out.items.some((i) => i.label.includes("すりつけ長") && i.value === "4.5m")).toBe(true);
  });

  it("高低差0のときはすりつけ長を出さない", () => {
    const out = run({ from: "ratio", ratioN: 1.5, heightDiffM: 0 });
    expect(out.items.some((i) => i.label.includes("すりつけ長"))).toBe(false);
  });

  it("角度45°超では急勾配の注意を出す", () => {
    const out = run({ from: "angle", angleDeg: 60 });
    expect(out.warnings.join("\n")).toContain("急勾配");
  });

  it("常に掘削勾配チェック計算機への相互リンク注意を含む", () => {
    const out = run({ from: "ratio", ratioN: 1.5 });
    expect(out.warnings.join("\n")).toContain("掘削面の勾配チェック");
  });
});
