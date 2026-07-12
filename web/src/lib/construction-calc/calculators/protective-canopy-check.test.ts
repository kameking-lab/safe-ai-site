import { describe, it, expect } from "vitest";
import {
  protectiveCanopyCheckCalculator,
  elevationAngleDeg,
  canopyRequired,
  requiredStages,
  CANOPY_LIMITS,
} from "./protective-canopy-check";
import { normalizeValues } from "../schema";

/**
 * 防護棚（朝顔）設置基準チェックの数値固定テスト。
 * 期待値は建設工事公衆災害防止対策要綱（建築工事等編）第28条の条文の区分そのもの
 * （国土交通省 mlit.go.jp 一次資料PDFの条文本文から確認: 10m/20m・10m以内・2m・20度・75度・5m）。
 */
describe("protective-canopy-check: elevationAngleDeg / canopyRequired（要綱28条本文のトリガー）", () => {
  it("ふ角がちょうど75度なら非該当（「超える」は厳密に超過のみ）", () => {
    const roadDistanceM = 10;
    const height = Math.tan((75 * Math.PI) / 180) * roadDistanceM; // ちょうど75°
    expect(elevationAngleDeg(height, roadDistanceM)).toBeCloseTo(75, 6);
    expect(canopyRequired(height, roadDistanceM)).toBe(false);
  });

  it("ふ角が75度をわずかに超えると該当", () => {
    const roadDistanceM = 10;
    const height = Math.tan((75.5 * Math.PI) / 180) * roadDistanceM;
    expect(canopyRequired(height, roadDistanceM)).toBe(true);
  });

  it("水平距離ちょうど5mは該当（以内）・5.01mかつ低角度は非該当", () => {
    expect(canopyRequired(1, 5)).toBe(true);
    expect(canopyRequired(1, 5.01)).toBe(false);
  });
});

describe("protective-canopy-check: requiredStages（要綱28条1号）", () => {
  it("非該当なら常に0段", () => {
    expect(requiredStages(30, false)).toBe(0);
  });

  it("該当時: 高さ10m未満→0 / 10m以上→1段 / 20m以上→2段（境界は「以上」で厳密に）", () => {
    expect(requiredStages(9.99, true)).toBe(0);
    expect(requiredStages(10, true)).toBe(1);
    expect(requiredStages(19.99, true)).toBe(1);
    expect(requiredStages(20, true)).toBe(2);
  });
});

describe("protective-canopy-check: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(protectiveCanopyCheckCalculator, raw);
    expect(errors).toEqual([]);
    return protectiveCanopyCheckCalculator.compute(values);
  };

  it("非該当（隣地20m）は基準適合として非該当を返す", () => {
    const out = run({ height: 15, roadDistanceM: 20, canopyWidthM: 2, canopyAngleDeg: 20 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("設置基準 非該当");
    expect(out.value).toBe("—");
  });

  it("該当・高さ25m・幅2.5m/角度20° → 2段以上必要で基準適合", () => {
    const out = run({ height: 25, roadDistanceM: 3, canopyWidthM: 2.5, canopyAngleDeg: 20 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
    expect(out.value).toBe("2");
  });

  it("該当・高さ8m（10m未満）→ 段数の定めなしで要注意", () => {
    const out = run({ height: 8, roadDistanceM: 2, canopyWidthM: 2, canopyAngleDeg: 20 });
    expect(out.tone).toBe("warning");
    expect(out.headline).toContain("段数の定めなし");
    expect(out.warnings.join("\n")).toContain("27条3項");
  });

  it("該当・幅1.9m（基準2m未満）→ 不適合", () => {
    const out = run({ height: 25, roadDistanceM: 3, canopyWidthM: 1.9, canopyAngleDeg: 20 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("基準不適合");
  });

  it("該当・角度19度（基準20度未満）→ 不適合", () => {
    const out = run({ height: 25, roadDistanceM: 3, canopyWidthM: 2.5, canopyAngleDeg: 19 });
    expect(out.tone).toBe("danger");
  });

  it("境界値: 幅ちょうど2m・角度ちょうど20度は適合", () => {
    const out = run({
      height: 25,
      roadDistanceM: 3,
      canopyWidthM: CANOPY_LIMITS.minWidthM,
      canopyAngleDeg: CANOPY_LIMITS.minAngleDeg,
    });
    expect(out.tone).toBe("safe");
  });

  it("該当時は最下段位置・すき間耐力・上乗せ条例の警告を含む", () => {
    const out = run({ height: 25, roadDistanceM: 3, canopyWidthM: 2.5, canopyAngleDeg: 20 });
    const w = out.warnings.join("\n");
    expect(w).toContain("10m以内");
    expect(w).toContain("上乗せ");
  });
});

describe("protective-canopy-check: 入力正規化", () => {
  it("数値でない高さは既定値へ", () => {
    const { values, errors } = normalizeValues(protectiveCanopyCheckCalculator, { height: "たかい" });
    expect(values.height).toBe(15);
    expect(errors.length).toBe(1);
  });
});
