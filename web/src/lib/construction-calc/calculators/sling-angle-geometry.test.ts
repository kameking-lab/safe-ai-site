import { describe, it, expect } from "vitest";
import { slingAngleGeometryCalculator, solveSlingAngle } from "./sling-angle-geometry";
import { normalizeValues } from "../schema";

/**
 * 吊り角度逆算の数値固定テスト。
 * 期待値は直角三角形の手計算（出典から独立）＋プロンプトの外部突合値
 * （b=2m, h=1.73m → θ=60°、ワイヤ長=2.0m）と一致させる。
 */
describe("sling-angle-geometry: solveSlingAngle（外部突合）", () => {
  it("吊り幅2m・高さ√3m → 角度60°・ワイヤ長2.0m（30-60-90三角形）", () => {
    const r = solveSlingAngle(2, "height", Math.sqrt(3));
    expect(r).not.toBeNull();
    expect(r!.angleDeg).toBeCloseTo(60, 6);
    expect(r!.wireLengthM).toBeCloseTo(2, 6);
  });

  it("吊り幅2m・ワイヤ長2.0m → 角度60°・高さ√3m", () => {
    const r = solveSlingAngle(2, "wireLength", 2);
    expect(r).not.toBeNull();
    expect(r!.angleDeg).toBeCloseTo(60, 6);
    expect(r!.heightM).toBeCloseTo(Math.sqrt(3), 6);
  });

  it("高さ・ワイヤ長の2経路で同じ角度になる（相互整合）", () => {
    const fromHeight = solveSlingAngle(3, "height", 2);
    const fromWire = solveSlingAngle(3, "wireLength", fromHeight!.wireLengthM);
    expect(fromWire!.angleDeg).toBeCloseTo(fromHeight!.angleDeg, 6);
  });

  it("ワイヤ長が半幅以下（三角形が成立しない）は null", () => {
    expect(solveSlingAngle(4, "wireLength", 1.9)).toBeNull();
    expect(solveSlingAngle(4, "wireLength", 2)).toBeNull(); // 境界（半幅と等しい）も不成立
  });

  it("垂直に近い（高さが非常に大きい）→ 角度は0に近づく", () => {
    const r = solveSlingAngle(2, "height", 1000);
    expect(r!.angleDeg).toBeLessThan(1);
  });
});

describe("sling-angle-geometry: compute", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(slingAngleGeometryCalculator, raw);
    expect(errors).toEqual([]);
    return slingAngleGeometryCalculator.compute(values);
  };

  it("吊り幅2m・高さ1.7320508m → 角度60°を表示", () => {
    const out = run({ b: 2, inputMode: "height", h: 1.7320508 });
    expect(out.tone).toBe("info");
    expect(out.value).toBe("60");
  });

  it("角度60°超では sling-wire-load への相互リンク警告を出す", () => {
    const out = run({ b: 3, inputMode: "height", h: 1 }); // 半幅1.5/高さ1 → 角度は60°超
    expect(out.warnings.join("\n")).toContain("sling-wire-load");
    expect(out.warnings.join("\n")).toContain("60°");
  });

  it("角度60°以下では通常の相互リンク案内を出す", () => {
    const out = run({ b: 1, inputMode: "height", h: 5 });
    expect(out.warnings.join("\n")).toContain("sling-wire-load");
    expect(out.warnings.join("\n")).not.toContain("急増");
  });

  it("ワイヤ長が短すぎるときは danger で計算不能を返す", () => {
    const out = run({ b: 4, inputMode: "wireLength", wireLength: 1.5 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("計算不能");
  });
});
