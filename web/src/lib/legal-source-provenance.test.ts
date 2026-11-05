import { describe, expect, it } from "vitest";
import verification from "@/data/laws/current-revision-verification.json";
import primaryVerification from "@/data/laws/primary-current-verification.json";
import { verifiedPrimaryElectricalArticles } from "@/data/laws/verified-primary-electrical";
import { lawArticleToSource } from "@/lib/chatbot-route-shared";
import type { LawArticle } from "@/data/laws/law-types";
import { lawSourceProvenance } from "./legal-source-provenance";
import { formatSourceProvenance, normalizeSourceProvenance } from "./source-provenance";
import { buildStructuredCitations } from "./chatbot-enrichment";

const electricalArticles: readonly LawArticle[] = verifiedPrimaryElectricalArticles;
const record = verification.records[0]!;
const article: LawArticle = {
  law: "検査用の原典", lawShort: "検査", articleNum: "第1条", articleTitle: "", text: "検査用本文", keywords: [],
  sourceUrl: `https://laws.e-gov.go.jp/law/${record.lawId}`, sourceLawId: record.lawId,
  sourceRevisionId: record.revisionId, sourceHash: record.snapshotHash, sourceFetchedAt: "2026-07-20T03:00:00.000Z",
};

describe("chat source citation links", () => {
  it.each(electricalArticles)("shares the preserved official URL for $lawShort $articleNum", (item) => {
    const source = lawArticleToSource(item, "条文", new Date("2026-10-12T00:00:00+09:00"));
    expect(source.url).toBe(item.sourceUrl);
    expect(source.sourceProvenance?.url).toBe(item.sourceUrl);
    expect(source.url).toBe(buildStructuredCitations([item])[0]?.egovHref);
  });

  it.each([
    "javascript:alert(1)",
    "https://laws.e-gov.go.jp.evil.example/law/339AC0000000170",
    "https://laws.e-gov.go.jp/law/347AC0000000057",
  ])("does not expose a rejected URL through the source fallback: %s", (sourceUrl) => {
    const item = { ...electricalArticles[0]!, sourceUrl };
    const source = lawArticleToSource(item, "条文");
    expect(source.url).toBeUndefined();
    expect(source.sourceProvenance?.url).toBeUndefined();
    expect(buildStructuredCitations([item])[0]?.egovHref).toBeUndefined();
  });
});

describe("item-level source facts", () => {
  it("preserves acquisition and the exact committed revision confirmation as separate facts", () => {
    expect(lawSourceProvenance(article)).toEqual({
      url: article.sourceUrl, version: record.revisionId, fetchedAt: article.sourceFetchedAt,
      checkedAt: record.checkedAt, checkKind: "revision",
    });
  });
  it.each([
    { sourceLawId: "347AC0000000057" },
    { sourceRevisionId: "20260101_508AC0000000001" },
    { sourceHash: "0".repeat(64) },
    { sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057" },
    { sourceVersionKind: "historical" as const },
  ])("does not borrow confirmation from another identity: %j", (mismatch) => {
    const facts = lawSourceProvenance({ ...article, ...mismatch })!;
    expect(facts.checkedAt).toBeUndefined();
    expect(facts.fetchedAt).toBe(article.sourceFetchedAt);
  });
  it("matches a publication confirmation to the exact article, URL, hash and version", () => {
    const proof = primaryVerification.records[0]!;
    const primary: LawArticle = { ...article, lawShort: proof.lawShort, articleNum: proof.articleNum, sourceUrl: proof.sourceUrl, sourceHash: proof.sourceHash, sourceLawId: undefined, sourceRevisionId: proof.revisionId ?? undefined };
    expect(lawSourceProvenance(primary)?.checkedAt).toBe(proof.checkedAt);
    expect(lawSourceProvenance(primary)?.checkKind).toBe("publication-excerpt");
    expect(lawSourceProvenance({ ...primary, articleNum: "第999条" })?.checkedAt).toBeUndefined();
  });
  it("never treats the fetch date, revision ID, or a law-level audit date as confirmation", () => {
    const facts = lawSourceProvenance({ ...article, sourceHash: undefined })!;
    expect(facts.checkedAt).toBeUndefined();
    expect(formatSourceProvenance(facts)).not.toContain("最終確認");
  });
  it("retains each valid field independently while dropping impossible dates and unsafe URLs", () => {
    expect(normalizeSourceProvenance({ url: "javascript:alert(1)", version: record.revisionId, fetchedAt: "2026-02-31", checkedAt: "2026-10-11T24:00:00Z", checkKind: "revision" })).toEqual({ version: record.revisionId });
    expect(normalizeSourceProvenance({ url: article.sourceUrl, fetchedAt: "2026-07-20", checkedAt: "2026-07-20" })).toEqual({ url: article.sourceUrl, fetchedAt: "2026-07-20" });
  });
});

// Real committed fixtures cover the full e-Gov revision format as well as the short format.
it.each(electricalArticles.filter((item) => item.sourceRevisionId))("keeps the formal full revision for $lawShort $articleNum in source and chat facts", (item) => {
  const facts = lawSourceProvenance(item)!;
  expect(facts.version).toBe(item.sourceRevisionId);
  expect(facts.fetchedAt).toBe(item.sourceFetchedAt);
  const proof = primaryVerification.records.find((entry) => entry.lawShort === item.lawShort && entry.articleNum === item.articleNum)!;
  expect(facts.checkedAt).toBe(proof.checkedAt);
  expect(facts.checkKind).toBe("publication-excerpt");
  expect(lawArticleToSource(item, "条文", new Date("2026-10-13T00:00:00Z")).sourceProvenance).toEqual(facts);
  expect(formatSourceProvenance(facts)).toContain(item.sourceRevisionId);
});
