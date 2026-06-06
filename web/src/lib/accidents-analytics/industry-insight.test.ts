import { describe, it, expect } from "vitest";
import { getIndustryInsight } from "./industry-insight";
import type { AnalyticsAggregates } from "./types";

function makeAgg(): AnalyticsAggregates {
  // 最小限のモック: 建設業=墜落最多, 製造業=はさまれ最多
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    meta: { curatedCases: 100, mhlwDeathsCount: 0, mhlwFullDbCount: 0, yearsCovered: { from: 2015, to: 2024 } },
    kpi: {
      curatedTotal: 100, mhlwDeathsTotal: 0, recentYearLabel: "2024", recentYearCount: 10,
      trailing12mCount: 10, riskiestIndustries: [], riskiestTypes: [], fatalRatePercent: 20,
    },
    yearTrend: [], monthTrendRecent5y: [], seasonalityByMonth: [], seasonalityByQuarter: [],
    weekdayDistribution: [],
    industryRanking: [
      { name: "建設業", count: 60 },
      { name: "製造業", count: 40 },
    ],
    industryDeathRate: [
      { industry: "建設業", total: 60, fatal: 30, rate: 50 },
      { industry: "製造業", total: 40, fatal: 4, rate: 10 },
    ],
    industryTypeMatrix: {
      industries: ["建設業", "製造業"],
      types: ["墜落", "はさまれ・巻き込まれ", "転倒"],
      matrix: [
        [40, 10, 10], // 建設業
        [2, 30, 8], // 製造業
      ],
    },
    typeRanking: [], typeTrendByYear: { years: [], series: [] },
    prefectureRanking: [], workplaceSizeRanking: [],
    causeRanking: [], occurrenceTimeDistribution: [], ageDistribution: [], severityBreakdown: [],
    fullDbYearTrend: [],
  } as unknown as AnalyticsAggregates;
}

describe("getIndustryInsight", () => {
  it("業種未選択は null", () => {
    expect(getIndustryInsight(makeAgg(), "")).toBeNull();
  });

  it("建設業: 多い事故型は墜落が最多・順位1位・死亡率は全体より高い", () => {
    const ins = getIndustryInsight(makeAgg(), "建設業")!;
    expect(ins.topTypes[0]).toEqual({ name: "墜落", count: 40 });
    expect(ins.topTypes).toHaveLength(3);
    expect(ins.industryTotal).toBe(60);
    expect(ins.rank).toBe(1);
    expect(ins.industryCount).toBe(2);
    expect(ins.deathRate?.rate).toBe(50);
    expect(ins.overallFatalRatePercent).toBe(20);
    expect(ins.fatalComparison).toBe("above");
  });

  it("製造業: 多い事故型ははさまれが最多・死亡率は全体より低い", () => {
    const ins = getIndustryInsight(makeAgg(), "製造業")!;
    expect(ins.topTypes[0]).toEqual({ name: "はさまれ・巻き込まれ", count: 30 });
    expect(ins.rank).toBe(2);
    expect(ins.fatalComparison).toBe("below");
  });

  it("0件の型は除外し、最大3件に丸める", () => {
    const ins = getIndustryInsight(makeAgg(), "建設業")!;
    expect(ins.topTypes.every((t) => t.count > 0)).toBe(true);
    expect(ins.topTypes.length).toBeLessThanOrEqual(3);
  });

  it("データに無い業種は topTypes 空・deathRate null でも落ちない", () => {
    const ins = getIndustryInsight(makeAgg(), "林業")!;
    expect(ins.topTypes).toEqual([]);
    expect(ins.deathRate).toBeNull();
    expect(ins.rank).toBeNull();
  });
});
