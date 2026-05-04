import { describe, it, expect } from "vitest";
import { normalizeSearchText, fuzzyMatch, fuzzyMatchAll } from "./fuzzy-search";

describe("normalizeSearchText", () => {
  it("全角英数字を半角・小文字に正規化する", () => {
    expect(normalizeSearchText("ＡＢＣ")).toBe("abc");
    expect(normalizeSearchText("０１２")).toBe("012");
  });

  it("カタカナ長音符バリアントを ー に統一する", () => {
    expect(normalizeSearchText("コーヒー")).toBe("コーヒー");
    expect(normalizeSearchText("コ−ヒ−")).toBe("コーヒー"); // U+2212 minus
    expect(normalizeSearchText("コ‐ヒ‐")).toBe("コーヒー"); // U+2010 hyphen
  });

  it("小書きカタカナ・ひらがなを大文字に統一する", () => {
    expect(normalizeSearchText("シャベル")).toBe("シヤベル");
    expect(normalizeSearchText("ちょっと")).toBe("ちよつと");
  });

  it("濁点分離形を合成形に正規化する（NFKC）", () => {
    // U+30AB U+3099 (KA + 濁点) → U+30AC (GA)
    const decomposed = "ガ";
    expect(normalizeSearchText(decomposed)).toBe("ガ");
  });
});

describe("fuzzyMatch", () => {
  it("空クエリは常に true", () => {
    expect(fuzzyMatch("", "anything")).toBe(true);
  });

  it("部分一致を検出する", () => {
    expect(fuzzyMatch("ベンゼン", "ベンゼンの取扱い")).toBe(true);
    expect(fuzzyMatch("クレーン", "クレーン等安全規則")).toBe(true);
  });

  it("表記ゆれ（長音符）を吸収する", () => {
    expect(fuzzyMatch("クレ−ン", "クレーン等安全規則")).toBe(true);
  });

  it("全角半角・大小文字の差を吸収する", () => {
    expect(fuzzyMatch("abc", "プロジェクトＡＢＣ")).toBe(true);
    expect(fuzzyMatch("ABC", "プロジェクトＡＢＣ")).toBe(true);
  });

  it("一致しない場合は false", () => {
    expect(fuzzyMatch("酸素", "窒素ガスの危険性")).toBe(false);
  });
});

describe("fuzzyMatchAll", () => {
  it("全トークンが含まれる場合は true（AND検索）", () => {
    expect(fuzzyMatchAll("足場 安全", "足場の安全な組立て手順")).toBe(true);
  });

  it("一部のトークンが含まれない場合は false", () => {
    expect(fuzzyMatchAll("足場 化学", "足場の安全な組立て手順")).toBe(false);
  });

  it("空白のみのクエリは true", () => {
    expect(fuzzyMatchAll("   ", "anything")).toBe(true);
  });

  it("複数空白を1つとして扱う", () => {
    expect(fuzzyMatchAll("  足場    安全  ", "足場の安全")).toBe(true);
  });
});
