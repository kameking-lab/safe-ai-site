import { describe, expect, it } from "vitest";
import { getAnalyticsAggregates } from "./aggregators";
import { buildTypeComposition } from "./type-composition";

describe("事故型の構成比", () => {
  it("既定母集団では最多事故型を4,782件に対する構成比で示す", () => {
    const baseline = getAnalyticsAggregates();

    expect(buildTypeComposition(baseline, baseline)).toEqual({
      label: "墜落・転落",
      count: 1248,
      denominator: 4782,
      percent: 26.1,
    });
  });

  it("事故型を選んでも分母は同じ業種・年で事故型条件だけを外す", () => {
    const comparison = getAnalyticsAggregates({
      industry: "建設業",
      year: 2024,
    });
    const filtered = getAnalyticsAggregates({
      industry: "建設業",
      year: 2024,
      type: "墜落・転落",
    });
    const result = buildTypeComposition(filtered, comparison, "墜落・転落");

    expect(result?.count).toBe(filtered.meta.filteredCases);
    expect(result?.denominator).toBe(comparison.meta.filteredCases);
    expect(result?.denominator).toBeGreaterThan(result?.count ?? 0);
    expect(result?.percent).toBe(
      Math.round(
        (filtered.meta.filteredCases / comparison.meta.filteredCases) * 1_000,
      ) / 10,
    );
  });

  it("0件の組み合わせは誤解を招く0%を返さない", () => {
    const comparison = getAnalyticsAggregates({
      industry: "建設業",
      year: 2024,
    });
    const empty = getAnalyticsAggregates({
      industry: "建設業",
      year: 2024,
      type: "激突され",
      prefecture: "沖縄",
      age: "75~",
    });

    expect(empty.meta.filteredCases).toBe(0);
    expect(buildTypeComposition(empty, comparison, "激突され")).toBeNull();
  });
});
