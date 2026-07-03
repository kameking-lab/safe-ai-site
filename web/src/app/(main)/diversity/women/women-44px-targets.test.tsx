import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import WomenPage from "./page";

// 柱0: アフィリエイトボタン(Amazon/楽天)・関連ページナビの3リンクが
// py-2/px-3 py-2 text-xs(≈32px)で44px未満だった既存欠陥を是正。

function renderPage() {
  render(
    <LanguageProvider>
      <FuriganaProvider>
        <EasyJapaneseProvider>
          <WomenPage />
        </EasyJapaneseProvider>
      </FuriganaProvider>
    </LanguageProvider>,
  );
}

describe("/diversity/women 44pxタップ標的", () => {
  it("Amazon/楽天のアフィリエイトボタンがすべて min-h-[44px] を持つ", () => {
    renderPage();
    const amazonLinks = screen.getAllByRole("link", { name: /Amazonで探す/ });
    const rakutenLinks = screen.getAllByRole("link", { name: /楽天で探す/ });
    expect(amazonLinks.length).toBeGreaterThan(0);
    expect(rakutenLinks.length).toBeGreaterThan(0);
    for (const link of [...amazonLinks, ...rakutenLinks]) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("関連ページナビの3リンクがすべて min-h-[44px] を持つ", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "関連ページ" });
    const links = nav.querySelectorAll("a");
    expect(links.length).toBe(3);
    links.forEach((link) => {
      expect(link.className).toContain("min-h-[44px]");
    });
  });

  it("法令アコーディオンの開閉ボタンがすべて min-h-[44px] を持つ", () => {
    renderPage();
    const toggles = screen.getAllByRole("button", { expanded: false });
    expect(toggles.length).toBeGreaterThan(0);
    toggles.forEach((toggle) => {
      expect(toggle.className).toContain("min-h-[44px]");
    });
  });
});
