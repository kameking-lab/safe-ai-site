import { describe, expect, it } from "vitest";
import {
  SAFETY_SIGNS,
  SIGN_CATEGORIES,
  SIGN_COUNT_BY_CATEGORY,
  SIGN_TOTAL_COUNT,
  getCategoryDescriptor,
  getQuarantinedSafetySignCategoryCount,
  getQuarantinedSafetySignCount,
  getSignById,
  getSignsByCategory,
  getSignsForIndustry,
} from ".";
import { INDUSTRIES, getIndustrySigns } from "./industry-usage";

describe("safety sign publication quarantine", () => {
  it("未検証の旧110件と5カテゴリを公開allowlistへ混入させない", () => {
    expect(getQuarantinedSafetySignCount()).toBe(110);
    expect(getQuarantinedSafetySignCategoryCount()).toBe(5);
    expect(SAFETY_SIGNS).toEqual([]);
    expect(SIGN_CATEGORIES).toEqual([]);
    expect(SIGN_TOTAL_COUNT).toBe(0);
    expect(SIGN_COUNT_BY_CATEGORY).toEqual({
      prohibition: 0,
      warning: 0,
      mandatory: 0,
      "safe-condition": 0,
      "fire-safety": 0,
    });
  });

  it("旧ID・カテゴリを公開検索関数で解決しない", () => {
    expect(getSignById("no-entry")).toBeUndefined();
    expect(getSignsByCategory("prohibition")).toEqual([]);
    expect(getSignsForIndustry("construction")).toEqual([]);
    expect(() => getCategoryDescriptor("prohibition")).toThrow(
      "Unknown sign category",
    );
  });

  it("業種別投影も公開標識が空なら常に空を返す", () => {
    expect(INDUSTRIES.length).toBeGreaterThan(0);
    for (const industry of INDUSTRIES) {
      expect(getIndustrySigns(industry.id)).toEqual([]);
      expect(getSignsForIndustry(industry.id)).toEqual([]);
    }
  });
});
