import { describe, it, expect } from "vitest";
import { cableAmpacityCalculator, IV_AMPACITY_A, CURRENT_REDUCTION } from "./cable-ampacity";
import { normalizeValues } from "../schema";

/**
 * 電線許容電流の数値固定テスト。
 * 期待値は内線規程の許容電流基準値と電流減少係数から独立に計算。
 * 例: 5.5mm²(基準49A) × 同一管3本以下(0.70) = 34.3A。
 */
const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(cableAmpacityCalculator, raw);
  expect(errors).toEqual([]);
  return cableAmpacityCalculator.compute(values);
};

describe("cable-ampacity", () => {
  it("5.5mm² 同一管3本・20A → 許容34A・許容電流内", () => {
    const out = run({ size: "5.5", install: "3", currentA: 20 });
    // 49 × 0.70 = 34.3 → 表示34A
    expect(out.value).toBe("34");
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("許容電流内");
  });

  it("5.5mm² 同一管3本・40A → 許容34Aを超過", () => {
    const out = run({ size: "5.5", install: "3", currentA: 40 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("許容超過");
  });

  it("がいし引き単独は低減なし（14mm² = 88A）", () => {
    const out = run({ size: "14", install: "air", currentA: 50 });
    expect(out.value).toBe("88");
    expect(out.tone).toBe("safe");
  });

  it("電線数が増えると電流減少係数が下がる", () => {
    expect(CURRENT_REDUCTION["3"].factor).toBe(0.7);
    expect(CURRENT_REDUCTION["4"].factor).toBe(0.63);
    expect(CURRENT_REDUCTION["6"].factor).toBe(0.56);
    expect(CURRENT_REDUCTION["15"].factor).toBe(0.49);
  });

  it("基準許容電流（内線規程 代表値）", () => {
    expect(IV_AMPACITY_A["5.5"].amp).toBe(49);
    expect(IV_AMPACITY_A["14"].amp).toBe(88);
    expect(IV_AMPACITY_A["22"].amp).toBe(115);
  });

  it("安衛則（停電・近接作業）の結線注意を含む", () => {
    const out = run({ size: "5.5", install: "3", currentA: 20 });
    expect(out.warnings.join("\n")).toContain("339条");
    expect(out.warnings.join("\n")).toContain("349条");
  });
});
