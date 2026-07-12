import { describe, it, expect } from "vitest";
import { chainSlingLoadCalculator, CHAIN_LEGS_MODES, CHAIN_SAFETY_FACTORS } from "./chain-sling-load";
import { normalizeValues, STANDARD_GRAVITY } from "../schema";

/**
 * つりチェーン安全係数計算の数値固定テスト。
 * 期待値はクレーン則第213条の2の式（安全係数 = 切断荷重 ÷ 張力）から独立に手計算した値で固定する。
 * 張力 T = 荷重 ÷ 有効本数 ÷ cos(θ/2) は玉掛けワイヤ（sling-wire-load）と同じ式・関数を再利用する。
 */

const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(chainSlingLoadCalculator, raw);
  expect(errors).toEqual([]);
  return chainSlingLoadCalculator.compute(values);
};

describe("chain-sling-load: 掛け方の定義", () => {
  it("3点/4点つりは有効本数3で算定する（sling-wire-load と同じ安全側の考え方）", () => {
    const mode = CHAIN_LEGS_MODES.find((m) => m.value === "s34")!;
    expect(mode.legs).toBe(3);
  });
  it("安全係数の選択肢は5と4のみ", () => {
    expect(CHAIN_SAFETY_FACTORS["5"]).toBe(5);
    expect(CHAIN_SAFETY_FACTORS["4"]).toBe(4);
  });
});

describe("chain-sling-load: 垂直1本つり（角度無関係）", () => {
  it("張力は荷重そのもの（cos=1）", () => {
    const out = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 60, safety: "5" });
    expect(out.items.find((i) => i.label.includes("張力"))?.value).toContain("1,000kg");
  });

  it("安全係数5以上で使用可（切断荷重60kN・張力9.80665kN → 約6.12）", () => {
    const out = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 60, safety: "5" });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("使用可");
    expect(Number(out.value)).toBeGreaterThan(5);
    expect(Number(out.value)).toBeCloseTo(60 / (1000 * STANDARD_GRAVITY / 1000), 1);
  });

  it("安全係数5未満は使用不可（切断荷重30kN → 約3.06）", () => {
    const out = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 30, safety: "5" });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("使用不可");
    expect(Number(out.value)).toBeLessThan(5);
  });

  it("同じ切断荷重45kNでも安全係数の選択で判定が変わる（5未満だが4以上）", () => {
    const withFive = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 45, safety: "5" });
    const withFour = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 45, safety: "4" });
    expect(Number(withFive.value)).toBeCloseTo(Number(withFour.value), 5);
    expect(withFive.tone).toBe("danger"); // 4.59 < 5
    expect(withFour.tone).toBe("safe"); // 4.59 >= 4
  });

  it("安全係数4選択時は条件①②の強警告を出す", () => {
    const out = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 45, safety: "4" });
    expect(out.warnings.join("\n")).toContain("0.5%");
    expect(out.warnings.join("\n")).toContain("10%");
  });
});

describe("chain-sling-load: 2本つり60°", () => {
  it("張力 = (荷重/2) ÷ cos(30°)（約577kg・5.66kN）", () => {
    const out = run({ loadKg: 1000, legs: "s2", angle: "60", breakingLoadKn: 40, safety: "5" });
    const tensionItem = out.items.find((i) => i.label.includes("張力"))!.value;
    expect(tensionItem).toContain("577kg");
  });

  it("切断荷重40kNなら安全係数5以上で使用可（約7.07）", () => {
    const out = run({ loadKg: 1000, legs: "s2", angle: "60", breakingLoadKn: 40, safety: "5" });
    expect(out.tone).toBe("safe");
    expect(Number(out.value)).toBeGreaterThan(5);
  });

  it("切断荷重20kNは使用不可（約3.53、4未満）", () => {
    const out = run({ loadKg: 1000, legs: "s2", angle: "60", breakingLoadKn: 20, safety: "4" });
    expect(out.tone).toBe("danger");
    expect(Number(out.value)).toBeLessThan(4);
  });

  it("吊り角度60°超は強警告", () => {
    const out = run({ loadKg: 1000, legs: "s2", angle: "90", breakingLoadKn: 60, safety: "5" });
    expect(out.warnings.join("\n")).toContain("60°を超える");
  });
});

describe("chain-sling-load: 3点/4点つり", () => {
  it("有効本数3として算定し、警告文にも明記する", () => {
    const out = run({ loadKg: 2000, legs: "s34", angle: "0", breakingLoadKn: 40, safety: "4" });
    const tensionKgf = 2000 / 3; // cos(0)=1
    expect(out.items.find((i) => i.label.includes("張力"))?.value).toContain(
      `${Math.round(tensionKgf)}kg`,
    );
    expect(out.warnings.join("\n")).toContain("有効本数3本");
  });
});

describe("chain-sling-load: 切断荷重の未入力", () => {
  it("切断荷重0は入力を促す警告付きで使用不可", () => {
    const out = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 0, safety: "5" });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("切断荷重を入力してください");
  });
});

describe("chain-sling-load: 共通の注意", () => {
  it("玉掛け技能講習・点検・不適格品の使用禁止に触れる", () => {
    const out = run({ loadKg: 1000, legs: "v1", angle: "0", breakingLoadKn: 60, safety: "5" });
    expect(out.warnings.join("\n")).toContain("玉掛け技能講習");
    expect(out.warnings.join("\n")).toContain("証明書");
  });
});

describe("chain-sling-load: 入力正規化", () => {
  it("範囲外の荷重は既定値へ戻しエラーを返す", () => {
    const { values, errors } = normalizeValues(chainSlingLoadCalculator, { loadKg: 1 });
    expect(values.loadKg).toBe(1000);
    expect(errors.length).toBe(1);
  });
  it("選択肢外の安全係数は既定値(5)へ戻す", () => {
    const { values, errors } = normalizeValues(chainSlingLoadCalculator, { safety: "3" });
    expect(values.safety).toBe("5");
    expect(errors.length).toBe(1);
  });
});
