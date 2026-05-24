import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  extractCitations,
  formatWarningNote,
  validateCitations,
} from "./chatbot-citation-validator";
import { buildAllowedCitations } from "./chatbot-prompt-builder";

const ARTICLE_563: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第563条",
  articleTitle: "作業床",
  text: "事業者は、足場（一側足場を除く。）における高さ二メートル以上の作業場所には、次に定めるところにより、作業床を設けなければならない。",
  keywords: ["足場", "作業床"],
};

const ARTICLE_61: LawArticle = {
  law: "労働安全衛生法",
  lawShort: "安衛法",
  articleNum: "第61条",
  articleTitle: "就業制限",
  text: "事業者は、クレーンの運転その他の業務で、政令で定めるものについては、…",
  keywords: ["就業制限"],
};

const ARTICLE_20: LawArticle = {
  law: "労働安全衛生法施行令",
  lawShort: "安衛令",
  articleNum: "第20条",
  articleTitle: "就業制限に係る業務",
  text: "法第61条第1項の政令で定める業務は、次のとおりとする。",
  keywords: ["就業制限"],
  itemNumberMap: {
    一: "発破の作業",
    六: "ボイラーの取扱いの業務",
    十一: "最大荷重1トン以上のフォークリフトの運転の業務",
    十六: "クレーンの運転の業務",
  },
};

describe("extractCitations", () => {
  it("法令名+条文番号を抽出する", () => {
    const out = extractCitations("根拠は安衛則第563条です。");
    expect(out).toHaveLength(1);
    expect(out[0].lawShort).toBe("安衛則");
    expect(out[0].ref.article).toBe(563);
  });

  it("正式名称を短縮名に正規化する", () => {
    const out = extractCitations("根拠は労働安全衛生規則 第563条です。");
    expect(out).toHaveLength(1);
    expect(out[0].lawShort).toBe("安衛則");
  });

  it("漢数字（六十一）をアラビア数字に正規化する", () => {
    const out = extractCitations("安衛法第六十一条第一項");
    expect(out).toHaveLength(1);
    expect(out[0].ref.article).toBe(61);
    expect(out[0].ref.paragraph).toBe(1);
  });

  it("枝番（条の2）を抽出する", () => {
    const out = extractCitations("安衛則第151条の21の規定");
    expect(out).toHaveLength(1);
    expect(out[0].ref.article).toBe(151);
    expect(out[0].ref.branch).toBe(21);
  });

  it("号番号を抽出する", () => {
    const out = extractCitations("安衛令第20条第11号でフォークリフトが指定。");
    expect(out).toHaveLength(1);
    expect(out[0].ref.item).toBe(11);
  });

  it("複数引用を順番に抽出する", () => {
    const out = extractCitations(
      "安衛法第61条第1項および安衛令第20条第11号により…"
    );
    expect(out).toHaveLength(2);
    expect(out[0].ref.article).toBe(61);
    expect(out[1].ref.item).toBe(11);
  });

  it("空文字には何も返さない", () => {
    expect(extractCitations("")).toEqual([]);
  });

  it("未知の法令名は抽出しない（雑漢字列の誤検出を避ける）", () => {
    const out = extractCitations("架空法第99条による。");
    expect(out).toEqual([]);
  });
});

describe("validateCitations - Pattern A: 完全ハルシネーション", () => {
  it("構造化条文DBに無い条文番号を Pattern A として検出する", () => {
    // 安衛則第99999条は存在しない
    const allowed = buildAllowedCitations([ARTICLE_563]);
    const result = validateCitations("安衛則第99999条によれば…", allowed);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe("A");
    expect(result.retryRecommended).toBe(true);
    expect(result.shouldDegradeConfidence).toBe(true);
  });

  it("Pattern A を含む応答は警告テキストを生成する", () => {
    const allowed = buildAllowedCitations([ARTICLE_563]);
    const result = validateCitations("安衛則第99999条によれば…", allowed);
    expect(result.warningNote).toContain("構造化条文DBに存在しない引用");
  });
});

describe("validateCitations - Pattern B: スコープ外", () => {
  it("実在するが Layer 1 ホワイトリスト外の条文を Pattern B として検出する", () => {
    // ホワイトリストは安衛則第563条のみ
    const allowed = buildAllowedCitations([ARTICLE_563]);
    // 応答が安衛法第61条（実在）を引用 → Pattern B
    const result = validateCitations("補足として安衛法第61条もご参照ください。", allowed);
    const b = result.findings.filter((f) => f.pattern === "B");
    expect(b.length).toBeGreaterThanOrEqual(1);
    expect(result.retryRecommended).toBe(false); // 低リスク
    expect(result.shouldDegradeConfidence).toBe(true);
  });
});

describe("validateCitations - Pattern C: 号番号誤り", () => {
  it("itemNumberMap に対応しない号番号を Pattern C として検出する", () => {
    const allowed = buildAllowedCitations([ARTICLE_20]);
    // itemNumberMap には 1, 6, 11, 16 がある。10は誤り（実際はフォークリフト=11）
    const result = validateCitations(
      "安衛令第20条第10号によりフォークリフトが指定。",
      allowed
    );
    const c = result.findings.find((f) => f.pattern === "C");
    expect(c).toBeDefined();
    expect(c?.suggestedItems).toBeDefined();
    // 候補に「第11号」が含まれる（10と差分1で最も近い）
    expect(c?.suggestedItems?.some((s) => s.includes("第11号"))).toBe(true);
    expect(result.retryRecommended).toBe(false);
    expect(result.shouldDegradeConfidence).toBe(true);
  });

  it("itemNumberMap と一致する号番号は finding 無し", () => {
    const allowed = buildAllowedCitations([ARTICLE_20]);
    const result = validateCitations(
      "安衛令第20条第11号でフォークリフトが指定。",
      allowed
    );
    expect(result.findings).toEqual([]);
    expect(result.retryRecommended).toBe(false);
    expect(result.shouldDegradeConfidence).toBe(false);
  });
});

describe("validateCitations - 正常系", () => {
  it("Layer 1 ホワイトリスト内の条文を引用した応答は findings 無し", () => {
    const allowed = buildAllowedCitations([ARTICLE_563, ARTICLE_61]);
    const result = validateCitations(
      "結論として安衛則第563条および安衛法第61条が根拠です。",
      allowed
    );
    expect(result.findings).toEqual([]);
    expect(result.retryRecommended).toBe(false);
    expect(result.shouldDegradeConfidence).toBe(false);
    expect(result.warningNote).toBe("");
  });

  it("引用ゼロの応答は findings 無し", () => {
    const allowed = buildAllowedCitations([ARTICLE_563]);
    const result = validateCitations("条文番号を含まない一般論の応答。", allowed);
    expect(result.extracted).toEqual([]);
    expect(result.findings).toEqual([]);
  });
});

describe("formatWarningNote", () => {
  it("空 findings なら空文字を返す", () => {
    expect(formatWarningNote([])).toBe("");
  });
});

describe("validateCitations - 統合: D6 段階的対応", () => {
  it("Pattern A + B 混在: retry 推奨 = true、信頼度降格 = true", () => {
    const allowed = buildAllowedCitations([ARTICLE_563]);
    const result = validateCitations(
      "根拠は安衛則第563条です。補足: 安衛法第61条もご参照ください。さらに安衛則第99999条による…",
      allowed
    );
    const patterns = new Set(result.findings.map((f) => f.pattern));
    expect(patterns.has("A")).toBe(true);
    expect(patterns.has("B")).toBe(true);
    expect(result.retryRecommended).toBe(true);
    expect(result.shouldDegradeConfidence).toBe(true);
  });

  it("Pattern C のみ: retry 推奨 = false、信頼度降格 = true", () => {
    const allowed = buildAllowedCitations([ARTICLE_20]);
    const result = validateCitations(
      "安衛令第20条第10号によりフォークリフトが…",
      allowed
    );
    expect(result.findings.every((f) => f.pattern === "C")).toBe(true);
    expect(result.retryRecommended).toBe(false);
    expect(result.shouldDegradeConfidence).toBe(true);
  });
});
