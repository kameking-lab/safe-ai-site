import { describe, expect, it } from "vitest";
import { allLawArticles } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import act from "@/data/laws-fulltext/347AC0000000057.json";
import regulation from "@/data/laws-fulltext/347M50002000032.json";

describe("October safety-law transition", () => {
  it("connects all ten current changed/added articles to exact server RAG text", () => {
    const groups = [[act, ["第2条", "第65条の3", "第65条の4", "第65条の5", "第119条"]],
      [regulation, ["第42条の5", "第42条の6", "第52条の22", "第86条", "第100条"]]] as const;
    for (const [snapshot, nums] of groups) for (const num of nums) {
      const record = verifiedLawArticles.find((a) => a.sourceLawId === snapshot.lawId && a.articleNum === num);
      expect(record?.text).toBe(snapshot.articles.find((a) => a.articleNum === num)?.text);
      expect(record?.sourceRevisionId).toBe(snapshot.revisionId);
      expect(record?.sourceHash).toBe(snapshot.sha256);
      expect(record?.sourceContentChangedOn).toBe("2026-10-08");
      expect(record?.humanReviewStatus).toBe("not-reviewed");
    }
  });
  it("replaces the three intersecting curated search records and preserves unrelated dates", () => {
    for (const [lawShort, articleNum] of [["安衛法", "第2条"], ["安衛法", "第119条"], ["安衛則", "第86条"]]) {
      const matches = allLawArticles.filter((a) => a.lawShort === lawShort && a.articleNum === articleNum);
      expect(matches).toHaveLength(1);
      const verified = verifiedLawArticles.find((a) => a.lawShort === lawShort && a.articleNum === articleNum);
      expect(matches[0]?.text).toBe(verified?.text);
      expect(matches[0]?.contentHash).toBe(verified?.contentHash);
    }
    const unchanged = verifiedLawArticles.find((a) => a.lawShort === "安衛法" && a.articleNum === "第1条");
    expect(unchanged?.sourceContentChangedOn).toBeUndefined();
    const management = verifiedLawArticles.find((a) => a.lawShort === "安衛法" && a.articleNum === "第65条の4");
    expect(management?.articleTitle).toBe("作業の管理");
    expect(verifiedLawArticles.find((a) => a.lawShort === "安衛法" && a.articleNum === "第65条の5")?.articleTitle).toBe("作業時間の制限");
  });
});
