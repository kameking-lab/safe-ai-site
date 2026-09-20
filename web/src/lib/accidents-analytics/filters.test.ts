import { describe, expect, it } from "vitest";
import { filterAnalyticsCases, getAnalyticsAggregates } from "./aggregators";
import type { CombinedCase } from "./loader";

function accident(id: string, values: Partial<CombinedCase>): CombinedCase {
  return {
    id,
    occurredOn: "2024-01",
    year: 2024,
    month: 1,
    type: "墜落、転落",
    industry: "建設業",
    industryMedium: null,
    prefecture: null,
    cause: null,
    workplaceSize: null,
    occurrenceTime: null,
    age: null,
    severity: "死亡",
    weekday: null,
    source: "mhlw-deaths-compact",
    ...values,
  };
}

describe("事故統計の交差フィルタ", () => {
  const cases = [
    accident("construction-fall-2024", {}),
    accident("construction-fall-2023", { year: 2023 }),
    accident("manufacturing-caught-2024", {
      industry: "製造業",
      type: "はさまれ、巻き込まれ",
    }),
  ];

  it("業種・正規化事故型・年をAND条件で適用する", () => {
    expect(
      filterAnalyticsCases(cases, {
        industry: "建設業",
        type: "墜落・転落",
        year: 2024,
      }).map((item) => item.id),
    ).toEqual(["construction-fall-2024"]);
  });

  it("条件なしでは母集団を欠落させない", () => {
    expect(filterAnalyticsCases(cases)).toHaveLength(3);
  });

  it("実データ再集計で対象件数・期間・欠損率の分母が一致する", () => {
    const baseline = getAnalyticsAggregates();
    const year = baseline.meta.filterOptions.years[0];
    const filtered = getAnalyticsAggregates({ year });

    expect(filtered.meta.datasetCases).toBe(baseline.meta.filteredCases);
    expect(filtered.meta.filteredCases).toBeGreaterThan(0);
    expect(filtered.meta.filteredCases).toBeLessThanOrEqual(
      filtered.meta.datasetCases,
    );
    expect(filtered.meta.yearsCovered).toEqual({ from: year, to: year });
    expect(filtered.yearTrend.every((point) => point.year === year)).toBe(true);
    for (const coverage of Object.values(filtered.meta.coverage)) {
      expect(coverage.known + coverage.missing).toBe(
        filtered.meta.filteredCases,
      );
      expect(coverage.missingRatePercent).toBeGreaterThanOrEqual(0);
      expect(coverage.missingRatePercent).toBeLessThanOrEqual(100);
    }
  });
});
