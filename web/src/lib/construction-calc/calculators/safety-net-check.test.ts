import { describe, it, expect } from "vitest";
import { normalizeValues } from "../schema";
import {
  safetyNetCheckCalculator,
  computeNetLimits,
  H1_COEFF,
  H2_COEFF,
} from "./safety-net-check";

/**
 * 安全ネット（防網）基準チェックの数値固定テスト。
 *
 * 突合の正本は昭和51年 労働省 技術上の指針公示第8号（4−1）の算定式（一次資料＝JAISH原文を
 * Shift_JIS明示デコードで突合。docs/construction-calc-sources/R5-safety-net-jaish-shou51-kokuji8.decoded.txt）。
 * 期待値はすべて告示式からの手計算で、境界（L<A / L=A / L≧A の分岐連続）を数値固定する。
 * 外部突合: 告示の分岐形（L≧A: H1=0.75L 等）と統一形（Aeff=max(A,L)）が L=A で一致することを
 * 独立に検算し、二次資料（足場業者公開の算定式）とも係数の一致（H1・H2）を確認する
 * （※垂れSの係数は二次資料の0.20誤記ではなく告示原文の0.25を採用）。
 */
describe("safety-net-check: computeNetLimits（告示4−1の算定式）", () => {
  it("単体・10cm網目・L<A（L=3,A=5）を告示式どおり算定", () => {
    const r = computeNetLimits({ netType: "single", meshType: "m10", L: 3, A: 5 });
    expect(r.Aeff).toBe(5); // L<A なので A そのまま
    expect(r.H1).toBeCloseTo(3.25, 6); // 0.25(3+2*5)=0.25*13
    expect(r.S).toBeCloseTo(13 / 12, 6); // 0.25*13/3 = 1.08333...
    expect(r.H2).toBeCloseTo(3.825, 6); // 0.85(3+3*5)/4 = 0.85*18/4
  });

  it("単体・10cm網目・L≧A（L=7,A=3.75）は A を L で頭打ち＝0.75L 形と一致", () => {
    const r = computeNetLimits({ netType: "single", meshType: "m10", L: 7, A: 3.75 });
    expect(r.Aeff).toBe(7); // A≦L → A=L
    expect(r.H1).toBeCloseTo(5.25, 6); // 0.75*7 = 0.25*(7+2*7)
    expect(r.H2).toBeCloseTo(5.95, 6); // 0.85*7
    expect(r.S).toBeCloseTo(1.75, 6); // 0.75*7/3
  });

  it("複合ネットは落下高さ係数0.20（L=3,A=5 → H1=2.6）", () => {
    const r = computeNetLimits({ netType: "composite", meshType: "m10", L: 3, A: 5 });
    expect(r.H1).toBeCloseTo(2.6, 6); // 0.20*13
  });

  it("5cm網目は下部の空き係数0.95（L=5,A=5 → H2=4.75）", () => {
    const r = computeNetLimits({ netType: "single", meshType: "m5", L: 5, A: 5 });
    expect(r.H2).toBeCloseTo(4.75, 6); // 0.95*(5+3*5)/4 = 0.95*20/4 = 0.95*5
  });

  it("外部突合: L=A の境界で 分岐形(0.75L/0.85L) と 統一形(Aeff=max) が連続一致する", () => {
    for (const L of [2, 4, 6.5]) {
      const r = computeNetLimits({ netType: "single", meshType: "m10", L, A: L });
      // L≧A 分岐: H1=0.75L, H2=0.85L
      expect(r.H1).toBeCloseTo(0.75 * L, 9);
      expect(r.H2).toBeCloseTo(0.85 * L, 9);
    }
  });

  it("係数が告示原文どおり（単体0.25/複合0.20・10cm0.85/5cm0.95）", () => {
    expect(H1_COEFF.single).toBe(0.25);
    expect(H1_COEFF.composite).toBe(0.2);
    expect(H2_COEFF.m10).toBe(0.85);
    expect(H2_COEFF.m5).toBe(0.95);
  });
});

describe("safety-net-check: compute() の判定", () => {
  const calc = safetyNetCheckCalculator;

  it("落下高さ≤H1 かつ 下部空き≥H2 → safe", () => {
    const { values, errors } = normalizeValues(calc, {
      netType: "single",
      meshType: "m10",
      shortSideL: 3,
      supportSpacingA: 5,
      fallHeight: 3, // ≤ 3.25
      clearanceBelow: 5, // ≥ 3.825
    });
    expect(errors).toEqual([]);
    const out = calc.compute(values);
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準内");
    expect(out.value).toBe("3.25");
  });

  it("落下高さ>H1 → danger（落下高さ超過）", () => {
    const { values } = normalizeValues(calc, {
      netType: "single",
      meshType: "m10",
      shortSideL: 3,
      supportSpacingA: 5,
      fallHeight: 4, // > 3.25
      clearanceBelow: 5,
    });
    const out = calc.compute(values);
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("落下高さ超過");
  });

  it("下部空き<H2 → danger（下部の空き不足）", () => {
    const { values } = normalizeValues(calc, {
      netType: "single",
      meshType: "m10",
      shortSideL: 3,
      supportSpacingA: 5,
      fallHeight: 3,
      clearanceBelow: 3, // < 3.825
    });
    const out = calc.compute(values);
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("下部の空き不足");
  });

  it("既定値で例外なく完走し、告示の固定注記（強度・網目・定期試験）を必ず出す", () => {
    const { values, errors } = normalizeValues(calc, {});
    expect(errors).toEqual([]);
    const out = calc.compute(values);
    expect(out.steps.length).toBeGreaterThan(0);
    // 入力に依存しない構造/管理基準の警告が常に付く
    expect(out.warnings.join("\n")).toContain("1,500kg");
    expect(out.warnings.join("\n")).toContain("網目");
  });

  it("根拠に安衛則539条（law-navi深リンク）と昭和51年告示を持つ", () => {
    const labels = calc.basis.map((b) => b.label).join("\n");
    expect(labels).toContain("第539条");
    expect(labels).toContain("技術上の指針公示第8号");
    expect(calc.basis.some((b) => b.lawNaviPath === "/law-navi/347M50002000032/539")).toBe(true);
  });
});
