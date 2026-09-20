import { describe, expect, it } from "vitest";
import {
  filterAnalyticsCases,
  getAnalyticsAggregates,
  normalizeOccurrenceTimeBucket,
} from "./aggregators";
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
    accident("curated-construction", { source: "curated", severity: "重傷" }),
  ];

  it("全項目をAND条件で適用し、時刻を2時間帯へ正規化する", () => {
    const detailed = cases.map((item) =>
      item.id === "construction-fall-2024"
        ? {
            ...item,
            month: 1,
            industryMedium: "総合工事業",
            cause: "仮設物、建築物、構築物等",
            workplaceSize: "10～29人",
            occurrenceTime: "9~10",
            prefecture: "東京都",
            age: "40～44歳",
          }
        : item,
    );
    expect(
      filterAnalyticsCases(detailed, {
        industry: "建設業",
        type: "墜落・転落",
        year: 2024,
        month: 1,
        industryMedium: "総合工事業",
        cause: "仮設物、建築物、構築物等",
        workplaceSize: "10～29人",
        occurrenceTime: "8～10",
        prefecture: "東京都",
        age: "40～44歳",
        severity: "死亡",
        source: "mhlw-deaths-compact",
      }).map((item) => item.id),
    ).toEqual(["construction-fall-2024"]);
  });

  it("条件なしでは公式死亡個票のみ、all指定では全ソースを返す", () => {
    expect(filterAnalyticsCases(cases)).toHaveLength(3);
    expect(filterAnalyticsCases(cases, { source: "all" })).toHaveLength(4);
  });

  it("時刻表記を必ず2時間帯へそろえる", () => {
    expect(normalizeOccurrenceTimeBucket("9~10")).toBe("8～10");
    expect(normalizeOccurrenceTimeBucket("10～12")).toBe("10～12");
    expect(normalizeOccurrenceTimeBucket("23~24")).toBe("22～24");
  });

  it("実データ再集計で対象件数・期間・欠損率の分母が一致する", () => {
    const baseline = getAnalyticsAggregates();
    const year = baseline.meta.filterOptions.years[0];
    const filtered = getAnalyticsAggregates({ year });

    expect(filtered.meta.datasetCases).toBe(baseline.meta.filteredCases);
    expect(baseline.meta.filters.source).toBe("official");
    expect(baseline.meta.curatedCases).toBe(0);
    expect(baseline.meta.mhlwDeathsCount).toBe(baseline.meta.filteredCases);
    expect(baseline.meta.filterOptions.severities).toEqual(["死亡"]);
    expect(baseline.meta.filterOptions.occurrenceTimes).toEqual([
      "0～2",
      "2～4",
      "4～6",
      "6～8",
      "8～10",
      "10～12",
      "12～14",
      "14～16",
      "16～18",
      "18～20",
      "20～22",
      "22～24",
    ]);
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
