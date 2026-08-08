import { describe, expect, it } from "vitest";
import {
  HEAT_CONTROL_HIERARCHY,
  HEAT_CONTROL_HIERARCHY_META,
  HEAT_GOODS_CATEGORIES,
  HEAT_STATISTICS_META,
  HEAT_WORKPLACE_CASUALTY_TREND,
} from "./heat-illness-campaign";

describe("heat illness campaign data", () => {
  it("対策を本質・工学・管理・PPEの順に固定する", () => {
    expect(HEAT_CONTROL_HIERARCHY.map((item) => item.title)).toEqual([
      "本質的対策",
      "工学的対策",
      "管理的対策",
      "個人用保護具・補助用品",
    ]);
    expect(HEAT_CONTROL_HIERARCHY_META).toMatchObject({
      informationKind: "siteCommentary",
      displayLabel: "サイト独自の優先順整理",
      humanReviewedAt: null,
    });
    expect(HEAT_CONTROL_HIERARCHY_META.limitation).toContain(
      "法令・通達の条項順ではありません",
    );
  });

  it("全用品カテゴリに用途・注意・限界・分類・公式根拠・広告表示を持つ", () => {
    expect(HEAT_GOODS_CATEGORIES.length).toBeGreaterThanOrEqual(18);
    for (const category of HEAT_GOODS_CATEGORIES) {
      expect(category.purpose).not.toBe("");
      expect(category.suitableFor).not.toBe("");
      expect(category.caution).not.toBe("");
      expect(category.limitation).not.toBe("");
      expect(new URL(category.sourceHref).protocol).toBe("https:");
      expect(category.commercialDisclosure).toBe("広告なし");
    }
  });

  it("用品説明に断定・公式推奨・架空レビューを混ぜない", () => {
    const text = JSON.stringify(HEAT_GOODS_CATEGORIES);
    expect(text).not.toMatch(
      /必ず防げる|完全に防ぐ|公式推奨商品|効果保証|利用者レビュー|満足度|売上1位/,
    );
  });

  it("統計は厚労省の確定値だけで、syntheticを混ぜない", () => {
    expect(HEAT_STATISTICS_META.latestStatus).toBe("確定値");
    expect(HEAT_STATISTICS_META).toMatchObject({
      periodStartYear: 2016,
      periodEndYear: 2025,
      sourceRetrievedAt: "2026-07-29",
      humanReviewedAt: null,
      verificationStatus: "official-url-located-content-review-pending",
      definition: "死亡者数は死傷者数の内数",
    });
    expect(HEAT_STATISTICS_META).not.toHaveProperty("confirmedAt");
    expect(HEAT_WORKPLACE_CASUALTY_TREND).toHaveLength(10);
    expect(
      HEAT_WORKPLACE_CASUALTY_TREND.find((row) => row.year === 2025),
    ).toEqual({ year: 2025, casualties: 1803, deaths: 19 });
    expect(
      JSON.stringify({
        trend: HEAT_WORKPLACE_CASUALTY_TREND,
        meta: HEAT_STATISTICS_META,
      }),
    ).not.toMatch(/synthetic|想定例|モック/);
  });
});
