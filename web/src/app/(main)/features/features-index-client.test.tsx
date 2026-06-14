import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FeaturesIndexClient } from "./features-index-client";
import { FEATURES } from "@/data/features-catalog";

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
    expect(screen.getByText("安全AIポータルの全機能を、1ページで。")).toBeDefined();
  });

  it("全機能カードを描画（カタログ件数と一致）", () => {
    renderClient();
    // 各カードの主CTA「機能を試す →」がカタログ件数ぶん存在
    const tryLinks = screen.getAllByText("機能を試す →");
    expect(tryLinks).toHaveLength(FEATURES.length);
  });

  it("カテゴリフィルタのチップが 44px タップ標的を満たす", () => {
    renderClient();
    // 「すべて（N）」ボタン
    const allBtn = screen.getByRole("button", { name: `すべて（${FEATURES.length}）` });
    expect(allBtn.className).toContain("min-h-[44px]");
    expect(allBtn.className).toContain("items-center");
  });

  it("主CTA・副CTAともに 44px タップ標的を満たす", () => {
    renderClient();
    const tryLink = screen.getAllByText("機能を試す →")[0]?.closest("a");
    const moreLink = screen.getAllByText("詳しく見る")[0]?.closest("a");
    expect(tryLink?.className).toContain("min-h-[44px]");
    expect(moreLink?.className).toContain("min-h-[44px]");
  });

  it("クイックリンク（5分ツアー等）が 44px タップ標的を満たす", () => {
    renderClient();
    const tour = screen.getByRole("link", { name: "5分ツアー" });
    expect(tour.className).toContain("min-h-[44px]");
  });
});
