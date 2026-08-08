import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChemicalPpeSelectionBoundary } from "./chemical-ppe-selection-boundary";

describe("ChemicalPpeSelectionBoundary", () => {
  it.each([
    [{}, "未確認または不明"],
    [{ sdsConfirmed: true }, "未確認または不明"],
    [
      { sdsConfirmed: true, suitabilityConfirmed: true },
      "確認済みと記録されています",
    ],
  ])("商品リンクを出さず選定条件を明示する: %o", (props, expected) => {
    render(<ChemicalPpeSelectionBoundary chemicalName="試験物質" {...props} />);

    const disclosure = screen.getByText("保護具を選ぶ前に確認").closest("details");
    expect(disclosure?.open).toBe(false);
    expect(screen.getAllByText(new RegExp(expected)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Amazon")).toBeNull();
    expect(screen.queryByText("楽天")).toBeNull();
    expect(screen.getByText(/酸素濃度と有害物濃度/)).toBeTruthy();
    expect(screen.getByText(/手袋材質の耐透過性/)).toBeTruthy();
  });
});
