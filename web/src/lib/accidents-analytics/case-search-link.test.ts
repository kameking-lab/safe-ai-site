import { describe, expect, it } from "vitest";
import { buildCaseSearchLink } from "./case-search-link";
import type { AnalyticsAggregates } from "./types";

const filters: AnalyticsAggregates["meta"]["filters"] = {
  industry: null,
  type: null,
  year: null,
  month: null,
  industryMedium: null,
  cause: null,
  workplaceSize: null,
  occurrenceTime: null,
  prefecture: null,
  age: null,
  severity: null,
  source: "official",
};

describe("analytics to case search handoff", () => {
  it("carries equivalent industry, canonical hazard, year and severity without counts", () => {
    const link = buildCaseSearchLink({
      ...filters,
      industry: "建設業",
      type: "墜落・転落",
      year: 2024,
      severity: "死亡",
    });
    const url = new URL(link.href, "https://example.test");
    expect(url.pathname).toBe("/accidents");
    expect(url.hash).toBe("#accident-results");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      acc_industries: "construction",
      acc_hazard: "fall",
      acc_year: "2024",
      acc_severity: "死亡",
    });
    expect(link.transferred).toHaveLength(4);
    expect(link.omitted).toEqual([]);
  });

  it("reports fields whose meaning cannot be represented by the case search", () => {
    const link = buildCaseSearchLink({
      ...filters,
      industry: "農林業",
      type: "分類不能",
      month: 7,
      source: "mhlw-deaths-2024",
    });
    expect(link.href).toBe("/accidents#accident-results");
    expect(link.transferred).toEqual([]);
    expect(link.omitted).toEqual([
      "業種: 農林業",
      "事故の型: 分類不能",
      "月: 7",
      "データ源: mhlw-deaths-2024",
    ]);
  });
});
