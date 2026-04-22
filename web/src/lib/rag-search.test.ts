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

describe("Chrome R8 emergency RAG pins", () => {
  it("pins 安衛法第60条 + 安衛令第19条 for 職長教育 questions", () => {
    const { articles } = searchRelevantArticlesWithScore("職長教育は何条で誰が対象？", 5);
    const has60 = articles.some(
      (a) => a.law === "労働安全衛生法" && a.articleNum === "第60条"
    );
    const has19 = articles.some(
      (a) => a.law === "労働安全衛生法施行令" && a.articleNum === "第19条"
    );
    expect(has60).toBe(true);
    expect(has19).toBe(true);
  });

  it("安衛令第19条 lists all industries including 令和5年追加 (食料品製造業 etc)", () => {
    const { articles } = searchRelevantArticlesWithScore("職長教育 対象業種", 5);
    const ordinance19 = articles.find(
      (a) => a.law === "労働安全衛生法施行令" && a.articleNum === "第19条"
    );
    expect(ordinance19).toBeTruthy();
    const text = ordinance19?.text ?? "";
    for (const industry of [
      "建設業",
      "製造業",
      "電気業",
      "ガス業",
      "自動車整備業",
      "機械修理業",
      "食料品製造業",
      "新聞業",
      "出版業",
      "製本業",
      "印刷物加工業",
    ]) {
      expect(text).toContain(industry);
    }
  });

  it("pins 安衛則第612条の2 for 熱中症 / WBGT questions", () => {
    const { articles } = searchRelevantArticlesWithScore("熱中症のWBGT義務は何条？", 5);
    const hit = articles.some(
      (a) => a.law === "労働安全衛生規則" && a.articleNum === "第612条の2"
    );
    expect(hit).toBe(true);
  });
});
