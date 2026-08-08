import { describe, expect, it } from "vitest";
import {
  FEATURE_PORTFOLIO,
  FEATURE_SEARCH_GROUPS,
  FEATURE_TIERS,
  getAutomationSamples,
  getFeaturePortfolioLabels,
  getPortfolioFeatureByRoute,
  getSearchablePortfolioFeatures,
  normalizePortfolioRoute,
} from "./feature-portfolio";

describe("feature portfolio", () => {
  it("全エントリをTier 1〜4へ一意に分類し、空欄・unknownを残さない", () => {
    const ids = FEATURE_PORTFOLIO.map((feature) => feature.id);
    const routes = FEATURE_PORTFOLIO.map((feature) => feature.route);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);

    for (const feature of FEATURE_PORTFOLIO) {
      expect(FEATURE_TIERS).toContain(feature.tier);
      expect(feature.route).toMatch(/^\//);
      expect(normalizePortfolioRoute(feature.route)).toBe(feature.route);

      for (const [key, value] of Object.entries(feature)) {
        if (typeof value !== "string") continue;
        expect(value.trim(), `${feature.id}.${key} が空欄`).not.toBe("");
        expect(value, `${feature.id}.${key} に unknown/TBD が残っている`).not.toMatch(
          /\b(?:unknown|tbd)\b/i,
        );
      }
    }
  });

  it("Tierと公開上の役割を混在させない", () => {
    const roleByTier = {
      1: "flagship",
      2: "practical-support",
      3: "automation-sample",
      4: "integrated-or-hidden",
    } as const;

    for (const feature of FEATURE_PORTFOLIO) {
      expect(feature.role, feature.id).toBe(roleByTier[feature.tier]);
      if (feature.tier === 4) {
        expect(feature.searchable, `${feature.id} must not enter search`).toBe(false);
      }
    }
  });

  it("検索可能なポートフォリオが8検索群をすべて持つ", () => {
    const searchable = getSearchablePortfolioFeatures();
    const groups = new Set(searchable.map((feature) => feature.searchGroup));
    expect([...groups].sort()).toEqual([...FEATURE_SEARCH_GROUPS].sort());
    expect(searchable.every((feature) => feature.tier !== 4)).toBe(true);
  });

  it("主力の今日の安全・Visual KYT・法令・化学物質・事故をTier 1に固定する", () => {
    const expected = [
      "/risk",
      "/training/visual-ky",
      "/chatbot",
      "/law-search",
      "/chemical-ra",
      "/accident-news",
    ];
    for (const route of expected) {
      const feature = getPortfolioFeatureByRoute(route);
      expect(feature, `${route} がポートフォリオにない`).toBeDefined();
      expect(feature?.tier, route).toBe(1);
      expect(feature?.role, route).toBe("flagship");
      expect(feature?.searchable, route).toBe(true);
    }
  });

  it("自動化相談はメール受付中の主力で、自動化サンプルとは区別する", () => {
    const consultation = getPortfolioFeatureByRoute("/services/automation");
    const sampleHub = getPortfolioFeatureByRoute("/automation-examples");
    expect(consultation).toMatchObject({
      tier: 1,
      role: "flagship",
      operationalStatus: "operational",
      searchGroup: "tool",
    });
    expect(consultation?.operationalReadiness).toContain("メール相談を受付中");
    expect(sampleHub).toMatchObject({
      tier: 3,
      role: "automation-sample",
      searchGroup: "automation-sample",
    });
  });

  it("heat 3ページを noindex,follow として固定する", () => {
    for (const route of [
      "/heat-illness-prevention",
      "/heat-illness-prevention/slides",
      "/heat-illness-prevention/elearning",
    ]) {
      const feature = getPortfolioFeatureByRoute(route);
      expect(feature, `${route} がポートフォリオにない`).toBeDefined();
      expect(feature?.indexability, route).toBe("noindex-follow");
    }
  });

  it("Galleryへ出すTier 3は、できる・できない・必要設定・データ扱いをすべて持つ", () => {
    const samples = getAutomationSamples();
    expect(samples.length).toBeGreaterThanOrEqual(5);
    for (const feature of samples) {
      expect(feature.tier).toBe(3);
      expect(feature.role).toBe("automation-sample");
      expect(feature.automationSample?.canDo.length, feature.id).toBeGreaterThan(0);
      expect(feature.automationSample?.cannotDo.length, feature.id).toBeGreaterThan(0);
      expect(
        feature.automationSample?.requiredSettings.length,
        feature.id,
      ).toBeGreaterThan(0);
      expect(feature.automationSample?.dataHandling.trim(), feature.id).not.toBe("");
    }
  });

  it("各ラベルを日本語のTier・役割・運用状態・検索群として取得できる", () => {
    const feature = getPortfolioFeatureByRoute("/site-records");
    expect(feature).toBeDefined();
    expect(getFeaturePortfolioLabels(feature!)).toEqual({
      tier: "Tier 3 自動化サンプル",
      role: "自動化サンプル",
      status: "制限付き",
      searchGroup: "自動化サンプル",
    });
  });

  it("同一URLがrelated routeにもある場合は固有エントリを優先する", () => {
    expect(
      getPortfolioFeatureByRoute(
        "/heat-illness-prevention/slides?from=hub#outline",
      )?.id,
    ).toBe("heat-slides");
  });
});
