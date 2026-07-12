import { describe, it, expect } from "vitest";
import {
  earthPressureShoringCalculator,
  computeEarthPressure,
  rankineKa,
  jakyK0,
  GAMMA_WATER,
} from "./earth-pressure-shoring";
import { normalizeValues } from "../schema";

/**
 * 土圧の数値固定テスト。
 * 期待値はランキン理論・静水圧の閉形式から独立に手計算した値（外部突合）。
 */
describe("earth-pressure: 土圧係数（ランキン／Jáky）", () => {
  it("Ka(30°)=1/3、K0(30°)=0.5（公表値と一致）", () => {
    expect(rankineKa(30)).toBeCloseTo(1 / 3, 5);
    // (1−sinφ)/(1+sinφ) と tan²(45−φ/2) の一致（理論の内部整合）
    expect(rankineKa(30)).toBeCloseTo((1 - Math.sin(Math.PI / 6)) / (1 + Math.sin(Math.PI / 6)), 6);
    expect(jakyK0(30)).toBeCloseTo(0.5, 6);
  });

  it("Ka(0°)=1、Ka(45°)=tan²(22.5°)≈0.1716", () => {
    expect(rankineKa(0)).toBeCloseTo(1, 6);
    expect(rankineKa(45)).toBeCloseTo(Math.tan((22.5 * Math.PI) / 180) ** 2, 6);
    expect(rankineKa(45)).toBeCloseTo(0.1716, 3);
  });
});

describe("earth-pressure: 合力（外部突合＝手計算値）", () => {
  it("乾燥・粘着0・上載0: Pa=½·Ka·γ·H²（H=4,γ=18,φ30 → 48.0 kN/m）", () => {
    // dw=H=4, hsub=0。intSigmaV=½·18·16=144。Pa=Ka·144=1/3·144=48.0
    const r = computeEarthPressure(4, 18, 30, 0, 0, 4, false);
    expect(r.K).toBeCloseTo(1 / 3, 5);
    expect(r.earthThrust).toBeCloseTo(48.0, 2);
    expect(r.waterThrust).toBeCloseTo(0, 6);
    expect(r.total).toBeCloseTo(48.0, 2);
  });

  it("上載10を加える: intSigmaV=10·4+144=184、Pa=1/3·184=61.33 kN/m", () => {
    const r = computeEarthPressure(4, 18, 30, 0, 10, 4, false);
    expect(r.earthThrust).toBeCloseTo(184 / 3, 2);
  });

  it("地下水位2m・H5m: 有効応力＋静水圧の重ね合わせ（手計算 total≈104.4 kN/m）", () => {
    // dw=2, hsub=3, γ'=18−9.81=8.19
    // intSigmaV=½·18·4 + 18·2·3 + ½·8.19·9 = 36 + 108 + 36.855 = 180.855
    // earth=1/3·180.855=60.285、water=½·9.81·9=44.145、total=104.43
    const r = computeEarthPressure(5, 18, 30, 0, 0, 2, false);
    const gammaEff = 18 - GAMMA_WATER;
    const intSigmaV = 0.5 * 18 * 4 + 18 * 2 * 3 + 0.5 * gammaEff * 9;
    expect(r.earthThrust).toBeCloseTo(intSigmaV / 3, 3);
    expect(r.waterThrust).toBeCloseTo(0.5 * GAMMA_WATER * 9, 3);
    expect(r.total).toBeCloseTo(intSigmaV / 3 + 0.5 * GAMMA_WATER * 9, 3);
    expect(r.submergedHeight).toBe(3);
  });

  it("粘着力による引張域は0に頭打ち（負の合力を出さない）", () => {
    // 浅く粘着大 → K·σv−2c√K が負になる領域。earthThrust>=0
    const r = computeEarthPressure(1, 16, 0, 30, 0, 1, false);
    expect(r.earthThrust).toBeGreaterThanOrEqual(0);
  });

  it("静止土圧は主働土圧より大きい（K0>Ka）", () => {
    const active = computeEarthPressure(4, 18, 30, 0, 0, 4, false);
    const atRest = computeEarthPressure(4, 18, 30, 0, 0, 4, true);
    expect(atRest.total).toBeGreaterThan(active.total);
    expect(atRest.K).toBeCloseTo(0.5, 6);
  });

  it("境界: 水位=壁高 なら水圧0（submergedHeight=0）", () => {
    const r = computeEarthPressure(4, 18, 30, 0, 0, 4, false);
    expect(r.submergedHeight).toBe(0);
    expect(r.waterThrust).toBe(0);
  });
});

describe("earth-pressure: compute / 警告 / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(earthPressureShoringCalculator, raw);
    expect(errors).toEqual([]);
    return earthPressureShoringCalculator.compute(values);
  };

  it("既定値で side圧合力を体言止めで返す", () => {
    const out = run({});
    expect(out.headline).toBe("側圧を算定");
    expect(out.unit).toBe("kN/m");
    expect(out.steps.length).toBeGreaterThan(3);
  });

  it("水位が浅いと静水圧の重ね合わせ警告を出す", () => {
    const out = run({ height: 5, waterDepth: 2 });
    expect(out.warnings.join("\n")).toContain("静水圧");
  });

  it("作業主任者（359条・374条）の警告を常に含む", () => {
    const out = run({});
    const w = out.warnings.join("\n");
    expect(w).toContain("第359条");
    expect(w).toContain("第374条");
  });

  it("盤ぶくれ・断面照査は範囲外である旨の警告を含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("ヒービング");
  });
});
