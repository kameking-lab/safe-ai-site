import { describe, expect, it } from "vitest";
import { resolveFulltextRagArticles } from "./rag-fallback";
import type { LawArticle } from "@/data/laws";

/**
 * FT-D4 RAG 全文フォールバックの機械固定。
 *
 * 条番号直指定で curated に無い条だけを全文層から文脈注入し、それ以外では 1 件も発火しない
 * （＝eval:chatbot-gen 51問は構造的に非劣化）ことを固定する。RAG 母集団（curated BM25）は
 * 本関数では一切変えない。
 */
describe("resolveFulltextRagArticles — 条番号直指定の全文注入（母集団不変）", () => {
  it("安衛則の curated 未収録条（第630条）を直指定 → 全文条を1件返す", async () => {
    const out = await resolveFulltextRagArticles("安衛則630条について教えて", "all", []);
    expect(out.length).toBe(1);
    expect(out[0].lawShort).toBe("安衛則");
    expect(out[0].articleNum).toBe("第630条");
    expect(out[0].articleTitle).toBe("食堂及び炊事場"); // caption の外側括弧を外した表記
    expect(out[0].text.length).toBeGreaterThan(0);
  });

  it("漢数字・正式名称ゆらぎでも解決する", async () => {
    const a = await resolveFulltextRagArticles("労働安全衛生規則第六百三十条は？", "all", []);
    expect(a.map((x) => x.articleNum)).toContain("第630条");
  });

  it("多段枝番（第34条の2の3）も解決する", async () => {
    const a = await resolveFulltextRagArticles("安衛則34条の2の3の内容は？", "all", []);
    expect(a.map((x) => x.articleNum)).toContain("第34条の2の3");
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

  it("lawCategory が全文法令なら、法令名を省いた裸の条番号でも解決する（カテゴリ文脈）", async () => {
    const out = await resolveFulltextRagArticles("630条は？", "安衛則", []);
    expect(out.map((x) => x.articleNum)).toContain("第630条");
  });
});
