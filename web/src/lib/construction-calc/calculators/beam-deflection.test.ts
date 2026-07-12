import { describe, it, expect } from "vitest";
import {
  beamDeflectionCalculator,
  beamMaxDeflectionAndMoment,
  tubeSectionProps,
  SECTION_PRESETS,
} from "./beam-deflection";
import { normalizeValues } from "../schema";

/**
 * 梁のたわみ・曲げ応力の数値固定テスト。
 * 期待値は δ=5wL⁴/384EI・δ=PL³/3EI・σ=M/Z の手計算（出典から独立）で固定する。
 * 単管パイプの I・Z はメーカー公表値（I=9.32cm⁴・Z=3.83cm³）との外部突合で確認する。
 */
describe("beam-deflection: tubeSectionProps（単管パイプ外部突合）", () => {
  it("STK500 φ48.6×2.4mm → I≈9.32cm⁴・Z≈3.83cm³（メーカー公表値と一致）", () => {
    const { iCm4, zCm3 } = tubeSectionProps(48.6, 2.4);
    expect(iCm4).toBeCloseTo(9.32, 1);
    expect(zCm3).toBeCloseTo(3.83, 1);
  });

  it("レジストリのプリセットに反映されている", () => {
    expect(SECTION_PRESETS.pipe48_6.iCm4).toBeCloseTo(9.32, 1);
    expect(SECTION_PRESETS.pipe48_6.zCm3).toBeCloseTo(3.83, 1);
  });
});

describe("beam-deflection: beamMaxDeflectionAndMoment（外部突合）", () => {
  const pipe = tubeSectionProps(48.6, 2.4);

  it("単純梁・等分布荷重: スパン2m・1kN/m・単管 → δ≈10.91mm・M=0.5kN・m", () => {
    const { deflectionMm, momentNmm } = beamMaxDeflectionAndMoment({
      caseType: "simple_udl",
      spanM: 2,
      udlKnPerM: 1,
      pointKn: 0,
      eNmm2: 205000,
      iCm4: pipe.iCm4,
    });
    expect(deflectionMm).toBeCloseTo(10.91, 1);
    expect(momentNmm / 1e6).toBeCloseTo(0.5, 6);
  });

  it("単純梁・等分布荷重: スパン4m・2kN/m・H150 → δ≈2.01mm・M=4kN・m", () => {
    const { deflectionMm, momentNmm } = beamMaxDeflectionAndMoment({
      caseType: "simple_udl",
      spanM: 4,
      udlKnPerM: 2,
      pointKn: 0,
      eNmm2: 205000,
      iCm4: SECTION_PRESETS.h150.iCm4,
    });
    expect(deflectionMm).toBeCloseTo(2.01, 1);
    expect(momentNmm / 1e6).toBeCloseTo(4, 6);
  });

  it("片持ち梁・先端集中荷重: 張り出し1m・0.5kN・単管 → δ≈8.72mm・M=0.5kN・m", () => {
    const { deflectionMm, momentNmm } = beamMaxDeflectionAndMoment({
      caseType: "cantilever_point",
      spanM: 1,
      udlKnPerM: 0,
      pointKn: 0.5,
      eNmm2: 205000,
      iCm4: pipe.iCm4,
    });
    expect(deflectionMm).toBeCloseTo(8.72, 1);
    expect(momentNmm / 1e6).toBeCloseTo(0.5, 6);
  });
});

describe("beam-deflection: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(beamDeflectionCalculator, raw);
    expect(errors).toEqual([]);
    return beamDeflectionCalculator.compute(values);
  };

  it("単管・スパン2m・1kN/m・許容スパン/300 → たわみ超過（応力は許容内）", () => {
    const out = run({ caseType: "simple_udl", spanM: 2, udlKnPerM: 1, section: "pipe48_6", deflectionRatio: "300", allowableStressNmm2: 156 });
    expect(out.tone).toBe("danger");
    expect(out.value).toBe("10.9");
  });

  it("H150・スパン4m・2kN/m・許容スパン/300 → たわみ・応力とも許容内", () => {
    const out = run({ caseType: "simple_udl", spanM: 4, udlKnPerM: 2, section: "h150", deflectionRatio: "300", allowableStressNmm2: 156 });
    expect(out.tone).toBe("safe");
  });

  it("片持ち梁・単管・張り出し1m・0.5kN → たわみ超過", () => {
    const out = run({ caseType: "cantilever_point", spanM: 1, pointKn: 0.5, section: "pipe48_6", deflectionRatio: "300", allowableStressNmm2: 156 });
    expect(out.tone).toBe("danger");
  });

  it("手入力断面（section=custom）でも計算できる", () => {
    const out = run({ caseType: "simple_udl", spanM: 2, udlKnPerM: 1, section: "custom", customICm4: 9.32, customZCm3: 3.83 });
    expect(out.headline).toBeDefined();
    expect(out.warnings.join("\n")).toContain("手入力");
  });

  it("座屈・接合部が範囲外である旨の注意を常に含む", () => {
    const out = run({ caseType: "simple_udl", spanM: 2, udlKnPerM: 1 });
    expect(out.warnings.join("\n")).toContain("座屈");
  });
});
