import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccidentHubNav } from "./accident-hub-nav";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

describe("AccidentHubNav", () => {
  it("速報・死亡事故DB・分析ダッシュボードを表示する", () => {
    render(<AccidentHubNav current="accident-news" />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/accident-news", "/fatal-accidents", "/accidents-analytics"]);
    expect(links).not.toContain("/accidents");
    expect(links).not.toContain("/accidents-reports");
    expect(links).toContain("/accidents-analytics");
    expect(isPublicRouteAvailable("/accidents")).toBe(true);
    expect(isPublicRouteAvailable("/accidents/example-id")).toBe(false);
    for (const href of links) {
      expect(href).not.toBeNull();
      expect(isPublicRouteAvailable(href!)).toBe(true);
    }
  });

  it("現在ページに aria-current=page を付与", () => {
    render(<AccidentHubNav current="accident-news" />);
    const current = screen.getByRole("link", { current: "page" });
    expect(current.getAttribute("href")).toBe("/accident-news");
  });

  it("現在ページの役割説明を表示", () => {
    render(<AccidentHubNav current="accident-news" />);
    expect(screen.getAllByText(/直近14日以内/).length).toBeGreaterThan(0);
  });

  it("公開情報の出典区分を示し、事故DB名や未検証件数を表示しない", () => {
    const { container } = render(<AccidentHubNav current="accident-news" />);
    expect(container.textContent).not.toMatch(/5,000/);
    expect(container.textContent).not.toContain("事故DB検索");
    expect(screen.getAllByText(/直近14日以内/).length).toBeGreaterThan(0);
  });

  // 柱0: 事故系ナビは初訪の現場ペルソナが最上部でタップする入口。
  // 全リンクが 44px タップ標的を満たす（px-3 py-1 ≈28px への退行を防ぐ）。
  it("公開中ルートのナビチップが min-h-[44px] タップ標的", () => {
    render(<AccidentHubNav current="accident-news" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    for (const a of links) {
      expect(a.className).toContain("min-h-[44px]");
    }
  });
});
