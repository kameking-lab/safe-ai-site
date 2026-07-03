import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import UseCasesPage from "./page";

describe("/features/use-cases 関連機能ピル（柱0 44px）", () => {
  it("各業種カードの関連機能ピルが min-h-[44px] を持つ", () => {
    const { container } = render(<UseCasesPage />);
    const pills = container.querySelectorAll("a.rounded-md.border-emerald-200");
    expect(pills.length).toBeGreaterThan(0);
    for (const pill of Array.from(pills)) {
      expect(pill.className).toContain("min-h-[44px]");
    }
  });

  it("業種ジャンプナビの各リンクが min-h-[44px] を持つ", () => {
    const { container } = render(<UseCasesPage />);
    const jumpNav = container.querySelector('nav[aria-label="業種ジャンプ"]');
    expect(jumpNav).not.toBeNull();
    const jumpLinks = jumpNav!.querySelectorAll('a[href^="#"]');
    expect(jumpLinks.length).toBeGreaterThan(0);
    for (const link of Array.from(jumpLinks)) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("下部CTAの2リンクが min-h-[44px] を持つ", () => {
    const { getByRole } = render(<UseCasesPage />);
    expect(getByRole("link", { name: /業種別の相談を送る/ }).className).toContain("min-h-[44px]");
    expect(getByRole("link", { name: "機能一覧に戻る" }).className).toContain("min-h-[44px]");
  });
});
