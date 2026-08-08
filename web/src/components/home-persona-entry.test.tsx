import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePersonaEntry } from "./home-persona-entry";

// exp-06: トップのペルソナ選択バンド(exp-01)の回帰ガード。
describe("HomePersonaEntry (トップのペルソナ選択バンド)", () => {
  it("6つの立場から重複LPを介さず正規機能へつながる", () => {
    render(<HomePersonaEntry />);
    expect(screen.getByText("あなたの立場を選ぶ")).toBeDefined();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/risk");
    expect(hrefs).toContain("/ky/paper");
    expect(hrefs).toContain("/safety-diary");
    expect(hrefs).toContain("/law-search");
    expect(hrefs).toContain("/services/automation");
    expect(hrefs).toContain("/education-certification/finder");
    expect(hrefs).toHaveLength(6);
    expect(hrefs.some((href) => href?.startsWith("/for/"))).toBe(false);
  });

  it("各カードに立場ラベルを表示", () => {
    render(<HomePersonaEntry />);
    expect(screen.getByText("職長・現場代理人")).toBeDefined();
    expect(screen.getByText("一人親方")).toBeDefined();
    expect(screen.getByText("安全衛生担当")).toBeDefined();
    expect(screen.getByText("専門家")).toBeDefined();
    expect(screen.getByText("経営者")).toBeDefined();
    expect(screen.getByText("作業員・新入社員")).toBeDefined();
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
    expect(hrefs[0]).toBe("/risk");
    expect(hrefs[1]).toBe("/ky/paper");
  });
});
