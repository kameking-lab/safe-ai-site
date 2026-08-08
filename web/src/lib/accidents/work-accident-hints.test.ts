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
    expect(h.query).toBe("運搬");
  });

  it("代表キーワードを抽出", () => {
    const h = detectAccidentWork("足場での溶接作業");
    expect(h.keywords).toContain("足場");
    expect(h.keywords).toContain("溶接");
  });

  it("許可語のない自由本文をqueryへ保持しない", () => {
    const h = detectAccidentWork("株式会社東都の田中さんが新宿三丁目で作業");
    expect(h.matched).toBe(true);
    expect(h.query).toBe("");
    expect(accidentsHref(h)).toBe("/accidents?tab=list");
  });

  it("PF-009: サイト内事故検索へ許可済み分類語だけを渡す", () => {
    const h = detectAccidentWork("外壁塗装");
    expect(accidentsHref(h)).toBe(
      "/accidents?tab=list&acc_kw=%E5%A1%97%E8%A3%85#accident-results",
    );
    expect(accidentsHref({ matched: false, keywords: [], query: "" })).toBe(
      "/accidents?tab=list",
    );
  });

  it("氏名・会社名・現場名を分類語と一緒にURLへ混ぜない", () => {
    const sensitive = "株式会社東都の田中太郎が新宿三丁目の足場で溶接";
    const href = accidentsHref(detectAccidentWork(sensitive));
    expect(decodeURIComponent(href)).toContain("acc_kw=足場");
    expect(decodeURIComponent(href)).not.toMatch(/株式会社|田中太郎|新宿三丁目|溶接/);
  });
});
