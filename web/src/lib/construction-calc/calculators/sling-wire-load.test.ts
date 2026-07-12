import { describe, it, expect } from "vitest";
import {
  slingWireLoadCalculator,
  tensionFactor,
  angleCos,
  safetyFactorFor,
  SLING_MODES,
  WIRE_BREAKING_LOAD_KN,
  DD_BENDING_EFFICIENCY,
} from "./sling-wire-load";
import { normalizeValues, STANDARD_GRAVITY } from "../schema";

/**
 * 玉掛けワイヤロープ計算の数値固定テスト。
 * 期待値は (a) クレーン則213条・モード係数方式から独立に手計算した値と、
 * (b) 日本クレーン協会・メーカー公表の「玉掛け用ワイヤロープ安全荷重表（6×24 A種・安全率6）」
 *     の代表値との突合（外部アンカー＝自作自演の循環を断つ）で固定する。
 * この数値を変える変更は根拠の再確認なしにマージしない。
 */

const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(slingWireLoadCalculator, raw);
  expect(errors).toEqual([]);
  return slingWireLoadCalculator.compute(values);
};

describe("sling-wire-load: 張力増加係数・角度項", () => {
  it("張力増加係数 1/cos(θ/2) が講習テキストの表と一致する", () => {
    expect(tensionFactor(0)).toBeCloseTo(1.0, 5);
    expect(tensionFactor(30)).toBeCloseTo(1.035, 3);
    expect(tensionFactor(60)).toBeCloseTo(1.155, 3);
    expect(tensionFactor(90)).toBeCloseTo(1.414, 3);
    expect(tensionFactor(120)).toBeCloseTo(2.0, 5);
  });
  it("角度項 cos(θ/2)", () => {
    expect(angleCos(0)).toBeCloseTo(1.0, 5);
    expect(angleCos(60)).toBeCloseTo(0.866, 3);
    expect(angleCos(120)).toBeCloseTo(0.5, 5);
  });
});

describe("sling-wire-load: 外部アンカー突合（公表安全荷重表 6×24 A種・安全率6）", () => {
  // 基本安全荷重 [t] = 切断荷重[kN] × 1000 / g / 6
  const basicT = (d: string) => (WIRE_BREAKING_LOAD_KN["6x24A"][d] * 1000) / STANDARD_GRAVITY / 6 / 1000;

  it("基本安全荷重（垂直1本吊り）が公表表と一致（φ10≒0.8t・φ12≒1.15t・φ16≒2.0t）", () => {
    expect(basicT("10")).toBeGreaterThan(0.78);
    expect(basicT("10")).toBeLessThan(0.82);
    expect(basicT("12")).toBeGreaterThan(1.13);
    expect(basicT("12")).toBeLessThan(1.17);
    expect(basicT("16")).toBeGreaterThan(2.0);
    expect(basicT("16")).toBeLessThan(2.08);
  });

  it("2本つり60°の使用荷重が公表安全荷重表と一致（φ16≒3.5t・φ12≒2.0t）", () => {
    // 公表: 6×24 A種 φ16 2本60° ≒ 3.5t、φ12 2本60° ≒ 2.0t
    const out16 = run({ construction: "6x24A", loadKg: 1000, mode: "s2", angle: "60", diameter: "16" });
    const max16 = out16.items.find((i) => i.label.includes("最大質量"))!.value;
    const kg16 = Number(max16.replace(/[^\d]/g, ""));
    expect(kg16).toBeGreaterThan(3450);
    expect(kg16).toBeLessThan(3600);

    const out12 = run({ construction: "6x24A", loadKg: 1000, mode: "s2", angle: "60", diameter: "12" });
    const max12 = Number(out12.items.find((i) => i.label.includes("最大質量"))!.value.replace(/[^\d]/g, ""));
    expect(max12).toBeGreaterThan(1950);
    expect(max12).toBeLessThan(2050);
  });
});

describe("sling-wire-load: 順算モードの判定", () => {
  it("2t・2本吊り60°・φ16 → 使用可（安全係数 約10.59）", () => {
    const out = run({ calcMode: "forward", construction: "6x24A", loadKg: 2000, mode: "s2", angle: "60", diameter: "16" });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
    expect(out.value).toBe("10.59");
  });

  it("2t・2本吊り60°・φ12 → 使用不可（約5.97 = 6をわずかに下回る境界）＋次の一手φ14", () => {
    const out = run({ calcMode: "forward", construction: "6x24A", loadKg: 2000, mode: "s2", angle: "60", diameter: "12" });
    expect(out.tone).toBe("danger");
    expect(out.value).toBe("5.97");
    expect(out.items.find((i) => i.label.includes("最小径"))?.value).toBe("φ14mm");
  });

  it("境界値: 安全係数ちょうど6は使用可（φ10・1本つり垂直）", () => {
    const w = (47.0 / 6 / STANDARD_GRAVITY) * 1000; // = 798.75kg
    const out = run({ calcMode: "forward", construction: "6x24A", loadKg: w, mode: "v1", angle: "0", diameter: "10" });
    expect(out.tone).toBe("safe");
  });

  it("6×37 A種は同径でわずかに強い（φ16 2本60° の安全係数 > 6×24 A種）", () => {
    const a24 = run({ construction: "6x24A", loadKg: 2000, mode: "s2", angle: "60", diameter: "16" });
    const a37 = run({ construction: "6x37A", loadKg: 2000, mode: "s2", angle: "60", diameter: "16" });
    expect(Number(a37.value)).toBeGreaterThan(Number(a24.value));
  });
});

describe("sling-wire-load: 吊り方モード（モード係数方式）", () => {
  it("4本4点つり・2本4点あだ巻きつりは有効本数3で算定する", () => {
    expect(SLING_MODES.find((m) => m.value === "s4")!.legs).toBe(3);
    expect(SLING_MODES.find((m) => m.value === "wrap")!.legs).toBe(3);
    const out = run({ construction: "6x24A", loadKg: 3000, mode: "s4", angle: "0", diameter: "16" });
    expect(out.steps.join("\n")).toContain("有効本数3");
    expect(out.warnings.join("\n")).toContain("有効本数3本");
  });

  it("2本4点半掛けは4点扱い（有効本数4）", () => {
    expect(SLING_MODES.find((m) => m.value === "half")!.legs).toBe(4);
  });

  it("目通し（絞り）は強度25%減（効率0.75）", () => {
    const choke = SLING_MODES.find((m) => m.value === "choke")!;
    expect(choke.strengthK).toBe(0.75);
    expect(choke.legs).toBe(1);
    // 1本垂直(効率1.0)より目通し(0.75)の方が安全係数が低い
    const w = 500;
    const sfV1 = safetyFactorFor({ breakingKn: 47, loadKg: w, mode: SLING_MODES.find((m) => m.value === "v1")!, angleDeg: 0, ddEff: 1 });
    const sfChoke = safetyFactorFor({ breakingKn: 47, loadKg: w, mode: choke, angleDeg: 0, ddEff: 1 });
    expect(sfChoke).toBeCloseTo(sfV1 * 0.75, 5);
  });

  it("吊り角度60°超に強警告（張力急増）", () => {
    const out = run({ construction: "6x24A", loadKg: 1000, mode: "s2", angle: "120", diameter: "12" });
    // T = 1000/2 ÷ cos(60°) = 500/0.5 = 1000kg
    expect(out.items.find((i) => i.label.includes("張力"))?.value).toContain("1,000kg");
    expect(out.warnings.join("\n")).toContain("60°を超える");
  });
});

describe("sling-wire-load: D/d比の曲げ効率（安全側にのみ働く）", () => {
  it("効率は1.0以下・D/dが小さいほど下がる", () => {
    expect(DD_BENDING_EFFICIENCY.none).toBe(1.0);
    expect(DD_BENDING_EFFICIENCY["10"]).toBeLessThan(DD_BENDING_EFFICIENCY["15"]);
    expect(DD_BENDING_EFFICIENCY["2"]).toBeLessThan(DD_BENDING_EFFICIENCY["6"]);
  });
  it("D/d比を考慮すると安全係数が下がる（切断荷重を割り引く）", () => {
    const noDd = run({ construction: "6x24A", loadKg: 2000, mode: "s2", angle: "60", diameter: "16", dd: "none" });
    const dd10 = run({ construction: "6x24A", loadKg: 2000, mode: "s2", angle: "60", diameter: "16", dd: "10" });
    expect(Number(dd10.value)).toBeLessThan(Number(noDd.value));
    // 120×0.85×2×0.866 / (2000×g/1000) = 9.007 → 表示は切り捨て "9"
    expect(dd10.value).toBe("9");
  });
});

describe("sling-wire-load: 逆引きモード（荷重・条件 → 適合径）", () => {
  it("3tを目通し（絞り）で吊る適合径 = φ24（φ22では6未満）", () => {
    const out = run({ calcMode: "reverse", construction: "6x24A", loadKg: 3000, mode: "choke", angle: "0", diameter: "12" });
    expect(out.headline).toBe("適合径");
    expect(out.value).toBe("φ24");
    // 逆引きでは指定径(φ12)は無視され、条件から最小径を選ぶ
  });

  it("1.5tをあだ巻き2本4点60°で吊る適合径 = φ9（φ8では6未満）", () => {
    const out = run({ calcMode: "reverse", construction: "6x24A", loadKg: 1500, mode: "wrap", angle: "60", diameter: "30" });
    expect(out.headline).toBe("適合径");
    expect(out.value).toBe("φ9");
  });

  it("収録範囲を超える荷重は揚重計画の見直しを促す", () => {
    const out = run({ calcMode: "reverse", construction: "6x24A", loadKg: 50000, mode: "choke", angle: "0", diameter: "12" });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("収録範囲外");
    expect(out.summary).toContain("見直し");
  });
});

describe("sling-wire-load: 共通の注意", () => {
  it("常に製造者証明書の確認を促す", () => {
    const out = run({ construction: "6x24A", loadKg: 1000, mode: "s2", angle: "60", diameter: "16" });
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
