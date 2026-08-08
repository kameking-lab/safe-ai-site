import { describe, expect, it } from "vitest";
import {
  normalizeQualificationText,
  qualificationMissingQuestions,
  qualificationSearchTerms,
} from "./qualification-context";

describe("qualification context gold cases", () => {
  it.each([
    ["フオークリフトを運転", "フォークリフトを運転"],
    ["フォーク リフト 操作", "フォークリフト 操作"],
    ["玉掛 作業", "玉掛け 作業"],
    ["アスベスト除去", "石綿除去"],
  ])("normalizes synonyms and common input errors: %s", (input, expected) => {
    expect(normalizeQualificationText(input)).toBe(expected);
  });

  it("asks height for high-place work and voltage for electrical work", () => {
    const missing = qualificationMissingQuestions({
      work: "足場上で低圧電気設備を点検",
      height: "",
      equipment: "分電盤",
      target: "配線",
      voltage: "",
      role: "点検担当",
    });
    expect(missing).toContain("作業床・作業箇所の高さ");
    expect(missing).toContain("電圧と充電部への接近・取扱い");
  });

  it("keeps insufficient conditions visible instead of returning qualification-free", () => {
    expect(qualificationMissingQuestions({
      work: "",
      height: "",
      equipment: "",
      target: "",
      voltage: "",
      role: "",
    })).toEqual([
      "具体的な作業内容",
      "立場・担当（運転、操作、補助、監督等）",
      "使用する機械・設備と能力",
      "対象物・材料",
    ]);
  });

  it("builds normalized search terms from structured fields", () => {
    expect(qualificationSearchTerms({
      work: "フオークリフト",
      height: "",
      equipment: "最大荷重 1t",
      target: "パレット",
      voltage: "",
      role: "運転",
    })).toEqual(["フォークリフト", "最大荷重", "1t", "パレット", "運転"]);
  });
});
