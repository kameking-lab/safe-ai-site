import { describe, expect, it } from "vitest";
import {
  detectChemicalWork,
  chemicalRaHref,
} from "@/lib/chemical/work-chemical-hints";

describe("detectChemicalWork", () => {
  it("空・無関係な作業は matched=false", () => {
    expect(detectChemicalWork("").matched).toBe(false);
    expect(detectChemicalWork(null).matched).toBe(false);
    expect(detectChemicalWork(undefined).matched).toBe(false);
    expect(detectChemicalWork("足場の組立").matched).toBe(false);
    expect(detectChemicalWork("鉄筋の配筋作業").matched).toBe(false);
  });

  it("塗装作業を検出し有機溶剤を提案", () => {
    const h = detectChemicalWork("外壁の塗装作業");
    expect(h.matched).toBe(true);
    expect(h.keywords).toContain("塗装");
    expect(h.suggestedQuery).toBe("有機溶剤");
  });

  it("溶接作業を検出し溶接ヒュームを提案", () => {
    const h = detectChemicalWork("鉄骨の溶接");
    expect(h.matched).toBe(true);
    expect(h.suggestedQuery).toBe("溶接ヒューム");
  });

  it("複数キーワードを重複排除して列挙", () => {
    const h = detectChemicalWork("塗装と溶接、その後に洗浄");
    expect(h.matched).toBe(true);
    expect(h.keywords).toEqual(Array.from(new Set(h.keywords)));
    expect(h.keywords.length).toBeGreaterThanOrEqual(3);
    // 先頭マッチ（塗装）の物質が提案される
    expect(h.suggestedQuery).toBe("有機溶剤");
  });

  it("石綿・はんだ等の特定作業も検出", () => {
    expect(detectChemicalWork("吹付け石綿の除去").suggestedQuery).toBe("石綿");
    expect(detectChemicalWork("基板のはんだ付け").suggestedQuery).toBe("鉛");
  });

  it("chemicalRaHref は suggestedQuery を name= に付与", () => {
    const h = detectChemicalWork("塗装作業");
    expect(chemicalRaHref(h)).toBe("/chemical-ra?name=%E6%9C%89%E6%A9%9F%E6%BA%B6%E5%89%A4");
    expect(chemicalRaHref({ matched: false, keywords: [], suggestedQuery: null })).toBe("/chemical-ra");
  });
});
