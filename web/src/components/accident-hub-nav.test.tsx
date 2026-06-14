import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccidentHubNav } from "./accident-hub-nav";

describe("AccidentHubNav", () => {
  it("4つの事故系ルートを全て表示", () => {
    render(<AccidentHubNav current="accidents" />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/accidents");
    expect(links).toContain("/accidents-reports");
    expect(links).toContain("/accidents-analytics");
    expect(links).toContain("/accident-news");
  });

  it("現在ページに aria-current=page を付与", () => {
    render(<AccidentHubNav current="accidents-analytics" />);
    const current = screen.getByRole("link", { current: "page" });
    expect(current.getAttribute("href")).toBe("/accidents-analytics");
  });

  it("現在ページの役割説明を表示", () => {
    render(<AccidentHubNav current="accident-news" />);
    expect(screen.getAllByText(/公表事実・匿名・出典付き/).length).toBeGreaterThan(0);
  });

  // r2-01: 件数表記の正確化ガード。「約5,000件」は統計ダッシュボードに帰属し、
  // /accidents(詳細事例292件)を「約5,000件」と過大表現しないこと。
  it("事故DB検索(/accidents)の説明は約5,000件と過大表現しない", () => {
    const { container } = render(<AccidentHubNav current="accidents" />);
    expect(container.textContent).not.toMatch(/5,000/);
    expect(screen.getByText(/出典付き/)).toBeDefined();
  });

  it("統計ダッシュボードの説明が約5,000件の可視化を明示", () => {
    render(<AccidentHubNav current="accidents-analytics" />);
    expect(screen.getByText(/約5,000件.*可視化/)).toBeDefined();
  });

  // 柱0: 事故系ナビは初訪の現場ペルソナが最上部でタップする入口。
  // 全リンクが 44px タップ標的を満たす（px-3 py-1 ≈28px への退行を防ぐ）。
  it("4ルートのナビチップが全て min-h-[44px] タップ標的", () => {
    render(<AccidentHubNav current="accidents" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    for (const a of links) {
      expect(a.className).toContain("min-h-[44px]");
    }
  });
});
