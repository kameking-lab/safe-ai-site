import { describe, it, expect } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

describe("fall-arrest RAG", () => {
  it("returns 518 series for 墜落制止用器具 usage obligations", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("墜落制止用器具の使用義務は何条？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    const has518Series = nums.some((n) => ["第518条", "第520条", "第521条"].includes(n));
    expect(has518Series).toBe(true);
  });

  it("returns 539の2-9 for rope high-altitude work questions", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("ロープ高所作業のライフラインは何条？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    const has539Series = nums.some((n) => n.startsWith("第539条"));
    expect(has539Series).toBe(true);
  });

  it("returns 第36条 for フルハーネス特別教育 questions", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("フルハーネス特別教育の根拠条文は？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(nums).toContain("第36条");
  });
});
