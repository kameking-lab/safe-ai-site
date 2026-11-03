import { describe, expect, it } from "vitest";
import type { AccidentCase } from "@/lib/types/domain";
import { filterCaseSearchResults, readAccidentTypeQuery, readCaseSearchFilters } from "./case-search-filters";

const base: AccidentCase = {
  id: "a",
  title: "事例A",
  occurredOn: "2024-03-05",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "概要",
  mainCauses: [],
  preventionPoints: [],
};

describe("case search URL filters", () => {
  it("applies canonical accident type, year and severity together", () => {
    const rows: AccidentCase[] = [
      base,
      { ...base, id: "b", type: "転倒" },
      { ...base, id: "c", occurredOn: "2023-03-05" },
      { ...base, id: "d", severity: "重傷" },
    ];
    const parsed = readCaseSearchFilters(new URLSearchParams("acc_hazard=fall&acc_year=2024&acc_severity=死亡"));
    expect(filterCaseSearchResults(rows, parsed).map((item) => item.id)).toEqual(["a"]);
  });

  it("ignores unsupported URL values", () => {
    expect(readCaseSearchFilters(new URLSearchParams("acc_hazard=unknown&acc_year=oops&acc_severity=unknown"))).toEqual({
      hazard: null,
      year: null,
      severity: null,
    });
  });

  it("prefers a valid canonical hazard over a conflicting legacy type", () => {
    expect(readAccidentTypeQuery(new URLSearchParams("acc_type=転倒&acc_hazard=fall"))).toEqual({
      selectedType: "すべて",
      clearLegacyType: true,
    });
    expect(readAccidentTypeQuery(new URLSearchParams("acc_type=転倒&acc_hazard=unknown"))).toEqual({
      selectedType: "転倒",
      clearLegacyType: false,
    });
  });
});
