import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws/law-types";
import { withVerifiedRevisionMetadata } from "@/data/laws/law-revision-metadata";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";

describe("verified e-Gov revision metadata", () => {
  it("attaches the exact committed amendment date and record to a matching source revision", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "安衛法" && candidate.articleNum === "第1条",
    );

    expect(article?.sourceRevisionId).toBe("20260401_507AC0000000033");
    expect(article?.amendmentPromulgatedOn).toBe("2025-05-14");
    expect(article?.amendmentHistory).toEqual([
      {
        revisionId: "20260401_507AC0000000033",
        amendmentLawNumber: "令和七年法律第三十三号",
        promulgatedOn: "2025-05-14",
        effectiveOn: "2026-04-01",
        status: "enforced",
        sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057",
      },
    ]);
  });

  it("does not infer a date when the committed revision record is absent", () => {
    const article: LawArticle = {
      law: "未収録法令",
      lawShort: "未収録",
      articleNum: "第1条",
      articleTitle: "",
      text: "本文",
      keywords: [],
      sourceKind: "egov-fulltext-snapshot",
      sourceUrl: "https://laws.e-gov.go.jp/law/999AC0000000001",
      sourceLawId: "999AC0000000001",
      sourceRevisionId: "20260401_507AC0000000033",
      verificationStatus: "snapshot-hash-verified",
    };

    const enriched = withVerifiedRevisionMetadata(article);
    expect(enriched.amendmentPromulgatedOn).toBeUndefined();
    expect(enriched.amendmentHistory).toBeUndefined();
  });

  it("fails closed when the full-text revision date and revision snapshot differ", () => {
    const article: LawArticle = {
      law: "労働安全衛生法",
      lawShort: "安衛法",
      articleNum: "第1条",
      articleTitle: "目的",
      text: "本文",
      keywords: [],
      sourceKind: "egov-fulltext-snapshot",
      sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057",
      sourceLawId: "347AC0000000057",
      sourceRevisionId: "20270401_507AC0000000033",
      verificationStatus: "snapshot-hash-verified",
    };

    const enriched = withVerifiedRevisionMetadata(article);
    expect(enriched.amendmentPromulgatedOn).toBeUndefined();
    expect(enriched.amendmentHistory).toBeUndefined();
  });
});
