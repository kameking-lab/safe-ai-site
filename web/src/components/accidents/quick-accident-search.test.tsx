import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickAccidentSearch } from "./quick-accident-search";

describe("QuickAccidentSearch", () => {
  it("キーワード入力欄と検索ボタンを表示", () => {
    render(<QuickAccidentSearch />);
    expect(screen.getByRole("searchbox", { name: "事故事例キーワード検索" })).toBeDefined();
    expect(screen.getByRole("button", { name: "検索" })).toBeDefined();
  });

  it("事故の型チップは収録事例の型絞り込み(acc_type)へ直行", () => {
    render(<QuickAccidentSearch />);
    const chips = screen.getAllByRole("link");
    expect(chips.length).toBeGreaterThan(0);
    for (const a of chips) {
      expect(a.getAttribute("href")).toMatch(/acc_type=/);
    }
  });

  // 柱0: 最上部のクイック検索は現場ペルソナが最初に触れる操作。
  // 入力欄・検索ボタン・型チップが全て 44px タップ標的を満たすこと
  // （py-2 ≈38px / min-h-[36px] への退行を防ぐ）。
  it("入力欄・検索ボタンが min-h-[44px]", () => {
    render(<QuickAccidentSearch />);
    expect(screen.getByRole("searchbox").className).toContain("min-h-[44px]");
    expect(screen.getByRole("button", { name: "検索" }).className).toContain("min-h-[44px]");
  });

  it("事故の型チップが全て min-h-[44px] タップ標的", () => {
    render(<QuickAccidentSearch />);
    const chips = screen.getAllByRole("link");
    for (const a of chips) {
      expect(a.className).toContain("min-h-[44px]");
    }
  });
});
