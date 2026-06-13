import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePersonaEntry } from "./home-persona-entry";

// exp-06: トップのペルソナ選択バンド(exp-01)の回帰ガード。
describe("HomePersonaEntry (トップのペルソナ選択バンド)", () => {
  it("見出しと4立場のエントリリンクを描画", () => {
    render(<HomePersonaEntry />);
    expect(screen.getByText("あなたの立場から始める")).toBeDefined();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/for/construction");
    expect(hrefs).toContain("/for/solo");
    expect(hrefs).toContain("/for/manager");
    expect(hrefs).toContain("/for/consultant");
  });

  it("各カードに立場ラベルを表示", () => {
    render(<HomePersonaEntry />);
    expect(screen.getByText("建設業の現場")).toBeDefined();
    expect(screen.getByText("一人親方")).toBeDefined();
    expect(screen.getByText("企業の安全衛生担当者")).toBeDefined();
    expect(screen.getByText("専門家・コンサル")).toBeDefined();
  });

  // 柱3: モバイルは2列＝一人親方を初手の同一行(右上)へ。回帰ガード。
  it("カードグリッドはモバイル2列(1列に戻していない)", () => {
    const { container } = render(<HomePersonaEntry />);
    const grid = container.querySelector("ul");
    expect(grid?.className).toContain("grid-cols-2");
    expect(grid?.className).not.toContain("grid-cols-1");
  });

  it("建設業=先頭・一人親方=2番目のDOM順(2列で右上=初手行に来る)", () => {
    render(<HomePersonaEntry />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    const personaHrefs = hrefs.filter((h) => h?.startsWith("/for/"));
    expect(personaHrefs[0]).toBe("/for/construction");
    expect(personaHrefs[1]).toBe("/for/solo");
  });
});
