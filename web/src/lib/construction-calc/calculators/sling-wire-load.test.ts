import { describe, it, expect } from "vitest";
import {
  slingWireLoadCalculator,
  tensionFactor,
  effectiveStrands,
  WIRE_BREAKING_LOAD_KN,
} from "./sling-wire-load";
import { normalizeValues } from "../schema";

/**
 * 玉掛けワイヤロープ計算の数値固定テスト。
 * 期待値は玉掛け技能講習テキストの表・クレーン則213条の定義から独立に手計算した値。
 * この数値を変える変更は根拠の再確認なしにマージしない。
 */
describe("sling-wire-load: 張力増加係数（1/cos(θ/2)）", () => {
  it("講習テキストの係数表と一致する", () => {
    expect(tensionFactor(0)).toBeCloseTo(1.0, 5);
    expect(tensionFactor(30)).toBeCloseTo(1.035, 3);
    expect(tensionFactor(60)).toBeCloseTo(1.155, 3);
    expect(tensionFactor(90)).toBeCloseTo(1.414, 3);
    expect(tensionFactor(120)).toBeCloseTo(2.0, 5);
  });
});

describe("sling-wire-load: 有効吊り本数（安全側）", () => {
  it("3本吊りは2本、4本吊りは3本で計算する", () => {
    expect(effectiveStrands(1)).toBe(1);
    expect(effectiveStrands(2)).toBe(2);
    expect(effectiveStrands(3)).toBe(2);
    expect(effectiveStrands(4)).toBe(3);
  });
});

describe("sling-wire-load: 切断荷重表（JIS G 3525 6×24 A種 参考値）", () => {
  it("基本安全荷重が講習テキストの目安（φ10≒0.8t・φ16≒2t）と整合する", () => {
    // 基本安全荷重 [kg] = 切断荷重[kN] × 1000 / 9.80665 / 6
    const basic = (d: string) => (WIRE_BREAKING_LOAD_KN[d] * 1000) / 9.80665 / 6;
    expect(basic("10")).toBeGreaterThan(780);
    expect(basic("10")).toBeLessThan(820);
    expect(basic("16")).toBeGreaterThan(2000);
    expect(basic("16")).toBeLessThan(2080);
    expect(basic("12")).toBeGreaterThan(1130);
    expect(basic("12")).toBeLessThan(1170);
  });
});

describe("sling-wire-load: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(slingWireLoadCalculator, raw);
    expect(errors).toEqual([]);
    return slingWireLoadCalculator.compute(values);
  };

  it("2t・2本吊り60°・φ16 → 使用可（安全係数 約10.59）", () => {
    // T = 2000/2×1.1547 = 1154.7kg = 11.324kN, SF = 120/11.324 = 10.597 → 表示は切り捨て10.59
    const out = run({ loadKg: 2000, strands: "2", angle: "60", diameter: "16" });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
    expect(out.value).toBe("10.59");
  });

  it("2t・2本吊り60°・φ12 → 使用不可（安全係数 約5.98 = 6をわずかに下回る境界）", () => {
    // T = 1154.7kg = 11.324kN, SF = 67.7/11.324 = 5.979 < 6 → 表示は切り捨て5.97
    // （四捨五入で「6」と表示すると「6なのに使用不可」の見かけ矛盾になるため安全側切り捨て）
    const out = run({ loadKg: 2000, strands: "2", angle: "60", diameter: "12" });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("使用不可");
    expect(out.value).toBe("5.97");
    // 次の一手: φ14 が最小使用可能径（92.1/11.32 = 8.13 ≥ 6）
    const rec = out.items.find((i) => i.label.includes("最小径"));
    expect(rec?.value).toBe("φ14mm");
  });

  it("境界値: 安全係数ちょうど6は使用可", () => {
    // φ10 の切断荷重 47.0kN。SF=6 になる張力 = 47/6 kN = 7.833kN = 798.75kg
    // 垂直1本吊りで W = 798.75kg → ちょうど6
    const w = (47.0 / 6 / 9.80665) * 1000; // = 798.75...
    const out = run({ loadKg: w, strands: "1", angle: "0", diameter: "10" });
    expect(out.tone).toBe("safe");
  });

  it("4本吊りは3本として計算する（安全側）", () => {
    // 3000kg・4本吊り0°: T = 3000/3 = 1000kg（4本equal分担の750kgではない）
    const out = run({ loadKg: 3000, strands: "4", angle: "0", diameter: "16" });
    expect(out.steps.join("\n")).toContain("÷ 3本");
    expect(out.warnings.join("\n")).toContain("有効本数3本");
  });

  it("吊り角度120°は張力2倍＋角度警告", () => {
    const out = run({ loadKg: 1000, strands: "2", angle: "120", diameter: "12" });
    // T = 1000/2×2.0 = 1000kg
    expect(out.items.find((i) => i.label.includes("張力"))?.value).toContain("1,000kg");
    expect(out.warnings.join("\n")).toContain("90°以上");
  });

  it("収録最大径でも不足する超過荷重は揚重計画の見直しを促す", () => {
    const out = run({ loadKg: 50000, strands: "1", angle: "0", diameter: "8" });
    expect(out.tone).toBe("danger");
    expect(out.warnings.join("\n")).toContain("見直し");
  });

  it("常に製造者証明書の確認を促す注意を含む", () => {
    const out = run({ loadKg: 1000, strands: "2", angle: "60", diameter: "16" });
    expect(out.warnings.join("\n")).toContain("検査証明書");
  });
});

describe("sling-wire-load: 入力正規化", () => {
  it("範囲外の荷重は既定値へ戻しエラーを返す", () => {
    const { values, errors } = normalizeValues(slingWireLoadCalculator, { loadKg: -5 });
    expect(values.loadKg).toBe(1000);
    expect(errors.length).toBe(1);
  });

  it("選択肢外のワイヤ径は既定値へ戻す", () => {
    const { values, errors } = normalizeValues(slingWireLoadCalculator, { diameter: "11" });
    expect(values.diameter).toBe("12");
    expect(errors.length).toBe(1);
  });
});
