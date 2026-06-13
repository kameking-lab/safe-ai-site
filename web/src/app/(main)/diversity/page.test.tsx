import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import DiversityPage from "./page";

function renderPage() {
  return render(
    <LanguageProvider>
      <FuriganaProvider>
        <EasyJapaneseProvider>
          <DiversityPage />
        </EasyJapaneseProvider>
      </FuriganaProvider>
    </LanguageProvider>,
  );
}

describe("/diversity page (多様な働き方の労働安全)", () => {
  it("ページ見出しを描画", () => {
    renderPage();
    expect(screen.getByText("多様な働き方の労働安全")).toBeDefined();
  });

  it("主要セクションのアンカーが存在", () => {
    renderPage();
    for (const id of ["women", "elderly", "migrant", "nonregular", "disability", "lgbtq", "remote"]) {
      expect(document.getElementById(id), `#${id} が見つからない`).toBeTruthy();
    }
  });

  it("目次のジャンプリンクが 44px タップ標的を満たす", () => {
    renderPage();
    const toc = screen.getByRole("navigation", { name: "目次" });
    const link = toc.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.className).toContain("min-h-[44px]");
  });

  it("文字ダイエット後も一次資料確認の注意書きを保持", () => {
    renderPage();
    expect(screen.getByText(/一次資料・専門家にご確認ください/)).toBeDefined();
  });
});
