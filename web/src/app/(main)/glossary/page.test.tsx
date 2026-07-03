import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GlossaryPage from "./page";

describe("/glossary page (用語辞書)", () => {
  it("見出しと収録語数の案内を描画", () => {
    render(<GlossaryPage />);
    expect(screen.getByText("安全用語辞書")).toBeDefined();
    expect(screen.getByText(/五十音順で収録/)).toBeDefined();
  });

  it("代表的な用語が描画される", () => {
    render(<GlossaryPage />);
    expect(screen.getByText("KY活動")).toBeDefined();
    expect(screen.getByText("リスクアセスメント")).toBeDefined();
  });

  it("五十音インデックスのボタンが 44px タップ標的を満たす", () => {
    render(<GlossaryPage />);
    const kana = screen.getByRole("button", { name: "あ行" });
    expect(kana.className).toContain("min-h-[44px]");
    expect(kana.className).toContain("min-w-[44px]");
  });

  it("用語カードの関連ページリンクが 44px タップ標的を満たす", () => {
    render(<GlossaryPage />);
    const relatedLinks = screen.getAllByRole("link", { name: /法令チャット/ });
    expect(relatedLinks.length).toBeGreaterThan(0);
    for (const link of relatedLinks) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });
});
