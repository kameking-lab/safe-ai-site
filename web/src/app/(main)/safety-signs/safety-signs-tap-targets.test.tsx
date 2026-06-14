import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import { SIGN_CATEGORIES, SAFETY_SIGNS, getSignsByCategory } from "@/data/safety-signs";
import { INDUSTRIES } from "@/data/safety-signs/industry-usage";
import CategoryPage from "./category/[category]/page";
import IndustryPage from "./industry/[industry]/page";
import SignPage from "./sign/[id]/page";

function renderPage(ui: ReactNode) {
  return render(
    <LanguageProvider>
      <FuriganaProvider>
        <EasyJapaneseProvider>{ui}</EasyJapaneseProvider>
      </FuriganaProvider>
    </LanguageProvider>,
  );
}

// 柱0: 標識DBサブページの「戻る」ナビと業種チップは現場ペルソナが
// 標識→カテゴリ→業種を行き来する主たる操作。text-xs の素のリンク(≈16px)や
// px-3 py-2(≈32px)へ退行せず 44px タップ標的を満たすことを保証する。

describe("safety-signs サブページのタップ標的44px化", () => {
  it("カテゴリ詳細: 戻るリンクが min-h-[44px]", async () => {
    const category = SIGN_CATEGORIES.find((c) => getSignsByCategory(c.id).length > 0) ?? SIGN_CATEGORIES[0];
    const ui = await CategoryPage({ params: Promise.resolve({ category: category.id }) });
    renderPage(ui);
    const back = screen.getByRole("link", { name: /標識データベースに戻る/ });
    expect(back.className).toContain("min-h-[44px]");
  });

  it("業種詳細: 戻るリンクと『他の業種ガイド』チップが全て min-h-[44px]", async () => {
    const industry = INDUSTRIES[0];
    const ui = await IndustryPage({ params: Promise.resolve({ industry: industry.id }) });
    renderPage(ui);
    const back = screen.getByRole("link", { name: /標識データベースに戻る/ });
    expect(back.className).toContain("min-h-[44px]");

    const otherChips = screen
      .getAllByRole("link")
      .filter(
        (a) =>
          a.getAttribute("href")?.startsWith("/safety-signs/industry/") &&
          a.className.includes("rounded-lg"),
      );
    expect(otherChips.length).toBeGreaterThan(0);
    for (const chip of otherChips) {
      expect(chip.className).toContain("min-h-[44px]");
    }
  });

  it("標識詳細: 戻るリンクと『業種別ガイドへ』チップが全て min-h-[44px]", async () => {
    const sign = SAFETY_SIGNS[0];
    const ui = await SignPage({ params: Promise.resolve({ id: sign.id }) });
    renderPage(ui);
    const back = screen.getByRole("link", { name: /に戻る/ });
    expect(back.className).toContain("min-h-[44px]");

    const industryChips = screen
      .getAllByRole("link")
      .filter(
        (a) =>
          a.getAttribute("href")?.startsWith("/safety-signs/industry/") &&
          a.className.includes("rounded-lg"),
      );
    expect(industryChips.length).toBeGreaterThan(0);
    for (const chip of industryChips) {
      expect(chip.className).toContain("min-h-[44px]");
    }
  });
});
