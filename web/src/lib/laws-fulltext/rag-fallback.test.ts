import { describe, expect, it } from "vitest";
import { extractLawArticleReferences, resolveFulltextRagArticles } from "./rag-fallback";
import type { LawArticle } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { searchRelevantArticles } from "@/lib/rag-search";

/**
 * FT-D4 RAG 全文フォールバックの機械固定。
 *
 * hash検証済み全文がRAG母集団へ統合された後も、同じ条文をフォールバックから
 * 重複注入しないことを固定する。条番号直指定は通常RAGで解決し、未検証本文を
 * 別経路から混ぜない。
 */
describe("resolveFulltextRagArticles — 検証済み全文RAGとの重複防止", () => {
  it("安衛則第630条は通常RAGで解決し、フォールバックは重複を返さない", async () => {
    const regular = searchRelevantArticles("安衛則630条について教えて", 10);
    expect(regular.map((x) => x.articleNum)).toContain("第630条");
    const out = await resolveFulltextRagArticles("安衛則630条について教えて", "all", []);
    expect(out).toEqual([]);
  });

  it("漢数字・正式名称ゆらぎも通常RAGで解決し、重複注入しない", async () => {
    const regular = searchRelevantArticles("労働安全衛生規則第六百三十条は？", 10);
    expect(regular.map((x) => x.articleNum)).toContain("第630条");
    expect(
      await resolveFulltextRagArticles("労働安全衛生規則第六百三十条は？", "all", [])
    ).toEqual([]);
  });

  it("多段枝番（第34条の2の3）も通常RAGで解決し、重複注入しない", async () => {
    const regular = searchRelevantArticles("安衛則34条の2の3の内容は？", 10);
    expect(regular.map((x) => x.articleNum)).toContain("第34条の2の3");
    expect(
      await resolveFulltextRagArticles("安衛則34条の2の3の内容は？", "all", [])
    ).toEqual([]);
  });

  it("curated 収録済みの条（第577条の2）は返さない＝通常 RAG に委ねる", async () => {
    const out = await resolveFulltextRagArticles("安衛則577条の2について", "all", []);
    expect(out).toEqual([]);
  });

  it("条番号を直指定しない通常質問では 1 件も発火しない（eval 非劣化の要）", async () => {
    expect(await resolveFulltextRagArticles("足場の点検は誰が行いますか？", "all", [])).toEqual([]);
    expect(await resolveFulltextRagArticles("酸欠作業に必要な資格は？", "all", [])).toEqual([]);
    expect(await resolveFulltextRagArticles("熱中症対策のWBGT基準は？", "all", [])).toEqual([]);
  });

  it("法令名の無い裸の条番号は発火しない（誤注入回避）", async () => {
    expect(await resolveFulltextRagArticles("630条って何ですか？", "all", [])).toEqual([]);
  });

  it("検証済み安衛法の単条指定は通常RAGに委ねる", async () => {
    expect(await resolveFulltextRagArticles("安衛法61条について", "all", [])).toEqual([]);
  });

  it("存在しない条番号は発火しない", async () => {
    expect(await resolveFulltextRagArticles("安衛則99999条", "all", [])).toEqual([]);
  });

  it("既に RAG がヒット済みの条は重複注入しない", async () => {
    const already: LawArticle[] = [
      {
        law: "労働安全衛生規則",
        lawShort: "安衛則",
        articleNum: "第630条",
        articleTitle: "食堂及び炊事場",
        text: "既存",
        keywords: [],
      },
    ];
    expect(await resolveFulltextRagArticles("安衛則630条", "all", already)).toEqual([]);
  });

  it("lawCategory 文脈でも、検証済みRAG収載条は重複注入しない", async () => {
    expect(await resolveFulltextRagArticles("630条は？", "安衛則", [])).toEqual([]);
  });

  it("複数条を明示した比較では通常検索が落とした検証済み条だけを補う", async () => {
    const article11 = verifiedLawArticles.find(
      (article) =>
        article.lawShort === "酸欠則" && article.articleNum === "第11条",
    );
    expect(article11).toBeDefined();

    const out = await resolveFulltextRagArticles(
      "酸素欠乏症等防止規則第11条と第12条の違いを確認したい",
      "all",
      [article11!],
    );

    expect(out.map((article) => article.articleNum)).toEqual(["第12条"]);
    expect(out[0]).toMatchObject({
      lawShort: "酸欠則",
      verificationStatus: "snapshot-hash-verified",
    });
  });
});


describe("law/article pairing instead of the original Cartesian expansion", () => {
  const pairs = (query: string) => extractLawArticleReferences(query).map(({law, articleNum}) => `${law.lawShort}|${articleNum}`);
  it("pairs the law, order and crane provisions without invented cross-pairs", async () => {
    const query = "安衛法61条、安衛令20条第16号、クレーン則221条と222条";
    expect(pairs(query)).toEqual(["安衛法|第61条", "安衛令|第20条", "クレーン則|第221条", "クレーン則|第222条"]);
    const result = await resolveFulltextRagArticles(query, "all", []);
    expect(result.map(a => `${a.lawShort}|${a.articleNum}`)).toEqual(pairs(query));
  });
  it("preserves the oxygen chain and does not misread annex 6 as article 6", () => {
    expect(pairs("安衛法14条、安衛令6条第21号・別表第6、酸欠則2条と11条")).toEqual([
      "安衛法|第14条", "安衛令|第6条", "酸欠則|第2条", "酸欠則|第11条",
    ]);
  });
  it("does not confuse the law name embedded in the full order name", () => {
    expect(pairs("労働安全衛生法第六十一条、労働安全衛生法施行令第二十条")).toEqual([
      "安衛法|第61条", "安衛令|第20条",
    ]);
  });
  it("keeps the same number in two different laws", async () => {
    const out = await resolveFulltextRagArticles("安衛法1条と安衛則1条", "all", []);
    expect(out.map(a => `${a.lawShort}|${a.articleNum}`)).toEqual(["安衛法|第1条", "安衛則|第1条"]);
  });
  it("preserves law names containing kanji numbers", () => {
    expect(pairs("四アルキル鉛則第18条と第19条")).toEqual(["四アルキル鉛則|第18条", "四アルキル鉛則|第19条"]);
    expect(pairs("四アルキル鉛中毒予防規則第18条")).toEqual(["四アルキル鉛則|第18条"]);
  });
  it("does not guess ambiguous or reverse-order law references", () => {
    expect(pairs("安衛法と安衛令の第1条")).toEqual([]);
    expect(pairs("61条は安衛法です")).toEqual([]);
    expect(pairs("酸欠則11条。12条は何の法令ですか")).toEqual(["酸欠則|第11条"]);
    expect(pairs("酸欠則11条\n12条は何の法令ですか")).toEqual(["酸欠則|第11条"]);
    expect(pairs("安衛法61条と未収録規則2条")).toEqual(["安衛法|第61条"]);
    expect(pairs("安衛法附則第1条と第2条")).toEqual([]);
    expect(extractLawArticleReferences("附則第1条", "安衛法")).toEqual([]);
  });
  it("does not let a selected category invent another pair", () => {
    const out = extractLawArticleReferences("安衛法61条", "安衛則");
    expect(out.map(a => a.law.lawShort)).toEqual(["安衛法"]);
  });
  it.each(["足場の点検は誰が行いますか？", "酸欠作業に必要な資格は？", "玉掛け0.5tと1tの違い", "クレーンのつり上げ荷重と吊荷重量", "熱中症対策のWBGT基準は？"])("leaves original search results unchanged for %s", async query => {
    const original = searchRelevantArticles(query, 10);
    const supplemental = await resolveFulltextRagArticles(query, "all", original);
    expect(supplemental).toEqual([]);
    expect([...original, ...supplemental]).toEqual(original);
    expect(original.length).toBeGreaterThan(0);
  });
});
