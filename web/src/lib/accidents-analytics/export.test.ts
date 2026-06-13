import { describe, expect, it } from "vitest";
import {
  ANALYTICS_CSV_FILENAME,
  analyticsToCsv,
  analyticsToSummaryText,
} from "./export";
import type { AnalyticsAggregates } from "./types";

const FIXTURE: AnalyticsAggregates = {
  generatedAt: "2026-06-13",
  meta: {
    curatedCases: 300,
    mhlwDeathsCount: 3700,
    mhlwFullDbCount: 504415,
    yearsCovered: { from: 2019, to: 2024 },
  },
  kpi: {
    curatedTotal: 300,
    mhlwDeathsTotal: 3700,
    recentYearLabel: "2024年",
    recentYearCount: 820,
    trailing12mCount: 790,
    riskiestIndustries: [
      { name: "建設業", count: 1200 },
      { name: "製造業", count: 900 },
      { name: "運輸業", count: 600 },
    ],
    riskiestTypes: [
      { name: "墜落・転落", count: 800 },
      { name: "はさまれ・巻き込まれ", count: 500 },
      { name: "転倒", count: 400 },
    ],
    fatalRatePercent: 12.5,
  },
  yearTrend: [
    { year: 2023, count: 780 },
    { year: 2024, count: 820 },
  ],
  monthTrendRecent5y: [],
  seasonalityByMonth: [],
  seasonalityByQuarter: [],
  weekdayDistribution: [],
  industryRanking: [
    { name: "建設業", count: 1200 },
    { name: "製造業", count: 900 },
  ],
  industryDeathRate: [{ industry: "建設業", total: 1200, fatal: 150, rate: 12.5 }],
  industryTypeMatrix: { industries: [], types: [], matrix: [] },
  typeRanking: [{ name: "墜落・転落", count: 800 }],
  typeTrendByYear: { years: [], series: [] },
  prefectureRanking: [{ name: "東京都", count: 60 }],
  workplaceSizeRanking: [],
  causeRanking: [{ name: "仮設物・建築物等", count: 220 }],
  occurrenceTimeDistribution: [],
  ageDistribution: [],
  severityBreakdown: [],
  fullDbYearTrend: [],
  fullDbIndustryRanking: [],
  yoyComparison: {
    previousYear: { year: 2023, count: 780 },
    currentYear: { year: 2024, count: 820 },
    deltaPercent: 5.1,
  },
};

describe("analyticsToCsv", () => {
  it("各集計値を改変せずそのまま出力する（捏造・水増しなし）", () => {
    const csv = analyticsToCsv(FIXTURE);
    expect(csv).toContain("収録期間,2019〜2024年");
    expect(csv).toContain("建設業,1200");
    expect(csv).toContain("墜落・転落,800");
    expect(csv).toContain("建設業,1200,150,12.5");
    expect(csv).toContain("東京都,60");
  });

  it("セクション見出しを含む", () => {
    const csv = analyticsToCsv(FIXTURE);
    expect(csv).toContain("業種別 事故件数ランキング");
    expect(csv).toContain("業種別 死亡率");
    expect(csv).toContain("都道府県別 死亡災害");
  });

  it("ファイル名は .csv 拡張子", () => {
    expect(ANALYTICS_CSV_FILENAME.endsWith(".csv")).toBe(true);
  });
});

describe("analyticsToSummaryText", () => {
  it("結論（最新年件数・前年比・死亡率）とTOP3を含む", () => {
    const text = analyticsToSummaryText(FIXTURE);
    expect(text).toContain("2024年の事故件数：820件（前年比 +5.1%）");
    expect(text).toContain("死亡災害比率：12.5%");
    expect(text).toContain("1.建設業(1,200件)");
    expect(text).toContain("1.墜落・転落(800件)");
  });

  it("減少時は前年比に符号を付けない", () => {
    const text = analyticsToSummaryText({
      ...FIXTURE,
      yoyComparison: { ...FIXTURE.yoyComparison, deltaPercent: -3.2 },
    });
    expect(text).toContain("前年比 -3.2%");
  });
});
