/**
 * 2024年 化学物質自律的管理（安衛則改正）の条番号正確性 回帰テスト。
 *
 * 背景: コーパスが「化学物質管理者の選任＝安衛則第577条の2」と誤割当していた
 * （正しくは第12条の5。第577条の2はばく露低減措置）。
 * docs/chatbot-deep-audit-2026-05-26/03-data-coverage.md の P0-1 是正に対応。
 *
 * 出典（e-Gov・厚労省で確認）:
 * - 安衛則第12条の5（化学物質管理者の選任・職務、令和6年4月1日施行）
 * - 安衛則第12条の6（保護具着用管理責任者の選任、令和6年4月1日施行）
 * - 安衛則第577条の2（RA対象物のばく露低減・濃度基準値以下、令和5/6年施行）
 */

import { describe, it, expect } from "vitest";
import { allLawArticles } from "@/data/laws";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

function find(lawShort: string, articleNum: string) {
  return allLawArticles.find(
    (a) => a.lawShort === lawShort && a.articleNum === articleNum
  );
}

describe("2024化学物質改正の条番号正確性（回帰ガード）", () => {
  it("化学物質管理者は安衛則第12条の5で収録されている", () => {
    const a = find("安衛則", "第12条の5");
    expect(a).toBeDefined();
    expect(a?.articleTitle).toContain("化学物質管理者");
  });

  it("保護具着用管理責任者は安衛則第12条の6で収録されている", () => {
    const a = find("安衛則", "第12条の6");
    expect(a).toBeDefined();
    expect(a?.articleTitle).toContain("保護具着用管理責任者");
  });

  it("安衛則第577条の2はばく露低減措置であり、化学物質管理者の選任ではない", () => {
    const a = find("安衛則", "第577条の2");
    expect(a).toBeDefined();
    expect(a?.articleTitle).not.toContain("化学物質管理者の選任");
    expect(`${a?.articleTitle}${a?.text}`).toMatch(/ばく露|濃度基準値/);
  });

  it("「化学物質管理者」の検索で第12条の5がtop-5に入る", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "化学物質管理者の選任根拠を教えて",
      5
    );
    expect(
      articles.some((a) => a.lawShort === "安衛則" && a.articleNum === "第12条の5")
    ).toBe(true);
    // 誤った577条の2を化学物質管理者として返していないこと
    expect(
      articles.some(
        (a) =>
          a.articleNum === "第577条の2" &&
          a.articleTitle.includes("化学物質管理者")
      )
    ).toBe(false);
  });

  it("「保護具着用管理責任者」の検索で第12条の6がtop-5に入る", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "保護具着用管理責任者は何条で定められていますか",
      5
    );
    expect(
      articles.some((a) => a.lawShort === "安衛則" && a.articleNum === "第12条の6")
    ).toBe(true);
  });

  it("「濃度基準値」の検索で第577条の2がtop-5に入る", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "化学物質の濃度基準値とばく露低減の根拠は",
      5
    );
    expect(
      articles.some((a) => a.lawShort === "安衛則" && a.articleNum === "第577条の2")
    ).toBe(true);
  });
});
