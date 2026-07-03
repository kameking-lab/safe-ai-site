import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import EmployerLiabilityPage from "./page";

describe("/court-cases/employer-liability IssueLinkチップ（柱0 44px）", () => {
  it("論点リンクチップが min-h-[44px] を持つ", () => {
    const { container } = render(<EmployerLiabilityPage />);
    const chips = container.querySelectorAll('a[href^="/court-cases?issue="]');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of Array.from(chips)) {
      expect(chip.className).toContain("min-h-[44px]");
    }
  });
});
