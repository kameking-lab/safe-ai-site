import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import IndustriesHubPage from "./page";

describe("/industries hub page (業種別案内)", () => {
  it("ページ見出しと業種選択への誘導を描画", () => {
    render(<IndustriesHubPage />);
    expect(screen.getByRole("heading", { name: "業種別の安全管理ポータル" })).toBeDefined();
    expect(screen.getByText(/あなたの業種を選ぶと/)).toBeDefined();
  });

  it("文字ダイエット後はクローラ向けキーワード段落を表示しない", () => {
    render(<IndustriesHubPage />);
    expect(screen.queryByText(/ロングテール/)).toBeNull();
  });

  it("業種カードが各業種ページへ遷移する", () => {
    render(<IndustriesHubPage />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links.some((h) => h?.startsWith("/industries/"))).toBe(true);
  });

  it("業種別統計テーブルの「開く →」リンクが44pxタップ標的を満たす", () => {
    render(<IndustriesHubPage />);
    const links = screen.getAllByRole("link", { name: "開く →" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.className).toContain("min-h-[44px]");
      expect(link.className).toContain("items-center");
    }
  });
});
