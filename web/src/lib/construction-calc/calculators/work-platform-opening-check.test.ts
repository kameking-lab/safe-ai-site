import { describe, it, expect } from "vitest";
import { workPlatformOpeningCheckCalculator, PLATFORM_LIMITS } from "./work-platform-opening-check";
import { normalizeValues } from "../schema";

/**
 * 作業床・開口部チェックの数値固定テスト。
 * 期待値は安衛則563条1項2号（40cm・3cm・12cm）・552条1項4号の定義準用（85cm・35〜50cm）の
 * 条文値そのもの。境界は「以上/以下/未満」に厳密に従う。
 */
describe("work-platform-opening-check: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(workPlatformOpeningCheckCalculator, raw);
    expect(errors).toEqual([]);
    return workPlatformOpeningCheckCalculator.compute(values);
  };

  it("標準的な値はすべて適合", () => {
    const out = run({});
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
  });

  it("境界値: 幅ちょうど40cmは適合・39cmは不適合（563条1項2号イ）", () => {
    expect(run({ platformWidthCm: PLATFORM_LIMITS.minWidthCm }).tone).toBe("safe");
    expect(run({ platformWidthCm: 39 }).tone).toBe("danger");
  });

  it("境界値: 床材間隙間ちょうど3cmは適合・3.1cmは不適合（563条1項2号ロ）", () => {
    expect(run({ boardGapCm: PLATFORM_LIMITS.maxBoardGapCm }).tone).toBe("safe");
    expect(run({ boardGapCm: 3.1 }).tone).toBe("danger");
  });

  it("境界値: 建地隙間はちょうど12cmで不適合（未満のみ適合）・11.9cmは適合（563条1項2号ハ）", () => {
    expect(run({ postGapCm: PLATFORM_LIMITS.maxPostGapCm }).tone).toBe("danger");
    expect(run({ postGapCm: 11.9 }).tone).toBe("safe");
  });

  it("境界値: 手すりちょうど85cmは適合・84cmは不適合（552条1項4号イの定義準用）", () => {
    expect(run({ handrailHeightCm: PLATFORM_LIMITS.minHandrailHeightCm }).tone).toBe("safe");
    expect(run({ handrailHeightCm: 84 }).tone).toBe("danger");
  });

  it("境界値: 中桟は35cm・50cmの範囲内で適合、範囲外で不適合（552条1項4号ロの定義準用）", () => {
    expect(run({ midRailHeightCm: PLATFORM_LIMITS.midRailMinCm }).tone).toBe("safe");
    expect(run({ midRailHeightCm: PLATFORM_LIMITS.midRailMaxCm }).tone).toBe("safe");
    expect(run({ midRailHeightCm: 34 }).tone).toBe("danger");
    expect(run({ midRailHeightCm: 51 }).tone).toBe("danger");
  });

  it("開口部の囲い未設置は不適合（519条）", () => {
    expect(run({ openingGuardInstalled: "none" }).tone).toBe("danger");
  });

  it("複数項目が基準外の例は不適合項目数を返す", () => {
    const out = run({ platformWidthCm: 30, boardGapCm: 5, postGapCm: 15, handrailHeightCm: 70, midRailHeightCm: 25, openingGuardInstalled: "none" });
    expect(out.tone).toBe("danger");
    expect(out.value).toBe("6");
  });

  it("518条の作業床設置義務・563条1項6号の幅木等・単管足場チェックとの併用を常に警告する", () => {
    const out = run({});
    const w = out.warnings.join("\n");
    expect(w).toContain("518条");
    expect(w).toContain("幅木");
    expect(w).toContain("単管足場チェック");
  });
});

describe("work-platform-opening-check: 入力正規化", () => {
  it("数値でない幅は既定値へ", () => {
    const { values, errors } = normalizeValues(workPlatformOpeningCheckCalculator, { platformWidthCm: "せまい" });
    expect(values.platformWidthCm).toBe(45);
    expect(errors.length).toBe(1);
  });
});
