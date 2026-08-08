import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AccidentTypeCount } from "@/lib/accidents/accident-visual";
import { AccidentTypeGrid } from "./accident-type-grid";
import { DataExportToolbar } from "./data-export-toolbar";

const counts: AccidentTypeCount[] = [
  { type: "墜落", count: 20 },
  { type: "転倒", count: 18 },
  { type: "はさまれ・巻き込まれ", count: 16 },
  { type: "切れ・こすれ", count: 14 },
  { type: "飛来・落下", count: 12 },
  { type: "感電", count: 10 },
];

describe("accident compact actions", () => {
  it("shows at most four accident-type chips before expansion", () => {
    const { container } = render(<AccidentTypeGrid counts={counts} />);

    expect(container.querySelectorAll("[data-accident-type-chip='true']")).toHaveLength(4);
    expect(container.querySelectorAll("[data-accident-type-overflow='true']")).toHaveLength(2);
    expect(screen.getByText("他の事故型")).toBeTruthy();
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
  });

  it("keeps two export actions visible and moves share and print under Other", () => {
    const { container } = render(
      <DataExportToolbar
        filename="accidents.csv"
        csv="year,count\n2026,1"
        text="事故要約"
        shareTitle="事故集計"
      />,
    );

    expect(container.querySelectorAll("[data-export-primary-action='true']")).toHaveLength(2);
    expect(screen.getByText("その他")).toBeTruthy();
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
    expect(screen.getByRole("button", { name: "共有" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "印刷" })).toBeTruthy();
  });
});
