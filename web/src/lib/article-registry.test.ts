import { describe, it, expect } from "vitest";
import {
  registryStats,
  hasArticle,
  lookupArticle,
  lookupByKey,
  getRegistryEntries,
  getArticlesByLawShort,
  getAllowedReferenceKeys,
} from "./article-registry";
import { allLawArticles } from "@/data/laws";

describe("article-registry: build & stats", () => {
  it("loads all LawArticle entries from allLawArticles", () => {
    const stats = registryStats();
    expect(stats.totalArticles).toBeGreaterThanOrEqual(allLawArticles.length);
    expect(stats.uniqueLaws).toBeGreaterThan(10);
  });

  it("indexes by lawShort", () => {
    const anzenSoku = getArticlesByLawShort("安衛則");
    expect(anzenSoku.length).toBeGreaterThan(50);
  });

  it("exposes registry entries with required fields", () => {
    const entries = getRegistryEntries();
    expect(entries.length).toBeGreaterThan(0);
    const sample = entries[0];
    expect(sample.lawShort).toBeTruthy();
    expect(sample.rawArticleNum).toBeTruthy();
    expect(sample.key).toContain("|");
  });

  it("reports duplicate keys (informational, not a hard failure)", () => {
    // 同一 (lawShort, articleNum) は corpus-gaps-fill.ts と各既存 LawArticle
    // ファイル間で意図的に重複登録される設計（PIN ヒット率向上のため）。
    // 過度な重複（30% 超）は監査対象だが、それ未満は許容する。
    const stats = registryStats();
    const ratio = stats.duplicateKeys / Math.max(1, stats.totalArticles);
    expect(ratio).toBeLessThan(0.3);
  });
});

describe("article-registry: lookup", () => {
  it("finds 安衛法 第61条 by raw arabic form", () => {
    const e = lookupArticle("安衛法", "第61条");
    expect(e).toBeDefined();
    expect(e?.ref?.article).toBe(61);
  });

  it("hasArticle returns false for non-existent article", () => {
    expect(hasArticle("安衛法", "第9999条")).toBe(false);
  });

  it("kanji and arabic article numbers map to the same entry", () => {
    const arabic = lookupArticle("安衛則", "第612条の2");
    const kanji = lookupArticle("安衛則", "第六百十二条の二");
    expect(arabic).toBeDefined();
    expect(arabic?.key).toBe(kanji?.key);
  });

  it("lookupByKey works for round-tripped keys", () => {
    const entries = getRegistryEntries();
    const sample = entries[Math.floor(entries.length / 2)];
    const back = lookupByKey(sample.key);
    expect(back).toBeDefined();
    expect(back?.lawShort).toBe(sample.lawShort);
  });
});

describe("article-registry: sourceUrl", () => {
  it("assigns e-Gov anchor URL when metadata is available", () => {
    const e = lookupArticle("安衛則", "第612条の2");
    expect(e?.sourceUrl).toBeDefined();
    expect(e?.sourceUrl).toContain("laws.e-gov.go.jp");
    expect(e?.sourceUrl).toContain("Mp-At_");
  });

  it("does not append fragment for non e-Gov URLs (e.g. mhlw PDFs)", () => {
    const entries = getArticlesByLawShort("メンタル指針");
    if (entries.length > 0) {
      const e = entries[0];
      // mhlw.go.jp PDF はフラグメント無しのままベース URL を使う
      if (e.sourceUrl && !e.sourceUrl.startsWith("https://laws.e-gov.go.jp/")) {
        expect(e.sourceUrl).not.toContain("Mp-At_");
      }
    }
  });
});

describe("article-registry: allowedReferenceKeys whitelist", () => {
  it("contains the same number as registry entries (minus dupes)", () => {
    const stats = registryStats();
    const set = getAllowedReferenceKeys();
    expect(set.size).toBe(stats.totalArticles - stats.duplicateKeys);
  });

  it("includes well-known pinned articles", () => {
    const set = getAllowedReferenceKeys();
    const a = lookupArticle("安衛法", "第61条");
    expect(a).toBeDefined();
    expect(set.has(a!.key)).toBe(true);
  });
});
