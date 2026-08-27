import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FeaturesIndexClient } from "./features-index-client";
import { FEATURE_PORTFOLIO } from "@/config/feature-portfolio";

const VISIBLE_FEATURES = FEATURE_PORTFOLIO.filter(
  (feature) => feature.tier !== 4 && feature.searchable,
);

function renderClient() {
  return render(
    <LanguageProvider>
      <FeaturesIndexClient />
    </LanguageProvider>,
  );
}

describe("/features 機能一覧クライアント", () => {
  it("ヒーロー見出しを描画", () => {
    renderClient();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "目的と運用状態から機能を選ぶ",
      }),
    ).toBeDefined();
  });

  it("Tier 1〜3の公開入口を描画し、Tier 4を主力一覧へ混ぜない", () => {
    renderClient();
    const links = [
      ...screen.getAllByText("機能を開く"),
      ...screen.getAllByText("サンプルを確認"),
    ];
    expect(links).toHaveLength(VISIBLE_FEATURES.length);
    expect(screen.queryByText("外部API")).toBeNull();
  });

  it("Tierフィルタが44pxタップ標的とpressed状態を持つ", () => {
    renderClient();
    const allBtn = screen.getByRole("button", {
      name: `すべて（${VISIBLE_FEATURES.length}）`,
    });
    expect(allBtn.className).toContain("portal-button-secondary");
    expect(allBtn.className).toContain("items-center");
    expect(allBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("機能リンクは44px以上のタップ標的を維持する", () => {
    renderClient();
    const tryLink = screen.getAllByText("機能を開く")[0]?.closest("a");
    expect(tryLink?.className).toContain("min-h-11");
  });

  it("主力・実務・サンプルを見分けられ、Safety Labsへ移動できる", () => {
    renderClient();
    expect(screen.getByText("Tier 1：主力機能")).toBeTruthy();
    expect(screen.getByText("Tier 2：実務支援")).toBeTruthy();
    expect(screen.getByText("Tier 3：自動化サンプル")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Safety Labsを見る" })
        .getAttribute("href"),
    ).toBe("/automation-examples");
  });

  it("安全研修・AI実務研修・低リスク建設計算へ直接移動できる", () => {
    renderClient();
    for (const [name, href] of [
      ["安全研修", "/training/safety-seminars"],
      ["AI実務研修", "/training/ai-seminars"],
      ["建設計算ツール", "/tools/construction-calculators"],
    ] as const) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
    }
    expect(
      screen.queryByRole("link", { name: /建設計算（現場計算機ポータル）/u }),
    ).toBeNull();
  });
});
