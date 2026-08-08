import { describe, expect, it } from "vitest";
import { allLawArticles } from "@/data/laws";
import { buildExactLegalEvidenceAnswer } from "@/lib/legal-exact-answer";

describe("指定条文の決定的回答", () => {
  it("PF-011: 安衛法61条をno-hit扱いせず原文で返す", () => {
    const result = buildExactLegalEvidenceAnswer(
      "労働安全衛生法第61条は何を定めていますか？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    expect(result?.answer).toContain("労働安全衛生法 第61条");
    expect(result?.answer).not.toContain("特定できません");
    expect(result?.answerAsOf).toBe("2026-07-28");
  });

  it("PF-012: 安衛則612条の2は確認済み施行日を表示する", () => {
    const result = buildExactLegalEvidenceAnswer(
      "2026年7月28日現在、安衛則第612条の2は何を定めていますか？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    expect(result?.temporalStatus).toBe("effective");
    expect(result?.answer).toContain("施行日: 2025-06-01");
  });

  it("枝条を親条との部分一致で二重候補にしない", () => {
    const result = buildExactLegalEvidenceAnswer(
      "安衛則第612条の2の施行日はいつですか？",
      allLawArticles,
      new Date("2026-08-02T03:00:00Z"),
    );
    expect(result?.articles).toHaveLength(1);
    expect(result?.articles[0]?.articleNum).toBe("第612条の2");
  });

  it("PF-012: 将来前提は施行状態未確認として推測しない", () => {
    const result = buildExactLegalEvidenceAnswer(
      "2030年1月1日の安衛法第61条の義務は？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    expect(result?.temporalStatus).toBe("future-unverified");
    expect(result?.answer).toContain("将来の義務内容は推測しません");
  });

  it("代表的な足場手すり質問を安衛則563条へ一意に結び付ける", () => {
    const result = buildExactLegalEvidenceAnswer(
      "足場の手すり高さは？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    expect(result?.articles).toHaveLength(2);
    expect(result?.articles[0]).toMatchObject({
      lawShort: "安衛則",
      articleNum: "第563条",
    });
    expect(result?.articles[1]).toMatchObject({
      lawShort: "安衛則",
      articleNum: "第552条",
    });
    expect(result?.answer).toContain("85センチメートル以上");
    expect(result?.answer).toContain(
      "35センチメートル以上50センチメートル以下",
    );
    expect(result?.answer).not.toContain("2015年改正");
  });

  it("第563条を明示した中桟質問でも定義条文の第552条を補う", () => {
    const result = buildExactLegalEvidenceAnswer(
      "労働安全衛生規則第563条で中桟は何センチ必要？",
      allLawArticles,
      new Date("2026-08-02T03:00:00Z"),
    );
    expect(result?.articles.map((entry) => entry.articleNum)).toEqual([
      "第563条",
      "第552条",
    ]);
    expect(result?.answer).toContain("85センチメートル以上");
  });

  it("酸欠作業の資格質問は従事者の特別教育と作業主任者の技能講習を分ける", () => {
    const result = buildExactLegalEvidenceAnswer(
      "酸欠作業に必要な資格は何ですか？",
      allLawArticles,
      new Date("2026-07-30T03:00:00Z"),
    );

    expect(
      result?.articles.map((article) => article.articleNum),
    ).toEqual(["第11条", "第12条"]);
    expect(result?.answer).toContain("従事する労働者");
    expect(result?.answer).toContain("特別の教育");
    expect(result?.answer).toContain("作業主任者");
    expect(result?.answer).toContain("技能講習");
    expect(result?.answer).toContain("単一の資格として確定");
  });

  it("同じ法令の複数条を明示した比較は質問順で両条を保持する", () => {
    const result = buildExactLegalEvidenceAnswer(
      "酸素欠乏症等防止規則第11条と第12条の違いを確認したい",
      allLawArticles,
      new Date("2026-08-02T03:00:00Z"),
    );

    expect(result?.articles.map((article) => article.articleNum)).toEqual([
      "第11条",
      "第12条",
    ]);
  });
});
