import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FEATURE_CATEGORIES } from "@/data/features-catalog";
import CategoryDetailPage from "./page";
import { EmptyCategoryFallback } from "./empty-category-fallback";

describe("/features/[category] 柱0 44pxタップ標的", () => {
  it("各機能カードの公開状態リンクと一覧復帰が44pxを満たす", async () => {
    const category = FEATURE_CATEGORIES[0];
    const ui = await CategoryDetailPage({ params: Promise.resolve({ category: category.id }) });
    render(ui);

    const tryLinks = screen.getAllByRole("link", {
      name: "公開状態を確認して開く",
    });
    expect(tryLinks.length).toBeGreaterThan(0);
    for (const link of tryLinks) {
      expect(link.className).toContain("min-h-11");
    }

    const backLinks = screen.getAllByRole("link", {
      name: "機能一覧へ戻る",
    });
    expect(backLinks.length).toBeGreaterThan(0);
    for (const link of backLinks) {
      expect(link.className).toContain("min-h-11");
    }
  });

  it("下部の一覧復帰と料金・受付状況リンクが44pxを満たす", async () => {
    const category = FEATURE_CATEGORIES[0];
    const ui = await CategoryDetailPage({ params: Promise.resolve({ category: category.id }) });
    render(ui);

    expect(screen.getByRole("link", { name: "機能一覧へ戻る" }).className).toContain(
      "min-h-11",
    );
    expect(screen.getByRole("link", { name: "料金・受付状況を見る" }).className).toContain(
      "min-h-11",
    );
  });

  it("公開0件カテゴリの公式資料・資格finder代替リンクも44pxを満たす", () => {
    render(<EmptyCategoryFallback />);

    for (const label of [
      "厚生労働省の公式資料を確認",
      "資格・教育条件を確認",
    ]) {
      expect(screen.getByRole("link", { name: label }).className).toContain(
        "min-h-11",
      );
    }
  });
});
