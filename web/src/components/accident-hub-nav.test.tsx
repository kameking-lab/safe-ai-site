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
});
