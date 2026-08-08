import { describe, expect, it } from "vitest";
import { allLawArticles, mhlwLawArticles } from "@/data/laws";
import { searchLawArticles } from "@/lib/law-search";

const quarantine = new Set(mhlwLawArticles);
const articles = allLawArticles.filter((article) => !quarantine.has(article));

describe("法令検索の代表gold set", () => {
  it.each([
    {
      query: "安衛法 第61条",
      lawShort: "安衛法",
      articleNum: "第61条",
      fields: ["lawShort", "articleNum"],
      evidence: "就かせてはならない",
    },
    {
      query: "労働安全衛生法 61条",
      lawShort: "安衛法",
      articleNum: "第61条",
      fields: ["law", "articleNum"],
      evidence: "就かせてはならない",
    },
    {
      query: "クレーン 第61条",
      lawShort: "クレーン則",
      articleNum: "第61条",
      fields: ["articleNum"],
      evidence: "移動式クレーン設置報告書",
    },
    {
      query: "熱中症 安衛則 612条の2",
      lawShort: "安衛則",
      articleNum: "第612条の2",
      fields: ["articleNum", "articleTitle"],
      evidence: "熱中症",
    },
    {
      query: "足場 特別教育",
      lawShort: "安衛則",
      articleNum: "第36条",
      fields: ["keywords", "articleTitle"],
      evidence: "足場",
    },
    {
      query: "フルハーネス",
      lawShort: "安衛則",
      articleNum: "第36条",
      fields: ["keywords", "text"],
      evidence: "フルハーネス",
    },
    {
      query: "石綿",
      lawShort: "石綿則",
      articleNum: "第2条",
      fields: ["law", "lawShort"],
      evidence: "石綿等",
    },
    {
      query: "化学物質 管理者",
      lawShort: "安衛則",
      articleNum: "第12条の5",
      fields: ["articleTitle", "keywords"],
      evidence: "化学物質管理者",
    },
    {
      query: "事業者 義務",
      lawShort: "安衛法",
      articleNum: "第3条",
      fields: ["articleTitle", "keywords", "text"],
      evidence: "しなければならない",
    },
  ] as const)(
    "PF-008-GOLD-9-QUERIES: $query の正本・上位・一致理由を固定する",
    ({ query, lawShort, articleNum, fields, evidence }) => {
      const hits = searchLawArticles(articles, query, "all", 5);
      const top = hits[0];
      expect(top, `${query} should return a top hit`).toBeDefined();
      expect(top?.article.lawShort).toBe(lawShort);
      expect(top?.article.articleNum).toBe(articleNum);
      expect(top?.matchedFields).toEqual(expect.arrayContaining([...fields]));
      expect(top?.matchedSnippet).toContain(evidence);
    },
  );

  it("PF-008-OBLIGATION-SEMANTICS: 「事業者 義務」を事業者だけの部分一致で通さない", () => {
    const top = searchLawArticles(articles, "事業者 義務", "all", 1)[0];
    expect(top?.article.articleTitle).toContain("責務");
    expect(top?.matchedFields).toEqual(
      expect.arrayContaining(["articleTitle", "keywords", "text"]),
    );
    expect(top?.matchedSnippet).toMatch(/しなければならない|責務/);
  });

  it("PF-008-FORMAL-SHORT-EQUIVALENCE: 略称URLも正式名称filterも同じ条文を返す", () => {
    const short = searchLawArticles(articles, "第61条", "安衛法");
    const full = searchLawArticles(
      articles,
      "第61条",
      "労働安全衛生法",
    );
    expect(short[0]?.stableKey).toBe(full[0]?.stableKey);
  });

  it("安衛則563条は旧い収録文でなく確認済みe-Gov本文を返す", () => {
    const hits = searchLawArticles(
      articles,
      "足場 第563条",
      "労働安全衛生規則",
      5,
    );
    const article563 = hits.find(
      ({ article }) => article.articleNum === "第563条",
    )?.article;
    expect(article563?.verificationStatus).toBe("snapshot-hash-verified");
    expect(article563?.sourceKind).toBe("egov-fulltext-snapshot");
    expect(article563?.text).toContain("第三号において同じ");
    expect(article563?.text).toContain("許容曲げ応力の値");
    expect(article563?.text).not.toContain("第3項において同じ");
    expect(article563?.text).not.toContain("毎平方センチメートル495キログラム");
  });
});
