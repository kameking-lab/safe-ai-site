import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChemicalRaPrintReport } from "./chemical-ra-report-print";
import { buildOfficialResponse } from "@/lib/chemical/official-ra-response";
import { findByCas } from "@/lib/mhlw-chemicals";
import { GHS_PARTIAL_COVERAGE_NOTICE } from "@/lib/chemical/ghs-coverage";

describe("ChemicalRaPrintReport", () => {
  it.each(["108-88-3", "67-64-1", "64-17-5"])("CAS %s の分類全文・炎・収録範囲を印刷記録に保持する", (cas) => {
    const result = buildOfficialResponse(findByCas(cas)!);
    const { container } = render(<ChemicalRaPrintReport result={result} recordDateIso="2026-10-01T00:00:00Z" />);
    expect(screen.getByRole("heading", { name: result.chemicalName })).toBeTruthy();
    expect(screen.getByTestId("ghs-picto-flame")).toBeTruthy();
    expect(screen.getByTestId("chemical-ra-print-coverage").textContent).toBe(GHS_PARTIAL_COVERAGE_NOTICE);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(result.ghsHazards.length);
    result.ghsHazards.forEach((hazard, index) => {
      expect(rows[index]?.textContent).toContain(hazard.category);
      expect(rows[index]?.textContent).toContain(hazard.classification);
      expect(rows[index]?.textContent).toContain(hazard.signal);
    });
    expect(container.querySelector("thead")?.textContent).toContain(result.chemicalName);
    expect(container.querySelector("thead")?.textContent).toContain(cas);
    expect(container.textContent).toContain("2026年10月1日");
    expect(container.querySelectorAll("button, input, textarea")).toHaveLength(0);
    expect(container.textContent).not.toContain("この作業条件をKYへ");
    expect(container.textContent).not.toContain("安全です");
  });

  it("分類がない場合を危険性なしと扱わない", () => {
    const result = { ...buildOfficialResponse(findByCas("108-88-3")!), ghsHazards: [] };
    const { container } = render(<ChemicalRaPrintReport result={result} />);
    expect(container.textContent).toContain("分類情報未確認");
    expect(container.textContent).toContain("危険性の有無は未確認");
    expect(container.textContent).toContain(GHS_PARTIAL_COVERAGE_NOTICE);
    expect(screen.queryByTestId("ghs-picto-flame")).toBeNull();
    expect(container.textContent).not.toContain("安全です");
  });
});
