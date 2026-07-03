import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuickTourPage from "./page";

describe("/features/quick-tour 柱0 44pxタップ標的", () => {
  it("各ステップの遷移リンクが min-h-[44px] を満たす", () => {
    render(<QuickTourPage />);
    const stepLinks = screen.getAllByRole("link", { name: /→$/ });
    expect(stepLinks.length).toBeGreaterThan(0);
    for (const link of stepLinks) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("「次のステップへ」アンカーが min-h-[44px] を満たす", () => {
    render(<QuickTourPage />);
    const nextLinks = screen.getAllByRole("link", { name: /次のステップへ/ });
    expect(nextLinks.length).toBeGreaterThan(0);
    for (const link of nextLinks) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("下部CTAの2リンクが min-h-[44px] を満たす", () => {
    render(<QuickTourPage />);
    expect(screen.getByRole("link", { name: /機能一覧で詳しく見る/ }).className).toContain(
      "min-h-[44px]",
    );
    expect(screen.getByRole("link", { name: "導入相談を申し込む" }).className).toContain(
      "min-h-[44px]",
    );
  });
});
