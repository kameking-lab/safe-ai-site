import { describe, it, expect } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

describe("fall-arrest RAG", () => {
  it("returns 518 series for 墜落制止用器具 usage obligations", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("墜落制止用器具の使用義務は何条？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    const has518Series = nums.some((n) => ["第518条", "第520条", "第521条"].includes(n));
    expect(has518Series).toBe(true);
  });

  it("returns 539の2-9 for rope high-altitude work questions", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("ロープ高所作業のライフラインは何条？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    const has539Series = nums.some((n) => n.startsWith("第539条"));
    expect(has539Series).toBe(true);
  });

  it("returns 第36条 for フルハーネス特別教育 questions", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("フルハーネス特別教育の根拠条文は？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(nums).toContain("第36条");
  });
});

describe("Chrome R8 emergency RAG pins", () => {
  it("pins 安衛法第60条 + 安衛令第19条 for 職長教育 questions", () => {
    const { articles } = searchRelevantArticlesWithScore("職長教育は何条で誰が対象？", 5);
    const has60 = articles.some(
      (a) => a.law === "労働安全衛生法" && a.articleNum === "第60条"
    );
    const has19 = articles.some(
      (a) => a.law === "労働安全衛生法施行令" && a.articleNum === "第19条"
    );
    expect(has60).toBe(true);
    expect(has19).toBe(true);
  });

  it("安衛令第19条 lists all industries including 令和5年追加 (食料品製造業 etc)", () => {
    const { articles } = searchRelevantArticlesWithScore("職長教育 対象業種", 5);
    const ordinance19 = articles.find(
      (a) => a.law === "労働安全衛生法施行令" && a.articleNum === "第19条"
    );
    expect(ordinance19).toBeTruthy();
    const text = ordinance19?.text ?? "";
    for (const industry of [
      "建設業",
      "製造業",
      "電気業",
      "ガス業",
      "自動車整備業",
      "機械修理業",
      "食料品製造業",
      "新聞業",
      "出版業",
      "製本業",
      "印刷物加工業",
    ]) {
      expect(text).toContain(industry);
    }
  });

  it("pins 安衛則第612条の2 for 熱中症 / WBGT questions", () => {
    const { articles } = searchRelevantArticlesWithScore("熱中症のWBGT義務は何条？", 5);
    const hit = articles.some(
      (a) => a.law === "労働安全衛生規則" && a.articleNum === "第612条の2"
    );
    expect(hit).toBe(true);
  });
});

describe("O5: synonyms.ts:166 是正＋口語「頻度」「資格」拡充（診断書04 T4）", () => {
  it("「健康診断の頻度」で安衛則第44条・第45条が top5 に入る", () => {
    const { articles } = searchRelevantArticlesWithScore("健康診断の頻度", 5);
    const nums = articles
      .filter((a) => a.lawShort === "安衛則")
      .map((a) => a.articleNum);
    expect(nums).toContain("第44条");
    expect(nums).toContain("第45条");
  });

  it("「酸欠 資格」で酸欠則第11条が top5 に入る", () => {
    const { articles } = searchRelevantArticlesWithScore("酸欠 資格", 5);
    const hit = articles.some((a) => a.lawShort === "酸欠則" && a.articleNum === "第11条");
    expect(hit).toBe(true);
  });

  it("気積の同義語展開先が事務所則第2条（第14条=排水は誤り）", () => {
    const { articles } = searchRelevantArticlesWithScore("気積の基準", 5);
    const jimusho = articles.find((a) => a.lawShort === "事務所則");
    expect(jimusho?.articleNum).toBe("第2条");
  });
});

describe("S7 T6: 「換気」PINの文脈ガード（診断書04 T6・fresh Q79）", () => {
  it("酸欠文脈の質問では一般語「換気」PINで事務所則600/601/604条が乗っ取らない", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "酸素欠乏症等の防止措置（換気・呼吸用保護具）の根拠条文は？",
      5
    );
    const jimushoRules = articles.filter(
      (a) => a.lawShort === "安衛則" && ["第600条", "第601条", "第604条"].includes(a.articleNum)
    );
    expect(jimushoRules).toHaveLength(0);
    const hit = articles.some((a) => a.lawShort === "酸欠則" && a.articleNum === "第5条");
    expect(hit).toBe(true);
  });

  it("気積の質問（酸欠文脈なし）では従来どおり事務所則600/601/604条がPINされる", () => {
    const { articles } = searchRelevantArticlesWithScore("気積・採光・換気の基準は？", 5);
    const nums = articles.filter((a) => a.lawShort === "安衛則").map((a) => a.articleNum);
    expect(nums).toContain("第600条");
    expect(nums).toContain("第601条");
  });
});

describe("S7 T8: PIN確定ヒットは hadPins=true を返す（診断書04 Q7: 職長教育adjacent誤発火）", () => {
  it("職長教育の対象業種質問はPINが刺さり hadPins=true・normalizedScore>=0.7", () => {
    const { hadPins, normalizedScore, articles } = searchRelevantArticlesWithScore(
      "職長教育の対象業種は？",
      5
    );
    expect(hadPins).toBe(true);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    expect(articles.length).toBeGreaterThanOrEqual(2);
  });

  it("PINなしの一般検索は hadPins=false", () => {
    const { hadPins } = searchRelevantArticlesWithScore("墜落制止用器具の使用義務は何条？", 5);
    expect(hadPins).toBe(false);
  });
});
