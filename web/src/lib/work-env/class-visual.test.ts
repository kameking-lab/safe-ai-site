import { describe, expect, it } from "vitest";
import {
  MANAGEMENT_CLASS_ORDER,
  MANAGEMENT_CLASS_VISUAL,
  managementClassMarkerPercent,
} from "./class-visual";

describe("MANAGEMENT_CLASS_VISUAL（色文法の固定）", () => {
  it("第1=緑 / 第2=黄 / 第3=赤 の文法", () => {
    expect(MANAGEMENT_CLASS_VISUAL[1].chip).toContain("emerald");
    expect(MANAGEMENT_CLASS_VISUAL[2].chip).toContain("amber");
    expect(MANAGEMENT_CLASS_VISUAL[3].chip).toContain("rose");
  });

  it("ラベルと次アクションが法令の語彙と一致する", () => {
    expect(MANAGEMENT_CLASS_VISUAL[1].label).toBe("第1管理区分");
    expect(MANAGEMENT_CLASS_VISUAL[2].label).toBe("第2管理区分");
    expect(MANAGEMENT_CLASS_VISUAL[3].label).toBe("第3管理区分");
    expect(MANAGEMENT_CLASS_VISUAL[2].shortAction).toContain("3ヶ月以内");
    expect(MANAGEMENT_CLASS_VISUAL[3].shortAction).toContain("直ちに");
    expect(MANAGEMENT_CLASS_VISUAL[3].shortAction).toContain("呼吸用保護具");
  });

  it("WCAG AA: amber/orange の 400-500番台 + 白文字を使わない（第2回監査指摘の複製防止）", () => {
    for (const cls of MANAGEMENT_CLASS_ORDER) {
      const chip = MANAGEMENT_CLASS_VISUAL[cls].chip;
      if (chip.includes("text-white")) {
        expect(chip).not.toMatch(/bg-(amber|orange)-(300|400|500)/);
      }
    }
    // 黄は「黄地に黒系文字」（JIS現物標識と同じ組み合わせ）
    expect(MANAGEMENT_CLASS_VISUAL[2].chip).toContain("text-amber-950");
  });

  it("マーカー位置は3等分セグメントの中央", () => {
    expect(managementClassMarkerPercent(1)).toBeCloseTo(16.7, 1);
    expect(managementClassMarkerPercent(2)).toBeCloseTo(50, 1);
    expect(managementClassMarkerPercent(3)).toBeCloseTo(83.3, 1);
  });
});
