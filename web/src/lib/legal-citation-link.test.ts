import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws/law-types";
import { legalCitationLink } from "./legal-citation-link";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { getLawMetadata } from "@/data/law-metadata";

const lawId = "339AC0000000170";
const revision = "20260803_508AC0000000068";
const article: LawArticle = {
  law: "電気事業法",
  lawShort: "電事法",
  articleNum: "第43条",
  articleTitle: "主任技術者",
  text: "保存した公式本文",
  keywords: [],
  sourceKind: "government-official-primary",
  sourceLawId: lawId,
  sourceRevisionId: `${lawId}_${revision}`,
  sourceUrl: `https://laws.e-gov.go.jp/law/${lawId}?occasion_date=20260809#Mp-At_43`,
  sourceHash: "a".repeat(64),
  verificationStatus: "primary-source-verified",
};

describe("legalCitationLink", () => {
  it("retains the verified source link for every existing law in the server corpus", () => {
    const rejected = verifiedLawArticles.filter((source) =>
      legalCitationLink(source, getLawMetadata(source.lawShort).egovLawId) !== source.sourceUrl,
    );
    expect(rejected.map((source) => `${source.sourceLawId}|${source.articleNum}`)).toEqual([]);
  });

  it("preserves the verified date and provision anchor verbatim", () => {
    expect(legalCitationLink(article, lawId)).toBe(article.sourceUrl);
  });

  it("retains a supplied revision URL only for the matching stored revision", () => {
    const sourceUrl = `https://laws.e-gov.go.jp/law/${lawId}_${revision}#Mp-At_43`;
    expect(legalCitationLink({ ...article, sourceUrl })).toBe(sourceUrl);
    expect(legalCitationLink({ ...article, sourceUrl, sourceRevisionId: "20250803_508AC0000000068" })).toBeUndefined();
  });

  it("does not invent anchors or occasion dates for a whole-law source", () => {
    const sourceUrl = `https://laws.e-gov.go.jp/law/${lawId}`;
    expect(legalCitationLink({ ...article, sourceUrl, articleNum: "第43条第2項第1号" })).toBe(sourceUrl);
  });

  it("accepts the shortened revision form in existing snapshots", () => {
    expect(legalCitationLink({ ...article, sourceRevisionId: revision })).toBe(article.sourceUrl);
  });

  it.each([
    { sourceLawId: "347AC0000000057" },
    { sourceRevisionId: `347AC0000000057_${revision}` },
    { sourceRevisionId: "unknown-revision" },
    { sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057" },
    { sourceUrl: `https://laws.e-gov.go.jp/api/2/law_data/${lawId}` },
  ])("rejects inconsistent law/revision or non-law locators: %j", (change) => {
    expect(legalCitationLink({ ...article, ...change }, lawId)).toBeUndefined();
  });

  it.each([
    "javascript:alert(1)",
    "http://laws.e-gov.go.jp/law/339AC0000000170",
    "https://laws.e-gov.go.jp.evil.example/law/339AC0000000170",
    "https://user@laws.e-gov.go.jp/law/339AC0000000170",
    "https://laws.e-gov.go.jp:8443/law/339AC0000000170",
    "https://laws.e-gov.go.jp\\@evil.example/law/339AC0000000170",
    "https://laws.e-gov.go.jp/law/339AC0000000170\n",
    "//laws.e-gov.go.jp/law/339AC0000000170",
    "not a URL",
    "",
  ])("does not link an untrusted URL or replace it with a known law: %s", (sourceUrl) => {
    expect(legalCitationLink({ ...article, sourceUrl }, lawId)).toBeUndefined();
  });

  it.each([
    { verificationStatus: undefined },
    { sourceHash: undefined },
    { sourceHash: "not-a-hash" },
    { sourceKind: undefined },
  ])("requires stored source verification metadata: %j", (change) => {
    expect(legalCitationLink({ ...article, ...change }, lawId)).toBeUndefined();
  });

  it("preserves a ministry publication, including its query and PDF page", () => {
    const sourceUrl = "https://www.mhlw.go.jp/content/11200000/001234567.pdf?download=1#page=3";
    expect(legalCitationLink({ ...article, sourceUrl }, lawId)).toBe(sourceUrl);
    expect(legalCitationLink({ ...article, sourceUrl, sourceKind: "egov-fulltext-snapshot" })).toBeUndefined();
  });

  it("offers only the known landing page for a legacy article without provenance", () => {
    const legacy: LawArticle = {
      law: article.law, lawShort: article.lawShort, articleNum: article.articleNum,
      articleTitle: article.articleTitle, text: article.text, keywords: [],
    };
    expect(legalCitationLink(legacy, lawId)).toBe(`https://laws.e-gov.go.jp/law/${lawId}`);
    expect(legalCitationLink(legacy, "invalid/id")).toBeUndefined();
    expect(legalCitationLink({ ...legacy, sourceVersionKind: "historical" }, lawId)).toBeUndefined();
    expect(legalCitationLink({ ...legacy, sourceRevisionId: revision }, lawId)).toBeUndefined();
  });
});
