import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourtCasesPrintButton } from "./court-cases-print-button";

describe("CourtCasesPrintButton 柱0（44pxタップ標的）", () => {
  it("印刷 / PDF保存ボタンが 44px タップ標的を満たす", () => {
    render(<CourtCasesPrintButton />);
    const button = screen.getByRole("button", { name: /この一覧を印刷/ });
    expect(button.className).toContain("min-h-[44px]");
  });
});
