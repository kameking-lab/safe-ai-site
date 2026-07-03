import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobClassTabs } from "./job-class-tabs";

describe("JobClassTabs のtab/tabpanel ARIA関連付け", () => {
  it("各tabのaria-controlsがtabpanelのidと一致する", () => {
    render(<JobClassTabs />);
    const panel = screen.getByRole("tabpanel");
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThan(0);
    for (const tab of tabs) {
      expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    }
    expect(panel.id).not.toBe("");
  });
});
