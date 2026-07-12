import { describe, it, expect } from "vitest";
import { soilVolumeConversionCalculator, resolveChangeRates, SOIL_CHANGE_RATES } from "./soil-volume-conversion";
import { normalizeValues } from "../schema";

/**
 * 土量換算の数値固定テスト。
 * 期待値は L・C の定義（ほぐし=地山×L, 締固め=地山×C）から独立に手計算。
 */
const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(soilVolumeConversionCalculator, raw);
  expect(errors).toEqual([]);
  return soilVolumeConversionCalculator.compute(values);
};
const item = (out: ReturnType<typeof run>, kw: string) =>
  out.items.find((i) => i.label.includes(kw))!.value;

describe("soil-volume-conversion", () => {
  it("砂質土 地山100m³ → ほぐし120・締固め90・ダンプ22台", () => {
    const out = run({ soil: "sand", baseState: "natural", volume: 100, dumpCapacity: 5.5 });
    expect(item(out, "地山土量")).toBe("100m³");
    expect(item(out, "ほぐし土量")).toBe("120m³"); // 100×1.20
    expect(item(out, "締固め土量")).toBe("90m³"); // 100×0.90
    // 120 / 5.5 = 21.8 → 切り上げ22
    expect(item(out, "ダンプ")).toBe("約22台");
  });

  it("ほぐし土量120m³から地山を逆算（砂 L1.2）→ 地山100m³", () => {
    const out = run({ soil: "sand", baseState: "loose", volume: 120, dumpCapacity: 5.5 });
    expect(item(out, "地山土量")).toBe("100m³");
  });

  it("締固め土量90m³から地山を逆算（砂 C0.9）→ 地山100m³", () => {
    const out = run({ soil: "sand", baseState: "compacted", volume: 90, dumpCapacity: 5.5 });
    expect(item(out, "地山土量")).toBe("100m³");
  });

  it("手入力の L・C を使う", () => {
    const r = resolveChangeRates("custom", 1.35, 0.85);
    expect(r.L).toBe(1.35);
    expect(r.C).toBe(0.85);
    const out = run({ soil: "custom", baseState: "natural", volume: 200, customL: 1.35, customC: 0.85, dumpCapacity: 6 });
    expect(item(out, "ほぐし土量")).toBe("270m³"); // 200×1.35
    expect(item(out, "締固め土量")).toBe("170m³"); // 200×0.85
  });

  it("土質区分の代表値（定義域）", () => {
    expect(SOIL_CHANGE_RATES.sand.L).toBe(1.2);
    expect(SOIL_CHANGE_RATES.hard_rock.C).toBe(1.3);
  });

  it("変化率が参考値である注意を必ず含む", () => {
    const out = run({ soil: "sand", baseState: "natural", volume: 100, dumpCapacity: 5.5 });
    expect(out.warnings.join("\n")).toContain("参考代表値");
  });

  it("ダンプ切り上げの境界（ちょうど割り切れる）", () => {
    // ほぐし110 → 110/5.5 = 20 ちょうど
    const out = run({ soil: "custom", baseState: "loose", volume: 110, customL: 1.2, customC: 0.9, dumpCapacity: 5.5 });
    expect(item(out, "ダンプ")).toBe("約20台");
  });
});
