import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";

// useSearchParams を mock（client panel が参照する）
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe("ChemicalRaPanel 見出し階層（多重h1の是正）", () => {
  it("パネルは h1 を持たない（ページ側 PageHeader が唯一の h1）", () => {
    const { container } = render(<ChemicalRaPanel />);
    expect(container.querySelectorAll("h1").length).toBe(0);
  });

  it("画面用イントロ見出しは h2 で「化学物質リスクアセスメント」を保持", () => {
    const { container } = render(<ChemicalRaPanel />);
    const intro = Array.from(container.querySelectorAll("h2")).find((h) =>
      h.textContent?.includes("化学物質リスクアセスメント"),
    );
    expect(intro).toBeTruthy();
  });
});
