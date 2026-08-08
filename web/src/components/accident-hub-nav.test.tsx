import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccidentHubNav } from "./accident-hub-nav";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

describe("AccidentHubNav", () => {
  it("重大災害情報だけを表示し、全面隔離中の事故DB・分析ルートを出さない", () => {
    render(<AccidentHubNav current="accident-news" />);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/accident-news"]);
    expect(links).not.toContain("/accidents");
    expect(links).not.toContain("/accidents-reports");
    expect(links).not.toContain("/accidents-analytics");
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
    expect(screen.getAllByText(/公表事実・匿名・出典付き/).length).toBeGreaterThan(0);
  });

  it("公開情報の出典区分を示し、事故DB名や未検証件数を表示しない", () => {
    const { container } = render(<AccidentHubNav current="accident-news" />);
    expect(container.textContent).not.toMatch(/5,000/);
    expect(container.textContent).not.toContain("事故DB検索");
    expect(screen.getAllByText(/公表事実・匿名・出典付き/).length).toBeGreaterThan(0);
  });

  // 柱0: 事故系ナビは初訪の現場ペルソナが最上部でタップする入口。
  // 全リンクが 44px タップ標的を満たす（px-3 py-1 ≈28px への退行を防ぐ）。
  it("公開中ルートのナビチップが min-h-[44px] タップ標的", () => {
    render(<AccidentHubNav current="accident-news" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    for (const a of links) {
      expect(a.className).toContain("min-h-[44px]");
    }
  });
});
