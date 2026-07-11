import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  buildStructuredCitations,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
  sanitizePlaceholderCitations,
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

  it("does not flag full official law names that share no substring with lawShort", () => {
    // 「労働安全衛生法」⊅「安衛法」、正式名称そのものでの言及も安全と判定する
    const result = detectOutOfScopeLawReferences(
      "労働安全衛生法第66条の10に基づき、酸素欠乏症等防止規則第11条を確認してください。",
      ["安衛則"]
    );
    expect(result).toEqual([]);
  });

  it("does not split long-vowel law names such as クレーン等安全規則", () => {
    // 「ー」が文字クラスから漏れていると「ン等安全規則」に分断されて偽の範囲外警告になる
    const result = detectOutOfScopeLawReferences(
      "クレーン等安全規則第22条により5トン以上は免許が必要です。",
      ["クレーン則"]
    );
    expect(result).toEqual([]);
  });

  it("does not flag 附則 of known laws (GQ12: ストレスチェック努力義務の根拠)", () => {
    // 「労働安全衛生法附則第4条」は既知法令（安衛法）の附則＝範囲内扱いにする。
    // 短縮名照合（安衛法⊄労働安全衛生法附則）だけではすり抜けて偽警告になっていた。
    const result = detectOutOfScopeLawReferences(
      "常時50人未満の事業場は、労働安全衛生法附則第4条により当分の間努力義務とされています。",
      ["安衛法", "安衛則"]
    );
    expect(result).toEqual([]);
  });

  it("still flags unknown laws even after full-name containment relaxation", () => {
    const result = detectOutOfScopeLawReferences(
      "宇宙作業安全確保法第3条によれば…",
      ["安衛則"]
    );
    expect(result).toContain("宇宙作業安全確保法");
  });
});

describe("sanitizePlaceholderCitations", () => {
  it("strips the literal YYYY年MM月 enactment placeholder but keeps the issuer", () => {
    const result = sanitizePlaceholderCitations(
      "クレーン則第22条（施行：YYYY年MM月、所管：厚生労働省）により5トン以上は免許が必要です。"
    );
    expect(result).not.toContain("YYYY");
    expect(result).toContain("クレーン則第22条");
    expect(result).toContain("所管：厚生労働省");
  });

  it("removes the whole parenthetical when nothing but the placeholder remains", () => {
    const result = sanitizePlaceholderCitations("安衛則第518条（施行：YYYY年MM月）が根拠です。");
    expect(result).not.toContain("YYYY");
    expect(result).not.toMatch(/（\s*）/);
    expect(result).toContain("安衛則第518条");
  });

  it("removes an unfilled 第XX条 placeholder parenthetical", () => {
    const result = sanitizePlaceholderCitations("根拠は○○則第XX条（施行：2020年4月）です。");
    expect(result).not.toContain("第XX条");
  });

  it("leaves answers with real dates and article numbers untouched", () => {
    const original = "安衛則第612条の2（施行：2023年4月、所管：厚生労働省）に基づきます。";
    expect(sanitizePlaceholderCitations(original)).toBe(original);
  });

  it("is a no-op on text with no placeholder tokens", () => {
    const original = "特に問題のない通常の回答テキストです。";
    expect(sanitizePlaceholderCitations(original)).toBe(original);
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
