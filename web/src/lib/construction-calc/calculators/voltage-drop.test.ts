import { describe, it, expect } from "vitest";
import { voltageDropCalculator, voltageDropV, PHASE_COEFFICIENT } from "./voltage-drop";
import { normalizeValues } from "../schema";

/**
 * 電圧降下チェックの数値固定テスト。
 * 期待値は内線規程の簡略式 e=係数・L・I/(1000・A) の手計算（出典から独立）で固定する。
 */
describe("voltage-drop: voltageDropV（内線規程の簡略式・外部突合）", () => {
  it("単相2線式 こう長50m・20A・5.5mm² → e≈6.47V", () => {
    const e = voltageDropV(PHASE_COEFFICIENT.single_2wire, 50, 20, 5.5);
    expect(e).toBeCloseTo(6.4727, 3);
  });

  it("三相3線式 こう長30m・15A・14mm² → e≈0.99V", () => {
    const e = voltageDropV(PHASE_COEFFICIENT.three_3wire, 30, 15, 14);
    expect(e).toBeCloseTo(0.99, 2);
  });

  it("係数は単相2線式=単相3線式=35.6・三相3線式=30.8", () => {
    expect(PHASE_COEFFICIENT.single_2wire).toBe(35.6);
    expect(PHASE_COEFFICIENT.single_3wire).toBe(35.6);
    expect(PHASE_COEFFICIENT.three_3wire).toBe(30.8);
  });
});

describe("voltage-drop: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(voltageDropCalculator, raw);
    expect(errors).toEqual([]);
    return voltageDropCalculator.compute(values);
  };

  it("単相2線式 5.5mm²・こう長50m・20A・100V・原則2% → 許容超過", () => {
    const out = run({ phase: "single_2wire", lengthM: 50, currentA: 20, sizeMm2: "5.5", standardVoltageV: "100", allowance: "general2" });
    expect(out.tone).toBe("danger");
    expect(out.value).toBe("6.47");
  });

  it("三相3線式 14mm²・こう長30m・15A・200V・原則2% → 許容範囲内", () => {
    const out = run({ phase: "three_3wire", lengthM: 30, currentA: 15, sizeMm2: "14", standardVoltageV: "200", allowance: "general2" });
    expect(out.tone).toBe("safe");
  });

  it("同一条件でもこう長200m超の区分(6%)を選べば許容範囲内になる", () => {
    const out = run({ phase: "single_2wire", lengthM: 40, currentA: 20, sizeMm2: "5.5", standardVoltageV: "100", allowance: "over200" });
    expect(out.tone).toBe("safe");
    const stricter = run({ phase: "single_2wire", lengthM: 40, currentA: 20, sizeMm2: "5.5", standardVoltageV: "100", allowance: "general2" });
    expect(stricter.tone).toBe("danger");
  });

  it("境界値: 電圧降下がちょうど許容値なら適合（voltageDropV単体で確認）", () => {
    // e = 35.6*L*I/(1000*A) がちょうど2Vになる組み合わせ（L=100,I=10,A=17.8）
    const e = voltageDropV(PHASE_COEFFICIENT.single_2wire, 100, 10, 17.8);
    expect(e).toBeCloseTo(2, 6);
  });

  it("cable-ampacity への相互リンク注意を含む", () => {
    const out = run({ phase: "single_2wire", lengthM: 50, currentA: 20, sizeMm2: "5.5" });
    expect(out.warnings.join("\n")).toContain("cable-ampacity");
  });
});
