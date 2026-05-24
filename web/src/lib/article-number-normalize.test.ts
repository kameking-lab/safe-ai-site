import { describe, it, expect } from "vitest";
import {
  kanjiToArabic,
  normalizeKanjiNumbers,
  parseArticleNum,
  refToKey,
  normalizeArticleNumToKey,
  canonicalArticleLabel,
} from "./article-number-normalize";

describe("kanjiToArabic", () => {
  it("converts single-digit kanji", () => {
    expect(kanjiToArabic("一")).toBe("1");
    expect(kanjiToArabic("九")).toBe("9");
    expect(kanjiToArabic("〇")).toBe("0");
  });

  it("converts compound forms with 十", () => {
    expect(kanjiToArabic("十")).toBe("10");
    expect(kanjiToArabic("二十一")).toBe("21");
    expect(kanjiToArabic("九十九")).toBe("99");
  });

  it("converts compound forms with 百 / 千", () => {
    expect(kanjiToArabic("百")).toBe("100");
    expect(kanjiToArabic("百二十三")).toBe("123");
    expect(kanjiToArabic("千五百")).toBe("1500");
    expect(kanjiToArabic("六百十二")).toBe("612");
  });

  it("returns original for non-numeric inputs", () => {
    expect(kanjiToArabic("条")).toBe("条");
  });
});

describe("normalizeKanjiNumbers", () => {
  it("replaces kanji segments in mixed text", () => {
    expect(normalizeKanjiNumbers("第二十一条")).toBe("第21条");
    expect(normalizeKanjiNumbers("第六十六条の八")).toBe("第66条の8");
    expect(normalizeKanjiNumbers("第百五十一条の七十四")).toBe("第151条の74");
  });

  it("preserves non-numeric characters", () => {
    expect(normalizeKanjiNumbers("第二十一条第三項第五号")).toBe(
      "第21条第3項第5号"
    );
  });
});

describe("parseArticleNum", () => {
  it("parses plain articles", () => {
    expect(parseArticleNum("第21条")).toEqual({ article: 21 });
    expect(parseArticleNum("21条")).toEqual({ article: 21 });
  });

  it("parses branch numbers", () => {
    expect(parseArticleNum("第151条の74")).toEqual({
      article: 151,
      branch: 74,
    });
    expect(parseArticleNum("第66条の8")).toEqual({ article: 66, branch: 8 });
  });

  it("parses paragraph and item", () => {
    expect(parseArticleNum("第61条第1項第3号")).toEqual({
      article: 61,
      paragraph: 1,
      item: 3,
    });
  });

  it("accepts kanji input", () => {
    expect(parseArticleNum("第百五十一条の七十四")).toEqual({
      article: 151,
      branch: 74,
    });
    expect(parseArticleNum("第六十一条第一項第三号")).toEqual({
      article: 61,
      paragraph: 1,
      item: 3,
    });
  });

  it("returns undefined for non-article strings", () => {
    expect(parseArticleNum("")).toBeUndefined();
    expect(parseArticleNum("条文なし")).toBeUndefined();
  });
});

describe("refToKey / normalizeArticleNumToKey", () => {
  it("collapses equivalent representations to the same key", () => {
    const a = normalizeArticleNumToKey("第151条の74");
    const b = normalizeArticleNumToKey("第百五十一条の七十四");
    expect(a).toBeDefined();
    expect(a).toBe(b);
  });

  it("differentiates paragraph and item", () => {
    expect(refToKey({ article: 61 })).toBe("61---");
    expect(refToKey({ article: 61, paragraph: 1, item: 3 })).toBe("61--1-3");
  });
});

describe("canonicalArticleLabel", () => {
  it("rebuilds 第N条 / 第N条のM forms", () => {
    expect(canonicalArticleLabel({ article: 21 })).toBe("第21条");
    expect(canonicalArticleLabel({ article: 151, branch: 74 })).toBe(
      "第151条の74"
    );
  });
});
