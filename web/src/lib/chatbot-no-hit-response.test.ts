/**
 * P1-5「該当条文無し」応答パターンの品質テスト。
 * 社長要件: 「該当無し」で突き放さず、関連条文＋最低限措置＋公式誘導を必ず提示する。
 */

import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import { searchPartialMatches } from "@/lib/chatbot-fallback-logic";
import { buildAllowedCitations } from "@/lib/chatbot-prompt-builder";
import {
  OFFICIAL_GUIDANCE_LINKS,
  buildNoHitTemplate,
  buildNoHitGeminiPrompt,
  formatRelatedArticlesList,
  formatOfficialLinks,
} from "@/lib/chatbot-no-hit-response";

const DISCLAIMER = "本回答はAIによる情報提供であり…専門家にご相談ください。";

function art(lawShort: string, articleNum: string, articleTitle: string): LawArticle {
  return {
    law: lawShort,
    lawShort,
    articleNum,
    articleTitle,
    text: `${articleTitle}に関する条文本文。`,
    keywords: [articleTitle],
  } as LawArticle;
}

describe("P1-5 該当条文無し応答パターン", () => {
  it("公式リンクは e-Gov・あんぜんサイト・労働基準監督署の3つを含む", () => {
    expect(OFFICIAL_GUIDANCE_LINKS).toHaveLength(3);
    const md = formatOfficialLinks();
    expect(md).toContain("laws.e-gov.go.jp");
    expect(md).toContain("anzeninfo.mhlw.go.jp");
    expect(md).toMatch(/労働基準監督署/);
  });

  it("テンプレは『直接規定する条文は特定できませんでした』と正直に述べる", () => {
    const t = buildNoHitTemplate({
      query: "謎の作業の規制",
      relatedArticles: [],
      partialMatches: [],
      disclaimer: DISCLAIMER,
    });
    expect(t).toContain("直接規定する条文");
    expect(t).toContain("特定できませんでした");
  });

  it("テンプレは一般原則（事業者の責務・安衛法第3条）と最低限措置を含む", () => {
    const t = buildNoHitTemplate({
      query: "X",
      relatedArticles: [],
      partialMatches: [],
      disclaimer: DISCLAIMER,
    });
    expect(t).toMatch(/一般原則/);
    expect(t).toContain("安衛法第3条");
    expect(t).toMatch(/リスクアセスメント/);
  });

  it("テンプレは必ず公式リンクと免責を末尾に含む", () => {
    const t = buildNoHitTemplate({
      query: "X",
      relatedArticles: [],
      partialMatches: [],
      disclaimer: DISCLAIMER,
    });
    expect(t).toContain("laws.e-gov.go.jp");
    expect(t).toContain(DISCLAIMER);
  });

  it("関連条文があれば『参考・直接の規定ではない』と明示して列挙する", () => {
    const related = [art("安衛則", "第577条の2", "ばく露低減措置")];
    const t = buildNoHitTemplate({
      query: "X",
      relatedArticles: related,
      partialMatches: [],
      disclaimer: DISCLAIMER,
    });
    expect(t).toMatch(/参考|直接の規定ではありません/);
    expect(t).toContain("第577条の2");
  });

  it("関連条文リストは最大5件に制限される", () => {
    const many = Array.from({ length: 9 }, (_, i) => art("安衛則", `第${100 + i}条`, `T${i}`));
    const md = formatRelatedArticlesList(many);
    const count = (md.match(/第\d+条/g) ?? []).length;
    expect(count).toBe(5);
  });

  it("関連分野（partialMatches）があれば提示する", () => {
    const t = buildNoHitTemplate({
      query: "X",
      relatedArticles: [],
      partialMatches: [
        { lawName: "道路交通法", articleHint: "制限速度", source: "警察庁", reason: "公道走行は道交法の管轄です" },
      ],
      disclaimer: DISCLAIMER,
    });
    expect(t).toContain("道路交通法");
    expect(t).toContain("公道走行は道交法の管轄です");
  });

  it("Geminiプロンプトはホワイトリストと4段構成・禁止事項を含む", () => {
    const allowed = buildAllowedCitations([art("安衛則", "第577条の2", "ばく露低減措置")]);
    const p = buildNoHitGeminiPrompt({
      question: "Q",
      context: "...",
      allowed,
    });
    expect(p).toContain("出力可能な条文番号リスト");
    expect(p).toMatch(/直接規定する条文.*特定できませんでした/);
    expect(p).toMatch(/参考として/);
    expect(p).toMatch(/労働基準監督署/);
    expect(p).toMatch(/架空の通達番号|ホワイトリストに無い条文番号/);
  });

  // 「該当無し」型の実クエリ10件で、関連分野提示が機能することを確認
  const outOfScopeQueries = [
    "カスタマーハラスメント対策の義務は",
    "副業の労働時間管理はどうする",
    "テレワークの労災はどうなる",
    "アルコールチェックの義務",
    "ハラスメント相談窓口の設置義務",
    "個人情報の取扱いルール",
    "障害者雇用の法定雇用率",
    "外国人技能実習生の安全教育",
    "高年齢労働者の安全配慮",
    "メンタルヘルス不調者への対応",
  ];

  it("『該当無し』型10件すべてで突き放さず関連情報＋公式誘導を返す", () => {
    let withSuggestions = 0;
    for (const q of outOfScopeQueries) {
      const partial = searchPartialMatches(q);
      const t = buildNoHitTemplate({
        query: q,
        relatedArticles: [],
        partialMatches: partial,
        disclaimer: DISCLAIMER,
      });
      // 全件: 公式誘導と一般原則を必ず含む（dead-endにしない）
      expect(t).toContain("laws.e-gov.go.jp");
      expect(t).toMatch(/一般原則/);
      if (partial.length > 0) withSuggestions += 1;
    }
    // 少なくとも一部は関連分野マッピングにヒットする（網羅性の担保）
    expect(withSuggestions).toBeGreaterThan(0);
  });
});
