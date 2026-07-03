import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FEATURE_CATEGORIES } from "@/data/features-catalog";
import CategoryDetailPage from "./page";

describe("/features/[category] 柱0 44pxタップ標的", () => {
  it("各機能カードの「機能を試す →」「一覧に戻る」リンクが min-h-[44px] を満たす", async () => {
    const category = FEATURE_CATEGORIES[0];
    const ui = await CategoryDetailPage({ params: Promise.resolve({ category: category.id }) });
    render(ui);

    const tryLinks = screen.getAllByRole("link", { name: /機能を試す/ });
    expect(tryLinks.length).toBeGreaterThan(0);
    for (const link of tryLinks) {
      expect(link.className).toContain("min-h-[44px]");
    }

    const backLinks = screen.getAllByRole("link", { name: "一覧に戻る" });
    expect(backLinks.length).toBeGreaterThan(0);
    for (const link of backLinks) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("下部CTAの2リンクが min-h-[44px] を満たす", async () => {
    const category = FEATURE_CATEGORIES[0];
    const ui = await CategoryDetailPage({ params: Promise.resolve({ category: category.id }) });
    render(ui);

    expect(screen.getByRole("link", { name: /ご意見・改善提案を送る/ }).className).toContain(
      "min-h-[44px]",
    );
    expect(screen.getByRole("link", { name: "他のカテゴリを見る" }).className).toContain(
      "min-h-[44px]",
    );
  });

  it("「他のカテゴリ」グリッドの各リンクが min-h-[44px] を満たす", async () => {
    const category = FEATURE_CATEGORIES[0];
    const ui = await CategoryDetailPage({ params: Promise.resolve({ category: category.id }) });
    render(ui);

    const otherCategories = FEATURE_CATEGORIES.filter((c) => c.id !== category.id);
    expect(otherCategories.length).toBeGreaterThan(0);
    for (const c of otherCategories) {
      expect(screen.getByRole("link", { name: c.title }).className).toContain("min-h-[44px]");
    }
  });
});
