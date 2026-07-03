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
});
