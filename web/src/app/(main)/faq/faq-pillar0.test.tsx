import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import FAQHubPage from "./page";
import FAQSearchPage from "./search/page";

// /faq/[category] は useParams に依存するためモックする
vi.mock("next/navigation", () => ({
  useParams: () => ({ category: "law-system" }),
}));
import FAQCategoryPage from "./[category]/page";

describe("/faq 柱0 44pxタップ標的", () => {
  it("ハブ: カテゴリ「質問一覧を見る」リンクが 44px タップ標的を満たす", () => {
    render(<FAQHubPage />);
    const link = screen.getAllByRole("link", { name: /の質問一覧を見る/ })[0];
    expect(link?.className).toContain("min-h-[44px]");
    expect(link?.className).toContain("items-center");
  });

  it("ハブ: 関連ツールのチップが 44px タップ標的を満たす", () => {
    render(<FAQHubPage />);
    const chip = screen.getByRole("link", { name: "法令チャット（AI）" });
    expect(chip.className).toContain("min-h-[44px]");
    expect(chip.className).toContain("items-center");
  });

  it("検索: よく検索されるキーワードのチップが 44px タップ標的を満たす", () => {
    render(<FAQSearchPage />);
    const tag = screen.getByRole("button", { name: "ストレスチェック" });
    expect(tag.className).toContain("min-h-[44px]");
    expect(tag.className).toContain("items-center");
  });

  it("カテゴリ: カテゴリ内絞り込み入力が 44px タップ標的を満たす", () => {
    render(<FAQCategoryPage />);
    const input = screen.getByPlaceholderText("このカテゴリ内で絞り込み…");
    expect(input.className).toContain("min-h-[44px]");
  });

  it("ハブ: 「FAQを検索する」リンクが 44px タップ標的を満たす", () => {
    render(<FAQHubPage />);
    const link = screen.getByRole("link", { name: /FAQを検索する/ });
    expect(link.className).toContain("min-h-[44px]");
  });

  it("検索: 検索結果の開閉ボタンが 44px タップ標的を満たす", () => {
    render(<FAQSearchPage />);
    const input = screen.getByPlaceholderText(/例: ストレスチェック/);
    fireEvent.change(input, { target: { value: "ストレスチェック" } });
    const toggles = screen.getAllByRole("button", { expanded: false });
    expect(toggles.length).toBeGreaterThan(0);
    toggles.forEach((toggle) => {
      expect(toggle.className).toContain("min-h-[44px]");
    });
  });
});

describe("/faq E-E-A-T監修者バイライン", () => {
  it("ハブ: 監修者バイラインが/aboutへのリンクとして表示される", () => {
    render(<FAQHubPage />);
    const byline = screen.getByRole("link", { name: /労働安全衛生コンサルタント（登録番号260022）/ });
    expect(byline.getAttribute("href")).toBe("/about");
  });

  it("カテゴリ: 監修者バイラインが/aboutへのリンクとして表示される", () => {
    render(<FAQCategoryPage />);
    const byline = screen.getByRole("link", { name: /労働安全衛生コンサルタント（登録番号260022）/ });
    expect(byline.getAttribute("href")).toBe("/about");
  });

  it("カテゴリ: FAQPage JSON-LD に Person contributor が配線されている", () => {
    const { container } = render(<FAQCategoryPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const parsed = JSON.parse(script!.innerHTML) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("FAQPage");
    expect((parsed.contributor as { name?: string })?.name).toBe(
      "労働安全衛生コンサルタント（登録番号260022）"
    );
  });
});
