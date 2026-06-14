import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
});
