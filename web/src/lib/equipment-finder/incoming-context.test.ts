import { describe, it, expect } from "vitest";
import {
  resolveRecommendedCategories,
  firstValidCategoryId,
  initialAnswersForCategory,
} from "./incoming-context";

describe("resolveRecommendedCategories", () => {
  it("実在カテゴリのみを優先順位を保って返す", () => {
    const r = resolveRecommendedCategories(["gas-mask", "gloves", "goggles"]);
    expect(r.map((c) => c.id)).toEqual(["gas-mask", "gloves", "goggles"]);
  });

  it("存在しないIDは除外する（捏造カテゴリを出さない）", () => {
    const r = resolveRecommendedCategories(["gas-mask", "does-not-exist", "gloves"]);
    expect(r.map((c) => c.id)).toEqual(["gas-mask", "gloves"]);
  });

  it("重複IDは最初の1件のみにする", () => {
    const r = resolveRecommendedCategories(["gloves", "gloves", "goggles"]);
    expect(r.map((c) => c.id)).toEqual(["gloves", "goggles"]);
  });

  it("空配列・全て無効なら空配列", () => {
    expect(resolveRecommendedCategories([])).toEqual([]);
    expect(resolveRecommendedCategories(["nope", "也無い"])).toEqual([]);
  });

  it("解決したカテゴリは label/icon を持つ（チップ表示用）", () => {
    const [first] = resolveRecommendedCategories(["gas-mask"]);
    expect(first.label).toBeTruthy();
    expect(first.icon).toBeTruthy();
  });
});

describe("firstValidCategoryId", () => {
  it("先頭の有効カテゴリIDを返す", () => {
    expect(firstValidCategoryId(["gloves", "gas-mask"])).toBe("gloves");
  });

  it("先頭が無効でも次の有効カテゴリを返す", () => {
    expect(firstValidCategoryId(["bogus", "gas-mask"])).toBe("gas-mask");
  });

  it("有効カテゴリが無ければ null", () => {
    expect(firstValidCategoryId([])).toBeNull();
    expect(firstValidCategoryId(["bogus"])).toBeNull();
  });
});

describe("initialAnswersForCategory", () => {
  it("防毒マスク＋吸収缶指定で gasType を初期選択", () => {
    expect(initialAnswersForCategory("gas-mask", "有機ガス")).toEqual({ gasType: "有機ガス" });
    expect(initialAnswersForCategory("gas-mask", "アンモニア")).toEqual({ gasType: "アンモニア" });
  });

  it("防毒マスクでも吸収缶不明なら空（誤った初期値を入れない）", () => {
    expect(initialAnswersForCategory("gas-mask", undefined)).toEqual({});
  });

  it("防毒マスク以外は吸収缶があっても空（他カテゴリへ持ち込まない）", () => {
    expect(initialAnswersForCategory("gloves", "有機ガス")).toEqual({});
    expect(initialAnswersForCategory("goggles", "ハロゲン")).toEqual({});
  });
});
