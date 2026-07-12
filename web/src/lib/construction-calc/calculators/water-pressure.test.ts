import { describe, it, expect } from "vitest";
import {
  waterPressureCalculator,
  hydrostaticPressure,
  upliftPressure,
  criticalHydraulicGradient,
  GAMMA_WATER,
} from "./water-pressure";
import { normalizeValues } from "../schema";

/**
 * 水圧の数値固定テスト。期待値は出典（静水圧・限界動水勾配の一般理論）から
 * 独立に手計算した値（外部突合）。
 */
describe("water-pressure: 静水圧（外部突合＝手計算値）", () => {
  it("h=3m: p=γw・h=29.43kN/m²、P=½γw h²=44.145kN/m", () => {
    const { p, resultant } = hydrostaticPressure(3);
    expect(p).toBeCloseTo(9.81 * 3, 6);
    expect(p).toBeCloseTo(29.43, 3);
    expect(resultant).toBeCloseTo(0.5 * 9.81 * 9, 6);
    expect(resultant).toBeCloseTo(44.145, 3);
  });

  it("h=4m: P=½・9.81・16=78.48kN/m", () => {
    const { resultant } = hydrostaticPressure(4);
    expect(resultant).toBeCloseTo(78.48, 3);
  });

  it("境界: h=0 なら圧力・合力ともに0", () => {
    const { p, resultant } = hydrostaticPressure(0);
    expect(p).toBe(0);
    expect(resultant).toBe(0);
  });
});

describe("water-pressure: 揚圧（外部突合＝手計算値）", () => {
  it("hw=3m・面積10m²: p=29.43kN/m²、揚圧合力=294.3kN", () => {
    const { p, force } = upliftPressure(3, 10);
    expect(p).toBeCloseTo(29.43, 3);
    expect(force).toBeCloseTo(294.3, 2);
  });

  it("押さえ荷重400kN ÷ 揚圧合力294.3kN ≒ 1.359倍（安全率1.2以上でsafe）", () => {
    const { values, errors } = normalizeValues(waterPressureCalculator, {
      calcMode: "uplift",
      waterHead: 3,
      holdingArea: 10,
      holdingLoad: 400,
    });
    expect(errors).toEqual([]);
    const out = waterPressureCalculator.compute(values);
    expect(out.value).toBe((400 / 294.3).toFixed(2));
    expect(out.tone).toBe("safe");
  });

  it("押さえ荷重200kN（Fs=0.68倍）は danger", () => {
    const { values } = normalizeValues(waterPressureCalculator, {
      calcMode: "uplift",
      waterHead: 3,
      holdingArea: 10,
      holdingLoad: 200,
    });
    const out = waterPressureCalculator.compute(values);
    expect(out.tone).toBe("danger");
  });
});

describe("water-pressure: 限界動水勾配・ボイリング（外部突合＝手計算値）", () => {
  it("Gs=2.65, e=0.7 → icr=(2.65−1)/(1+0.7)≒0.9706（公表値と一致）", () => {
    expect(criticalHydraulicGradient(2.65, 0.7)).toBeCloseTo(1.65 / 1.7, 6);
    expect(criticalHydraulicGradient(2.65, 0.7)).toBeCloseTo(0.9706, 3);
  });

  it("Δh=3m・L=6m → i=0.5、Fs=icr/i=0.9706/0.5≒1.941倍（安全率1.5以上でsafe）", () => {
    const { values } = normalizeValues(waterPressureCalculator, {
      calcMode: "boiling",
      seepageHeadDiff: 3,
      seepagePathLength: 6,
      soilGs: 2.65,
      soilVoidRatio: 0.7,
    });
    const out = waterPressureCalculator.compute(values);
    const icr = criticalHydraulicGradient(2.65, 0.7);
    const fs = icr / 0.5;
    expect(out.value).toBe(fs.toFixed(2));
    expect(out.tone).toBe("safe");
  });

  it("Δh=5m・L=4m（i=1.25）は icr=0.9706 未満のため danger", () => {
    const { values } = normalizeValues(waterPressureCalculator, {
      calcMode: "boiling",
      seepageHeadDiff: 5,
      seepagePathLength: 4,
      soilGs: 2.65,
      soilVoidRatio: 0.7,
    });
    const out = waterPressureCalculator.compute(values);
    expect(out.tone).toBe("danger");
  });
});

describe("water-pressure: compute / 警告 / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(waterPressureCalculator, raw);
    expect(errors).toEqual([]);
    return waterPressureCalculator.compute(values);
  };

  it("既定値（静水圧モード）は体言止めで返す", () => {
    const out = run({});
    expect(out.headline).toBe("静水圧を算定");
    expect(out.unit).toBe("kN/m");
    expect(out.steps.length).toBeGreaterThan(1);
  });

  it("揚圧モードは湧水・被圧の警告を含む", () => {
    const out = run({ calcMode: "uplift" });
    expect(out.warnings.join("\n")).toContain("被圧地下水");
  });

  it("ボイリングモードは崩壊危険の警告を含む", () => {
    const out = run({ calcMode: "boiling" });
    expect(out.warnings.join("\n")).toContain("崩壊");
  });

  it("GAMMA_WATER は9.81", () => {
    expect(GAMMA_WATER).toBe(9.81);
  });
});
