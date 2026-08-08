import { describe, expect, it } from "vitest";
import { resolveFulltextRagArticles } from "./rag-fallback";
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

  it("全文非対象法令（安衛法）の条番号は発火しない（母集団外）", async () => {
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
