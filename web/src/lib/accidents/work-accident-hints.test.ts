import { describe, expect, it } from "vitest";
import { detectAccidentWork, accidentsHref } from "@/lib/accidents/work-accident-hints";

describe("detectAccidentWork", () => {
  it("空・1文字は matched=false", () => {
    expect(detectAccidentWork("").matched).toBe(false);
    expect(detectAccidentWork("a").matched).toBe(false);
    expect(detectAccidentWork(null).matched).toBe(false);
  });

  it("作業内容があれば matched=true（労災は全作業に関係）", () => {
    const h = detectAccidentWork("資材の運搬");
    expect(h.matched).toBe(true);
    expect(h.query).toBe("資材の運搬");
  });

  it("代表キーワードを抽出", () => {
    const h = detectAccidentWork("足場での溶接作業");
    expect(h.keywords).toContain("足場");
    expect(h.keywords).toContain("溶接");
  });

  it("query は60字まで", () => {
    const h = detectAccidentWork("あ".repeat(100));
    expect(h.query.length).toBe(60);
  });

  it("accidentsHref は work クエリ付き", () => {
    const h = detectAccidentWork("外壁塗装");
    expect(accidentsHref(h)).toBe("/accidents?work=%E5%A4%96%E5%A3%81%E5%A1%97%E8%A3%85");
    expect(accidentsHref({ matched: false, keywords: [], query: "" })).toBe("/accidents");
  });
});
