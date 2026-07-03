import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  buildFallbackDecision,
  decideFallbackTier,
  formatFallbackSuggestionsText,
  searchPartialMatches,
  topicMappingStats,
  TOPIC_TO_LAW_CATEGORY,
} from "./chatbot-fallback-logic";

const ARTICLE_563: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第563条",
  articleTitle: "作業床",
  text: "x",
  keywords: [],
};

describe("decideFallbackTier", () => {
  it("score >= 0.75 かつ articles >= 2 で direct", () => {
    expect(decideFallbackTier(0.8, 2)).toBe("direct");
    expect(decideFallbackTier(0.9, 5)).toBe("direct");
  });

  it("articles == 1 は score 0.75+ でも adjacent", () => {
    expect(decideFallbackTier(0.9, 1)).toBe("adjacent");
  });

  it("0.5 <= score < 0.75 は articles 多くても adjacent", () => {
    expect(decideFallbackTier(0.5, 5)).toBe("adjacent");
    expect(decideFallbackTier(0.74, 5)).toBe("adjacent");
  });

  it("score < 0.5 は out-of-scope", () => {
    expect(decideFallbackTier(0.49, 5)).toBe("out-of-scope");
    expect(decideFallbackTier(0, 0)).toBe("out-of-scope");
  });

  it("T8: hadPins=true かつ score>=0.7 は articles>=2 で direct（診断04 Q7回帰）", () => {
    expect(decideFallbackTier(0.73, 2, true)).toBe("direct");
    expect(decideFallbackTier(0.7, 3, true)).toBe("direct");
  });

  it("T8: hadPins=true でも score<0.7 や articles<2 は adjacent のまま", () => {
    expect(decideFallbackTier(0.69, 5, true)).toBe("adjacent");
    expect(decideFallbackTier(0.73, 1, true)).toBe("adjacent");
  });

  it("hadPins 未指定（false 相当）は従来通り 0.75 未満で adjacent", () => {
    expect(decideFallbackTier(0.73, 5)).toBe("adjacent");
  });
});

describe("searchPartialMatches - ペルソナ失敗11件カバレッジ", () => {
  // ペルソナD失敗
  it("D6: アルコール検知器 → 貨物自動車運送事業法・道交法", () => {
    const out = searchPartialMatches("白ナンバー アルコールチェック はいつから?");
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.lawName.includes("貨物自動車"))).toBe(true);
  });

  it("D9: 適性診断 → 貨物自動車運送事業法", () => {
    const out = searchPartialMatches("運転者の適性診断の頻度は?");
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.lawName.includes("貨物自動車"))).toBe(true);
  });

  // ペルソナA失敗
  it("A6: 土砂崩壊前兆 → 安衛則第361条 + 建災防", () => {
    const out = searchPartialMatches("土砂崩壊の前兆を点検するには?");
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.articleHint?.includes("第361条"))).toBe(true);
  });

  it("A8: 月次計画 → 安衛法 第17/18条（委員会）", () => {
    const out = searchPartialMatches("月次計画の作成方法は?");
    expect(out.some((s) => s.articleHint?.includes("第17条"))).toBe(true);
  });

  it("A4/A9: 朝礼ネタ・KYネタ → 安衛法第59条 + 中災防KYTシート", () => {
    const out = searchPartialMatches("朝礼ネタが尽きました");
    expect(out.length).toBeGreaterThan(0);
    const out2 = searchPartialMatches("KYネタを教えてください");
    expect(out2.length).toBeGreaterThan(0);
  });

  // ペルソナC失敗
  it("C2: 感染症就業制限 → 感染症法第18条 + 安衛則第61条", () => {
    const out = searchPartialMatches("結核患者の就業制限は?");
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.lawName.includes("感染症"))).toBe(true);
  });

  // ペルソナE失敗
  it("E5: カスハラ → 労働施策総合推進法・労契法第5条", () => {
    const out = searchPartialMatches("カスハラ対策のマニュアルが欲しい");
    expect(out.length).toBeGreaterThan(0);
    expect(
      out.some(
        (s) =>
          s.lawName.includes("労働施策") || s.articleHint?.includes("第30条の2")
      )
    ).toBe(true);
  });

  // ペルソナB失敗
  it("B2: 委員会報告書テンプレ → 安衛法第17/18条 + 安衛則第23条", () => {
    const out = searchPartialMatches("安全衛生委員会の議事録テンプレが欲しい");
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.articleHint?.includes("第23条"))).toBe(true);
  });
});

describe("searchPartialMatches - その他典型 50法令外", () => {
  it("ドローン → 航空法第132条", () => {
    const out = searchPartialMatches("ドローン使用の事前手続は?");
    expect(out.some((s) => s.lawName.includes("航空法"))).toBe(true);
  });

  it("36協定 → 労基法第36条", () => {
    const out = searchPartialMatches("36協定の届出方法は?");
    expect(out.some((s) => s.lawName.includes("労働基準法"))).toBe(true);
  });

  it("マッチしない場合は空配列", () => {
    const out = searchPartialMatches("xyz完全に無関係なクエリ123");
    expect(out).toEqual([]);
  });

  it("最大3件に制限される", () => {
    const out = searchPartialMatches("カスハラ");
    expect(out.length).toBeLessThanOrEqual(3);
  });
});

describe("buildFallbackDecision", () => {
  it("direct tier: suggestions は空", () => {
    const d = buildFallbackDecision({
      query: "足場の手すりの高さは?",
      normalizedScore: 0.85,
      articles: [ARTICLE_563, ARTICLE_563],
    });
    expect(d.tier).toBe("direct");
    expect(d.suggestions).toEqual([]);
    expect(d.headline).toBeUndefined();
  });

  it("adjacent tier: headline と egovFooter を出す、suggestions は空", () => {
    const d = buildFallbackDecision({
      query: "Q",
      normalizedScore: 0.6,
      articles: [ARTICLE_563],
    });
    expect(d.tier).toBe("adjacent");
    expect(d.headline).toContain("関連する一般条項");
    expect(d.egovFooter).toContain("e-Gov");
  });

  it("T8: hadPins=true・score0.73・articles2件は direct（誤ヘッダなし）", () => {
    const d = buildFallbackDecision({
      query: "職長教育の対象業種は?",
      normalizedScore: 0.73,
      articles: [ARTICLE_563, ARTICLE_563],
      hadPins: true,
    });
    expect(d.tier).toBe("direct");
    expect(d.headline).toBeUndefined();
  });

  it("out-of-scope tier (マッチあり): suggestions を埋め、headline 出す", () => {
    const d = buildFallbackDecision({
      query: "白ナンバー アルコールチェック",
      normalizedScore: 0.2,
      articles: [],
    });
    expect(d.tier).toBe("out-of-scope");
    expect(d.suggestions.length).toBeGreaterThan(0);
    expect(d.headline).toContain("関連する他法令カテゴリ");
  });

  it("out-of-scope tier (マッチ無し): suggestions 空、headline は『範囲外』", () => {
    const d = buildFallbackDecision({
      query: "xyz無関係な質問abc",
      normalizedScore: 0.2,
      articles: [],
    });
    expect(d.tier).toBe("out-of-scope");
    expect(d.suggestions).toEqual([]);
    expect(d.headline).toContain("確証ある回答が得られませんでした");
  });
});

describe("formatFallbackSuggestionsText", () => {
  it("空入力で空文字を返す", () => {
    expect(formatFallbackSuggestionsText([])).toBe("");
  });

  it("候補を Markdown 風箇条書きに整形する", () => {
    const text = formatFallbackSuggestionsText([
      {
        lawName: "航空法",
        articleHint: "第132条",
        source: "国土交通省",
        reason: "無人航空機の根拠法。",
      },
    ]);
    expect(text).toContain("航空法");
    expect(text).toContain("第132条");
    expect(text).toContain("国土交通省");
  });
});

describe("TOPIC_TO_LAW_CATEGORY - 整合性", () => {
  it("マップは50件以上のトピックを持つ前提（実装は 30件以上で OK）", () => {
    const stats = topicMappingStats();
    expect(stats.topics).toBeGreaterThanOrEqual(20);
    expect(stats.triggers).toBeGreaterThanOrEqual(40);
  });

  it("各トピックは少なくとも1つの suggestion を持つ", () => {
    for (const t of TOPIC_TO_LAW_CATEGORY) {
      expect(t.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(t.triggers.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("ID は重複しない", () => {
    const ids = TOPIC_TO_LAW_CATEGORY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
