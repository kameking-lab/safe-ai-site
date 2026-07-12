import { describe, it, expect } from "vitest";
import {
  rebarMassCalculator,
  rebarNominalArea,
  rebarUnitMass,
  REBAR_NOMINAL_DIAMETER_MM,
} from "./rebar-mass";
import { normalizeValues } from "../schema";

/**
 * 鉄筋質量の数値固定テスト。期待値はJIS G3112の公称直径から
 * A=π/4・d²、単位質量=A×7.85/1000 の式で独立に手計算した値（外部突合）。
 *
 * 注意（径ズレ防止）: D13の単位質量は0.995kg/mであり、1.56kg/mはD16の値。
 * 呼び名の取り違えが起きやすいため、本テストで両方を固定する。
 */
describe("rebar-mass: 単位質量（外部突合＝公称直径からの手計算値）", () => {
  it("D13: 公称直径12.7mm → 断面積126.7mm² → 単位質量0.995kg/m", () => {
    expect(REBAR_NOMINAL_DIAMETER_MM.D13).toBe(12.7);
    const area = rebarNominalArea("D13");
    expect(area).toBeCloseTo(126.7, 0);
    expect(rebarUnitMass("D13")).toBeCloseTo(0.995, 2);
  });

  it("D16: 公称直径15.9mm → 断面積198.6mm² → 単位質量1.56kg/m（D13と混同しない）", () => {
    expect(REBAR_NOMINAL_DIAMETER_MM.D16).toBe(15.9);
    const area = rebarNominalArea("D16");
    expect(area).toBeCloseTo(198.6, 0);
    expect(rebarUnitMass("D16")).toBeCloseTo(1.56, 2);
  });

  it("D10: 単位質量0.560kg/m", () => {
    expect(rebarUnitMass("D10")).toBeCloseTo(0.56, 2);
  });

  it("D25: 単位質量3.98kg/m", () => {
    expect(rebarUnitMass("D25")).toBeCloseTo(3.98, 2);
  });

  it("D51: 単位質量15.9kg/m", () => {
    expect(rebarUnitMass("D51")).toBeCloseTo(15.9, 1);
  });

  it("径が大きいほど単位質量は単調に増加する", () => {
    const sizes = ["D10", "D13", "D16", "D19", "D22", "D25", "D29", "D32", "D35", "D38", "D41", "D51"];
    const masses = sizes.map((s) => rebarUnitMass(s));
    for (let i = 1; i < masses.length; i++) {
      expect(masses[i]).toBeGreaterThan(masses[i - 1]);
    }
  });
});

describe("rebar-mass: compute / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(rebarMassCalculator, raw);
    expect(errors).toEqual([]);
    return rebarMassCalculator.compute(values);
  };

  it("D13・4m×10本 → 総質量 = 0.995×4×10 = 39.8kg", () => {
    const out = run({ calcMode: "lengthToMass", barSize: "D13", length: 4, count: 10 });
    expect(out.headline).toBe("総質量を算定");
    expect(out.unit).toBe("kg");
    const mass = rebarUnitMass("D13") * 4 * 10;
    expect(out.value).toBe(formatCheck(mass));
  });

  it("総質量→本数モードは切り上げ本数を返す", () => {
    const out = run({ calcMode: "massToCount", barSize: "D13", length: 4, totalMass: 39.8 });
    expect(out.headline).toBe("本数を算定");
    expect(out.unit).toBe("本");
    expect(Number(out.value)).toBeGreaterThanOrEqual(10);
  });

  it("定尺・継手・フックは含まない旨の警告を常に含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("継手");
    expect(out.warnings.join("\n")).toContain("フック");
  });

  it("既定値で例外なく完走する", () => {
    expect(() => run({})).not.toThrow();
  });
});

function formatCheck(n: number): string {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}
