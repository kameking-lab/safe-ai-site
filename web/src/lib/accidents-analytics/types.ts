/**
 * Shared types for the multi-axis accident analytics dashboard.
 * All aggregation outputs are plain JSON so they can cross the
 * server/client boundary in a Next.js Server Component.
 */

export type NameCount = { name: string; count: number };

export type YearCount = { year: number; count: number };

export type MonthCount = { month: string; count: number };

export type SeverityKey = "軽傷" | "中等傷" | "重傷" | "死亡";

export type WeekdayCount = {
  weekday: string;
  count: number;
};

export type IndustryTypeMatrix = {
  industries: string[];
  types: string[];
  matrix: number[][];
};

export type IndustryDeathRate = {
  industry: string;
  total: number;
  fatal: number;
  rate: number;
};

export type YearTrendByType = {
  years: number[];
  series: Array<{ type: string; values: number[] }>;
};

export type AnalyticsKpi = {
  curatedTotal: number;
  mhlwDeathsTotal: number;
  recentYearLabel: string;
  recentYearCount: number;
  trailing12mCount: number;
  riskiestIndustries: NameCount[];
  riskiestTypes: NameCount[];
  fatalRatePercent: number;
};

export type AnalyticsAggregates = {
  generatedAt: string;
  meta: {
    curatedCases: number;
    mhlwDeathsCount: number;
    mhlwFullDbCount: number;
    yearsCovered: { from: number; to: number };
  };
  kpi: AnalyticsKpi;
  /** A: 時系列軸 */
  yearTrend: YearCount[];
  monthTrendRecent5y: MonthCount[];
  seasonalityByMonth: NameCount[];
  seasonalityByQuarter: NameCount[];
  weekdayDistribution: WeekdayCount[];
  /** B: 業種軸 */
  industryRanking: NameCount[];
  industryDeathRate: IndustryDeathRate[];
  industryTypeMatrix: IndustryTypeMatrix;
  /** C: 事故種類軸 */
  typeRanking: NameCount[];
  typeTrendByYear: YearTrendByType;
  /** D: 規模・地域軸 */
  prefectureRanking: NameCount[];
  workplaceSizeRanking: NameCount[];
  /** E: 詳細分析 */
  causeRanking: NameCount[];
  occurrenceTimeDistribution: NameCount[];
  ageDistribution: NameCount[];
  severityBreakdown: NameCount[];
  /** F: 比較分析 */
  fullDbYearTrend: YearCount[];
  fullDbIndustryRanking: NameCount[];
  yoyComparison: {
    previousYear: { year: number; count: number };
    currentYear: { year: number; count: number };
    deltaPercent: number;
  };
};
