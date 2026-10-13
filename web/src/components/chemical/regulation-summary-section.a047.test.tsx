import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegulationSummarySection } from "./regulation-summary-section";

describe("化学物質の法令該当性の証拠境界", () => {
  it("正本照合済みの指定なしには照合日を示し、未突合区分は未確認のままにする", () => {
    render(<RegulationSummarySection cas="7439-92-1" />);

    expect(screen.getByText("収録正本の照合範囲で指定なし:")).toBeTruthy();
    expect(screen.getByText(/特化則（照合 \d{4}-\d{2}-\d{2}）/)).toBeTruthy();
    expect(screen.getByText("未確認（正本と未突合）:").parentElement?.textContent).toContain("毒物及び劇物取締法");
  });
});
