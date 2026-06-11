import { describe, expect, it } from "vitest";
import { ALL_ACCIDENT_TYPES } from "@/lib/types/domain";
import { ACCIDENT_TYPE_GLYPH, ACCIDENT_TYPE_SHORT } from "./accident-pictogram-map";

describe("accident-pictogram-map", () => {
  it("厚労省「事故の型」22分類すべてにグリフが割り当てられている", () => {
    expect(ALL_ACCIDENT_TYPES).toHaveLength(22);
    for (const type of ALL_ACCIDENT_TYPES) {
      expect(ACCIDENT_TYPE_GLYPH[type], `${type} のグリフ`).toBeTruthy();
    }
  });

  it("グリフは型ごとに一意（色＋形で型が判別できる）", () => {
    const glyphs = ALL_ACCIDENT_TYPES.map((t) => ACCIDENT_TYPE_GLYPH[t]);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("短ラベルは全型にあり、タイルに収まる長さ（7文字以内）", () => {
    for (const type of ALL_ACCIDENT_TYPES) {
      const short = ACCIDENT_TYPE_SHORT[type];
      expect(short, `${type} の短ラベル`).toBeTruthy();
      expect(short.length, `${type} の短ラベル長`).toBeLessThanOrEqual(7);
    }
  });

  it("代表的な型の割り当てが現場の連想と一致（ピン留め）", () => {
    expect(ACCIDENT_TYPE_GLYPH["墜落"]).toBe("fall-person");
    expect(ACCIDENT_TYPE_GLYPH["はさまれ・巻き込まれ"]).toBe("caught");
    expect(ACCIDENT_TYPE_GLYPH["感電"]).toBe("electric");
    expect(ACCIDENT_TYPE_GLYPH["熱中症"]).toBe("heat-stroke");
  });
});
