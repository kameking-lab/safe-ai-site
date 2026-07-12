import { describe, it, expect } from "vitest";
import {
  formworkLateralPressureCalculator,
  liquidPressureApprox,
  liquidPressureResultant,
} from "./formwork-lateral-pressure";
import { normalizeValues } from "../schema";

/**
 * 型枠側圧（液圧近似）の数値固定テスト。期待値は P=W・H の式から独立に手計算した値（外部突合）。
 */
describe("formwork-lateral-pressure: 液圧近似（外部突合＝手計算値）", () => {
  it("W=23.5, H=3m → P=70.5kN/m²（液圧近似の手計算と一致）", () => {
    expect(liquidPressureApprox(23.5, 3)).toBeCloseTo(70.5, 6);
  });

  it("W=23.5, H=4m → P=94.0kN/m²", () => {
    expect(liquidPressureApprox(23.5, 4)).toBeCloseTo(94.0, 6);
  });

  it("合力（三角形分布・参考）W=23.5,H=3 → ½・23.5・9=105.75kN/m", () => {
    expect(liquidPressureResultant(23.5, 3)).toBeCloseTo(105.75, 6);
  });

  it("境界: H=0 なら側圧・合力ともに0", () => {
    expect(liquidPressureApprox(23.5, 0)).toBe(0);
    expect(liquidPressureResultant(23.5, 0)).toBe(0);
  });
});

describe("formwork-lateral-pressure: compute / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(formworkLateralPressureCalculator, raw);
    expect(errors).toEqual([]);
    return formworkLateralPressureCalculator.compute(values);
  };

  it("既定値（建築・W23.5・H3m）は P=70.5kN/m² を体言止めで返す", () => {
    const out = run({});
    expect(out.headline).toBe("最大側圧（液圧近似）を算定");
    expect(out.value).toBe("70.5");
    expect(out.unit).toBe("kN/m²");
  });

  it("打込み高さ4mに変えるとP=94.0kN/m²", () => {
    const out = run({ pourHeight: 4 });
    expect(out.value).toBe("94");
  });

  it("速度・温度による低減は行わない旨の警告を常に含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("低減は行っていません");
  });

  it("土木区分ではコンクリート標準示方書を案内する", () => {
    const out = run({ buildType: "civil" });
    expect(out.warnings.join("\n")).toContain("コンクリート標準示方書");
  });

  it("セパレータ・端太・支保工の断面照査は範囲外である旨の警告を含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("支保工");
  });

  it("締固め（バイブレータ）の局部増の警告を含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("締固め");
  });
});
