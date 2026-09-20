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

export type AnalyticsSourceFilter =
  | "official"
  | "mhlw-deaths-compact"
  | "mhlw-deaths-2024"
  | "curated"
  | "all";

export type AnalyticsFilters = {
  industry?: string | null;
  type?: string | null;
  year?: number | null;
  month?: number | null;
  industryMedium?: string | null;
  cause?: string | null;
  workplaceSize?: string | null;
  occurrenceTime?: string | null;
  prefecture?: string | null;
  age?: string | null;
  severity?: SeverityKey | null;
  /** 省略時は公式死亡災害個票（curated を除外）。 */
  source?: AnalyticsSourceFilter;
};

export type AnalyticsFilterOptions = {
  industries: string[];
  types: string[];
  years: number[];
  months: number[];
  industryMediums: string[];
  causes: string[];
  workplaceSizes: string[];
  occurrenceTimes: string[];
  prefectures: string[];
  ages: string[];
  severities: SeverityKey[];
  sources: AnalyticsSourceFilter[];
};

export type AnalyticsFieldCoverage = {
  known: number;
  missing: number;
  missingRatePercent: number;
};

export type AnalyticsCoverage = {
  industry: AnalyticsFieldCoverage;
  type: AnalyticsFieldCoverage;
  month: AnalyticsFieldCoverage;
  prefecture: AnalyticsFieldCoverage;
  workplaceSize: AnalyticsFieldCoverage;
  cause: AnalyticsFieldCoverage;
  occurrenceTime: AnalyticsFieldCoverage;
  age: AnalyticsFieldCoverage;
  weekday: AnalyticsFieldCoverage;
};

export type AnalyticsAggregates = {
  generatedAt: string;
  meta: {
    curatedCases: number;
    mhlwDeathsCount: number;
    mhlwFullDbCount: number;
    /** 選択データ源における、他条件で絞り込む前の総件数。 */
    datasetCases: number;
    /** 現在の全ANDフィルタに該当する件数。 */
    filteredCases: number;
    yearsCovered: { from: number; to: number };
    filters: {
      industry: string | null;
      type: string | null;
      year: number | null;
      month: number | null;
      industryMedium: string | null;
      cause: string | null;
      workplaceSize: string | null;
      occurrenceTime: string | null;
      prefecture: string | null;
      age: string | null;
      severity: SeverityKey | null;
      source: AnalyticsSourceFilter;
    };
    filterOptions: AnalyticsFilterOptions;
    coverage: AnalyticsCoverage;
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
