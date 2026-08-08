import { describe, expect, it } from "vitest";
import {
  buildContextClarificationAnswer,
  buildUnverifiedReferenceAnswer,
  hasExplicitLawArticleReference,
  needsPriorConversationContext,
} from "./legal-question-boundary";

describe("PF-027 legal question boundary", () => {
  it("requires clarification for a context-dependent query after history reset", () => {
    expect(needsPriorConversationContext("それについて詳しく", false)).toBe(true);
    expect(needsPriorConversationContext("  先ほどの条件なら？", false)).toBe(true);
    expect(needsPriorConversationContext("それについて詳しく", true)).toBe(false);
    expect(buildContextClarificationAnswer()).toContain("文脈を推測");
  });

  it.each([
    "どの通達？",
    "何の通達ですか？",
    "指針は？",
    "ガイドラインは？",
    "条文は？",
    "何条？",
    "何項？",
    "何号？",
    "公式原文は？",
    "告示は？",
    "根拠は？",
    "法源は？",
    "法律は？",
    "法令は？",
    "いつから？",
    "換気は？",
    "測定は？",
  ])("対象なしの省略follow-upを無関係な法令検索へ流さない: %s", (query) => {
    expect(needsPriorConversationContext(query, false)).toBe(true);
    expect(needsPriorConversationContext(query, true)).toBe(false);
  });

  it("recognizes an explicit law and article while rejecting vague article-only text", () => {
    expect(hasExplicitLawArticleReference("労働安全衛生法 第61条")).toBe(true);
    expect(hasExplicitLawArticleReference("安衛則612条の2")).toBe(true);
    expect(hasExplicitLawArticleReference("第61条について")).toBe(false);
  });

  it("directs an unverified explicit reference to the official source without substitutes", () => {
    const answer = buildUnverifiedReferenceAnswer("安衛法 第9999条");
    expect(answer).toContain("一意に特定できません");
    expect(answer).toContain("別法令を代わり");
    expect(answer).toContain("https://laws.e-gov.go.jp/");
  });
});
