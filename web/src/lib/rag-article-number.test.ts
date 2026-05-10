/**
 * Failing tests for RAG article-number direct lookup precision (Q3-type queries).
 *
 * These tests document the DESIRED behavior when a user query contains an explicit
 * article reference such as "労働安全衛生規則第565条について". They are written as
 * failing tests to drive TDD; any implementation fix belongs in a separate PR.
 *
 * Note: PR #81 merged a partial fix. Tests that still fail after that fix are
 * marked with "EXPECTED FAIL" in their comments. Tests that pass after PR #81
 * serve as regression guards.
 *
 * Background: docs/investigation-rag-prod-verify-2026-05-10.md
 */

import { describe, it, expect } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

describe("RAG article-number direct lookup – Q3-type precision (failing tests)", () => {
  it("1. 労働安全衛生規則第565条について → top result is 安衛則第565条", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "労働安全衛生規則第565条について",
      5
    );
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第565条");
    expect(articles[0].lawShort).toBe("安衛則");
  });

  it("2. 安衛則第518条 → top result is 安衛則第518条", () => {
    const { articles } = searchRelevantArticlesWithScore("安衛則第518条", 5);
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第518条");
    expect(articles[0].lawShort).toBe("安衛則");
  });

  it("3. 第61条第1項第3号 (no law name) → top result is 安衛法第61条", () => {
    const { articles } = searchRelevantArticlesWithScore("第61条第1項第3号", 5);
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第61条");
    expect(articles[0].lawShort).toBe("安衛法");
  });

  it("4. 労働安全衛生法第61条 → top result is 安衛法第61条", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "労働安全衛生法第61条",
      5
    );
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第61条");
    expect(articles[0].lawShort).toBe("安衛法");
  });

  it("5. クレーン等安全規則第74条 → top result is クレーン則第74条", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "クレーン等安全規則第74条",
      5
    );
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第74条");
    expect(articles[0].lawShort).toBe("クレーン則");
  });

  // EXPECTED FAIL: 安衛則第151条の3 does not exist in the current law data.
  // This test documents a data-coverage gap: the vehicle-operations section of
  // 安衛則 is missing 第151条の3 (and surrounding articles).
  it("6. 労働安全衛生規則第151条の3 → top result is 安衛則第151条の3", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "労働安全衛生規則第151条の3",
      5
    );
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第151条の3");
    expect(articles[0].lawShort).toBe("安衛則");
  });

  it("7. 酸欠則第3条 → top result is 酸欠則第3条", () => {
    const { articles } = searchRelevantArticlesWithScore("酸欠則第3条", 5);
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第3条");
    expect(articles[0].lawShort).toBe("酸欠則");
  });

  // EXPECTED FAIL: a bare article number with no law context currently scores
  // 10/25 = 0.4, which is below the 0.5 threshold needed to be treated as a
  // confident hit. The desired behaviour is that the most common law's 第14条
  // (安衛法) is surfaced with sufficient confidence.
  it("8. 第14条 alone → 安衛法系条文 with confidenceScore > 0.5", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore(
      "第14条",
      5
    );
    expect(normalizedScore).toBeGreaterThan(0.5);
    const hasAnzenArticle = articles.some(
      (a) => a.lawShort === "安衛法" || a.lawShort === "安衛則"
    );
    expect(hasAnzenArticle).toBe(true);
  });

  it("9. 安衛則565条について教えて (no 第) → 第565条 in top 3", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "安衛則565条について教えて",
      5
    );
    const top3 = articles.slice(0, 3).map((a) => a.articleNum);
    expect(top3).toContain("第565条");
  });

  it("10. 労働安全衛生規則 第565条 (space between law and article) → top result is 安衛則第565条", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "労働安全衛生規則 第565条",
      5
    );
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].articleNum).toBe("第565条");
    expect(articles[0].lawShort).toBe("安衛則");
  });
});
