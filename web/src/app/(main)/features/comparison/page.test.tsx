import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ComparisonPage from "./page";

describe("/features/comparison 柱0 44pxタップ標的", () => {
  it("下部CTAの2リンクが min-h-[44px] を満たす", () => {
    render(<ComparisonPage />);
    expect(screen.getByRole("link", { name: /ご意見・改善提案を送る/ }).className).toContain(
      "min-h-[44px]",
    );
    expect(screen.getByRole("link", { name: "機能一覧を見る" }).className).toContain(
      "min-h-[44px]",
    );
  });
});
