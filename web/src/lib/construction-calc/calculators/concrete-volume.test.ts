import { describe, it, expect } from "vitest";
import {
  concreteVolumeCalculator,
  rectangularVolume,
  orderVolumeWithLoss,
} from "./concrete-volume";
import { normalizeValues } from "../schema";

/**
 * 生コン数量の数値固定テスト。期待値は体積計算・ロス率加算の式から独立に手計算した値（外部突合）。
 */
describe("concrete-volume: 体積・発注量（外部突合＝手計算値）", () => {
  it("5m×4m×0.5m = 10m³（直方体の体積の手計算と一致）", () => {
    expect(rectangularVolume(5, 4, 0.5)).toBeCloseTo(10, 6);
  });

  it("打設量10m³・ロス率3% → 発注量10.3m³", () => {
    expect(orderVolumeWithLoss(10, 3)).toBeCloseTo(10.3, 6);
  });

  it("境界: ロス率0% なら発注量=打設量", () => {
    expect(orderVolumeWithLoss(10, 0)).toBe(10);
  });
});

describe("concrete-volume: compute / 正規化", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(concreteVolumeCalculator, raw);
    expect(errors).toEqual([]);
    return concreteVolumeCalculator.compute(values);
  };

  it("既定値（5×4×0.5・ロス3%）は発注量10.3m³を返す", () => {
    const out = run({});
    expect(out.headline).toBe("発注量を算定");
    expect(out.value).toBe("10.3");
    expect(out.unit).toBe("m³");
  });

  it("発注量10.3m³・1台4.5m³ → 生コン車3台（切り上げ）", () => {
    const out = run({});
    const truckItem = out.items.find((i) => i.label.includes("生コン車"));
    expect(truckItem?.value).toContain("3");
  });

  it("体積直接入力モードでは入力値をそのまま打設量とする", () => {
    const out = run({ calcMode: "direct", volume: 20, lossRate: 5 });
    expect(out.value).toBe("21");
  });

  it("配合（水セメント比等）は本計算に含まない旨の警告を常に含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("配合");
    expect(out.warnings.join("\n")).toContain("JASS5");
  });

  it("ロス率は現場条件で変動する旨の警告を常に含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("ロス率");
  });
});
