import { describe, expect, it } from "vitest";
import {
  allLawArticles,
  corpusGapFillArticles,
  mhlwLawArticles,
} from "@/data/laws";

describe("MHLW PDF OCR law fragments quarantine", () => {
  it("keeps the audit dataset but excludes every fragment from public search and RAG corpus", () => {
    expect(mhlwLawArticles.length).toBeGreaterThan(0);
    const publicCorpus = new Set<unknown>(allLawArticles);
    expect(
      mhlwLawArticles.filter((article) => publicCorpus.has(article)),
    ).toEqual([]);
  });

  it("does not expose the reproduced misclassified mental-health bundle", () => {
    expect(
      allLawArticles.some(
        (article) =>
          article.law === "職場のメンタルヘルス関連" &&
          (article.articleNum === "第18条の2" ||
            article.articleNum === "附則"),
      ),
    ).toBe(false);
  });

  it("excludes non-verbatim gap-fill summaries from search and RAG citations", () => {
    expect(corpusGapFillArticles.length).toBeGreaterThan(0);
    const publicCorpus = new Set<unknown>(allLawArticles);
    expect(
      corpusGapFillArticles.filter((article) => publicCorpus.has(article)),
    ).toEqual([]);
  });
});
