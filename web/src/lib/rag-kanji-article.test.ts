/**
 * P2-6: 漢数字の条番号検索。
 * 「第十二条の五」のような漢数字表記でも条番号で検索できること、
 * かつ化学物質名（一酸化炭素 等）の漢数字を壊さないことを確認する。
 */

import { describe, it, expect } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

describe("P2-6 漢数字の条番号検索", () => {
  it("『安衛則第十二条の五』で第12条の5（化学物質管理者）に到達する", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "安衛則第十二条の五は何を定めていますか",
      5,
    );
    expect(
      articles.some((a) => a.lawShort === "安衛則" && a.articleNum === "第12条の5"),
    ).toBe(true);
  });

  it("『第六十一条』で安衛法第61条（就業制限）に到達する", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "安衛法第六十一条の就業制限について",
      5,
    );
    expect(articles.some((a) => a.articleNum === "第61条")).toBe(true);
  });

  it("化学物質名の漢数字は壊さない（一酸化炭素の検索が成立する）", () => {
    // 「一」を「1」に変換してしまうと一酸化炭素のキーワードに当たらなくなる。
    const { articles, normalizedScore } = searchRelevantArticlesWithScore(
      "一酸化炭素中毒の防止措置",
      5,
    );
    // 一酸化炭素関連の条文が何らかヒットする（スコア > 0）こと
    expect(normalizedScore).toBeGreaterThan(0);
    expect(articles.length).toBeGreaterThan(0);
  });
});
