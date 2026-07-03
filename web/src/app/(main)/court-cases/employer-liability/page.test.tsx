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

  it("予防アクションへの4リンクが min-h-[44px] を持つ", () => {
    const { container } = render(<EmployerLiabilityPage />);
    const hrefs = ["/ky/paper", "/site-records", "/heat-illness-prevention", "/court-cases"];
    for (const href of hrefs) {
      const link = container.querySelector(`a[href="${href}"]`);
      expect(link).not.toBeNull();
      expect(link?.className).toContain("min-h-[44px]");
    }
  });
});
