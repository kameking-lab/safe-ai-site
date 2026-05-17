import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  buildStructuredCitations,
  formatCitationTriples,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
} from "@/lib/chatbot-enrichment";

const article: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第612条の2",
  articleTitle: "熱中症対策",
  text: "事業者は、WBGT値が28度以上の…",
  keywords: ["熱中症", "WBGT"],
};

describe("buildStructuredCitations", () => {
  it("returns triple (article + issuer + effective date)", () => {
    const result = buildStructuredCitations([article]);
    expect(result).toHaveLength(1);
    expect(result[0].lawShort).toBe("安衛則");
    expect(result[0].articleNum).toBe("第612条の2");
    expect(result[0].issuer).toBe("厚生労働省");
    expect(result[0].effectiveDate).toContain("令和7年6月1日");
    expect(result[0].searchHref).toContain("/law-search");
  });

  it("dedups same law + article", () => {
    const result = buildStructuredCitations([article, article]);
    expect(result).toHaveLength(1);
  });

  it("caps at 5 entries", () => {
    const many: LawArticle[] = Array.from({ length: 10 }, (_, i) => ({
      ...article,
      articleNum: `第${i + 100}条`,
    }));
    expect(buildStructuredCitations(many)).toHaveLength(5);
  });
});

describe("formatCitationTriples", () => {
  it("formats triples with issuer and effective date", () => {
    const citations = buildStructuredCitations([article]);
    const text = formatCitationTriples(citations);
    expect(text).toContain("📎 出典");
    expect(text).toContain("発出：厚生労働省");
    expect(text).toContain("令和7年6月1日");
  });

  it("returns empty string when no citations", () => {
    expect(formatCitationTriples([])).toBe("");
  });
});

describe("suggestRelatedLaws", () => {
  it("suggests parent law when only 安衛則 hit", () => {
    const result = suggestRelatedLaws("足場の手すり", [
      { ...article, lawShort: "安衛則", articleNum: "第563条" },
    ]);
    const shortNames = result.map((r) => r.lawShort);
    expect(shortNames).toContain("安衛法");
  });

  it("suggests 作環測法 for 特化則 hit", () => {
    const result = suggestRelatedLaws("有機溶剤", [
      { ...article, law: "有機溶剤中毒予防規則", lawShort: "有機則" },
    ]);
    const shortNames = result.map((r) => r.lawShort);
    expect(shortNames).toContain("作環測法");
  });

  it("returns empty when no articles", () => {
    expect(suggestRelatedLaws("熱中症", [])).toEqual([]);
  });
});

describe("suggestDigDeeperLinks", () => {
  it("returns accidents link for 熱中症 query", () => {
    const result = suggestDigDeeperLinks("熱中症対策を教えて", [article]);
    const accidentLink = result.find((d) => d.kind === "accidents");
    expect(accidentLink).toBeDefined();
    expect(decodeURIComponent(accidentLink?.href ?? "")).toContain("熱中症");
  });

  it("returns industry report link for construction keywords", () => {
    const result = suggestDigDeeperLinks("足場の墜落事故", [article]);
    const reportLink = result.find((d) => d.kind === "report");
    expect(reportLink?.href).toBe("/accidents-reports/construction");
  });
});

describe("detectOutOfScopeLawReferences", () => {
  it("flags fabricated law name", () => {
    const result = detectOutOfScopeLawReferences(
      "化学物質管理関連通達第60条によれば…",
      ["安衛則"]
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain("通達");
  });

  it("does not flag known lawShort references", () => {
    const result = detectOutOfScopeLawReferences(
      "安衛則第612条の2では…",
      ["安衛則"]
    );
    expect(result).toEqual([]);
  });

  it("does not flag 同法 / 本法 references", () => {
    const result = detectOutOfScopeLawReferences(
      "同法第15条および本法第20条に基づき…",
      ["安衛法"]
    );
    expect(result).toEqual([]);
  });
});

describe("detectUngroundedAssertions", () => {
  it("returns true when multiple weasel words appear", () => {
    expect(
      detectUngroundedAssertions(
        "おそらく対象になります。多分必要と考えられます。"
      )
    ).toBe(true);
  });

  it("returns false for grounded answers", () => {
    expect(
      detectUngroundedAssertions(
        "安衛則第612条の2により、WBGT値28度以上の場合は対策が必要です。"
      )
    ).toBe(false);
  });
});
