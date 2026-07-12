import { describe, it, expect } from "vitest";
import {
  windLoadTemporaryCalculator,
  windEr,
  windGf,
  velocityPressure,
  ROUGHNESS,
} from "./wind-load-temporary";
import { normalizeValues } from "../schema";

/**
 * 風荷重の数値固定テスト。
 * 期待値は建築基準法施行令87条・平成12年告示1454号の式から独立に手計算した値（外部突合）。
 */
describe("wind-load: Er（高さ方向分布係数・告示1454）", () => {
  it("粗度区分III・H=10: Er=1.7·(10/450)^0.2 ≈ 0.7939", () => {
    expect(windEr("III", 10)).toBeCloseTo(1.7 * (10 / 450) ** 0.2, 6);
    expect(windEr("III", 10)).toBeCloseTo(0.7939, 3);
  });

  it("境界 H≤Zb は Zb で頭打ち（III: Zb=5 → H=3 と H=5 が同値）", () => {
    expect(windEr("III", 3)).toBeCloseTo(windEr("III", 5), 8);
    expect(windEr("III", 5)).toBeCloseTo(1.7 * (ROUGHNESS.III.Zb / ROUGHNESS.III.ZG) ** ROUGHNESS.III.alpha, 8);
  });

  it("粗度区分IVは Zb=10（H=8 と H=10 が同値）", () => {
    expect(windEr("IV", 8)).toBeCloseTo(windEr("IV", 10), 8);
  });
});

describe("wind-load: Gf（ガスト影響係数・補間）", () => {
  it("H≤10は gf10、H≥40は gf40（III: 2.5 / 2.1）", () => {
    expect(windGf("III", 10)).toBe(2.5);
    expect(windGf("III", 5)).toBe(2.5);
    expect(windGf("III", 40)).toBe(2.1);
    expect(windGf("III", 60)).toBe(2.1);
  });

  it("H=25 は線形補間（III: 2.5 + (2.1−2.5)·15/30 = 2.3）", () => {
    expect(windGf("III", 25)).toBeCloseTo(2.3, 6);
  });
});

describe("wind-load: 速度圧・風力（外部突合＝手計算値）", () => {
  it("III・H=10・Vo=34: q ≈ 1093 N/m²", () => {
    const { Er, Gf, E, q } = velocityPressure("III", 10, 34);
    expect(Er).toBeCloseTo(0.79395, 4);
    expect(Gf).toBe(2.5);
    expect(E).toBeCloseTo(Er * Er * Gf, 8);
    expect(q).toBeCloseTo(0.6 * E * 34 * 34, 6);
    expect(q).toBeCloseTo(1093.0, 0);
  });

  it("風力 W = q·Cf·A·φ（III・H10・Vo34・A10・Cf1.2・φ1.0 → 約13.1 kN）", () => {
    const { values, errors } = normalizeValues(windLoadTemporaryCalculator, {
      baseWind: 34,
      roughness: "III",
      height: 10,
      area: 10,
      fillRatio: 1.0,
      forceCoef: 1.2,
    });
    expect(errors).toEqual([]);
    const out = windLoadTemporaryCalculator.compute(values);
    const { q } = velocityPressure("III", 10, 34);
    const expectedKn = (q * 1.2 * 10 * 1.0) / 1000;
    expect(out.value).toBe(expectedKn.toLocaleString("ja-JP", { maximumFractionDigits: 1 }));
    expect(expectedKn).toBeCloseTo(13.12, 1);
  });

  it("充実率0.5にすると風力は半分になる（線形）", () => {
    const full = velocityPressure("III", 10, 34).q * 1.2 * 10 * 1.0;
    const half = velocityPressure("III", 10, 34).q * 1.2 * 10 * 0.5;
    expect(half).toBeCloseTo(full / 2, 6);
  });
});

describe("wind-load: compute / 警告 / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(windLoadTemporaryCalculator, raw);
    expect(errors).toEqual([]);
    return windLoadTemporaryCalculator.compute(values);
  };

  it("既定値で風力を体言止めで返す", () => {
    const out = run({});
    expect(out.headline).toBe("風力を算定");
    expect(out.unit).toBe("kN");
  });

  it("安全側概算である旨と仮設工業会指針の警告を含む", () => {
    const out = run({});
    const w = out.warnings.join("\n");
    expect(w).toContain("安全側");
    expect(w).toContain("仮設工業会");
  });

  it("強風地域（Vo≥40）で暴風対策の警告を追加する", () => {
    const out = run({ baseWind: 42 });
    expect(out.warnings.join("\n")).toContain("強風地域");
  });

  it("充実率が高いと壁つなぎ・アンカー増設の警告を追加する", () => {
    const out = run({ fillRatio: 1.0 });
    expect(out.warnings.join("\n")).toContain("受風面積");
  });
});
