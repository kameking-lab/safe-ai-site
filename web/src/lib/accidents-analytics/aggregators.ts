import byYearFull from "@/data/aggregates-mhlw/accidents-by-year.json";
import byIndustryFull from "@/data/aggregates-mhlw/accidents-by-industry.json";
import metaJson from "@/data/aggregates-mhlw/meta.json";
import { normalizeHazardLabel } from "@/lib/accidents/type-normalization";
import { loadCombinedCases, type CombinedCase } from "./loader";
import type {
  AnalyticsAggregates,
  IndustryDeathRate,
  IndustryTypeMatrix,
  NameCount,
  YearTrendByType,
} from "./types";

type YearMap = Record<string, Record<string, number>>;

/**
 * 型別の集計は正規化ラベル（21分類正本）で数える。
 * 死亡個票は「墜落、転落」、事例DBは「墜落」と表記が割れており、
 * 生の文字列のまま数えると同じ型が二重計上される（是正済みバグ）。
 */
function caseHazardLabel(c: CombinedCase): string | null {
  return c.type ? normalizeHazardLabel(c.type) : null;
}

const byYearFullData = byYearFull as YearMap;
const byIndustryFullData = byIndustryFull as YearMap;

/** Order-preserving counter for top-N rankings. */
function countBy<T>(items: T[], key: (item: T) => string | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

function topN(map: Map<string, number>, n: number): NameCount[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function allRanked(map: Map<string, number>): NameCount[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function yearRange(years: number[]): { min: number; max: number } {
  const filtered = years.filter((y) => y > 0);
  if (filtered.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...filtered), max: Math.max(...filtered) };
}

/** Quarter label from month (1-12). */
function quarterOf(month: number): string {
  if (month <= 3) return "Q1 (1-3月)";
  if (month <= 6) return "Q2 (4-6月)";
  if (month <= 9) return "Q3 (7-9月)";
  return "Q4 (10-12月)";
}

function aggregateYearTrend(cases: CombinedCase[]) {
  const yearCounts = new Map<number, number>();
  for (const c of cases) {
    if (c.year <= 0) continue;
    yearCounts.set(c.year, (yearCounts.get(c.year) ?? 0) + 1);
  }
  return [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

function aggregateMonthTrendRecent5y(cases: CombinedCase[], maxYear: number) {
  const cutoff = maxYear - 4;
  const counts = new Map<string, number>();
  for (const c of cases) {
    if (c.year < cutoff || !c.month) continue;
    const key = `${c.year}-${String(c.month).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function aggregateSeasonalityByMonth(cases: CombinedCase[]): NameCount[] {
  const counts = new Array<number>(12).fill(0);
  for (const c of cases) {
    if (!c.month) continue;
    counts[c.month - 1] += 1;
  }
  return counts.map((count, idx) => ({ name: `${idx + 1}月`, count }));
}

function aggregateSeasonalityByQuarter(cases: CombinedCase[]): NameCount[] {
  const map = new Map<string, number>();
  for (const c of cases) {
    if (!c.month) continue;
    const q = quarterOf(c.month);
    map.set(q, (map.get(q) ?? 0) + 1);
  }
  const order = ["Q1 (1-3月)", "Q2 (4-6月)", "Q3 (7-9月)", "Q4 (10-12月)"];
  return order.map((name) => ({ name, count: map.get(name) ?? 0 }));
}

function aggregateWeekday(cases: CombinedCase[]) {
  const order = ["日", "月", "火", "水", "木", "金", "土"];
  const map = new Map<string, number>();
  for (const c of cases) {
    if (!c.weekday) continue;
    map.set(c.weekday, (map.get(c.weekday) ?? 0) + 1);
  }
  return order.map((weekday) => ({ weekday, count: map.get(weekday) ?? 0 }));
}

function aggregateIndustryRanking(cases: CombinedCase[]) {
  return allRanked(countBy(cases, (c) => c.industry));
}

function aggregateIndustryDeathRate(cases: CombinedCase[]): IndustryDeathRate[] {
  const totals = new Map<string, { total: number; fatal: number }>();
  for (const c of cases) {
    if (!c.industry) continue;
    const cur = totals.get(c.industry) ?? { total: 0, fatal: 0 };
    cur.total += 1;
    if (c.severity === "死亡") cur.fatal += 1;
    totals.set(c.industry, cur);
  }
  return [...totals.entries()]
    .map(([industry, { total, fatal }]) => ({
      industry,
      total,
      fatal,
      rate: total === 0 ? 0 : Math.round((fatal / total) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total);
}

function aggregateIndustryTypeMatrix(cases: CombinedCase[]): IndustryTypeMatrix {
  const industries = allRanked(countBy(cases, (c) => c.industry))
    .slice(0, 7)
    .map((x) => x.name);
  const types = allRanked(countBy(cases, caseHazardLabel))
    .slice(0, 8)
    .map((x) => x.name);
  const industryIdx = new Map(industries.map((n, i) => [n, i]));
  const typeIdx = new Map(types.map((n, i) => [n, i]));
  const matrix = industries.map(() => new Array(types.length).fill(0) as number[]);
  for (const c of cases) {
    const label = caseHazardLabel(c);
    if (!c.industry || !label) continue;
    const i = industryIdx.get(c.industry);
    const j = typeIdx.get(label);
    if (i === undefined || j === undefined) continue;
    matrix[i][j] += 1;
  }
  return { industries, types, matrix };
}

function aggregateTypeRanking(cases: CombinedCase[]) {
  return allRanked(countBy(cases, caseHazardLabel));
}

function aggregateTypeTrendByYear(cases: CombinedCase[]): YearTrendByType {
  const topTypes = allRanked(countBy(cases, caseHazardLabel))
    .slice(0, 5)
    .map((x) => x.name);
  const years = [...new Set(cases.map((c) => c.year).filter((y) => y > 0))].sort();
  const seriesMap = new Map<string, number[]>();
  for (const t of topTypes) seriesMap.set(t, new Array(years.length).fill(0));
  const yearIdx = new Map(years.map((y, i) => [y, i]));
  for (const c of cases) {
    const label = caseHazardLabel(c);
    if (!label || !topTypes.includes(label)) continue;
    const i = yearIdx.get(c.year);
    if (i === undefined) continue;
    const arr = seriesMap.get(label);
    if (arr) arr[i] += 1;
  }
  return {
    years,
    series: topTypes.map((type) => ({ type, values: seriesMap.get(type) ?? [] })),
  };
}

function aggregatePrefectureRanking(cases: CombinedCase[]) {
  return allRanked(countBy(cases, (c) => c.prefecture));
}

function aggregateWorkplaceSize(cases: CombinedCase[]) {
  return allRanked(countBy(cases, (c) => c.workplaceSize));
}

function aggregateCause(cases: CombinedCase[]) {
  return topN(countBy(cases, (c) => c.cause), 15);
}

function aggregateOccurrenceTime(cases: CombinedCase[]): NameCount[] {
  const map = new Map<string, number>();
  for (const c of cases) {
    if (!c.occurrenceTime) continue;
    map.set(c.occurrenceTime, (map.get(c.occurrenceTime) ?? 0) + 1);
  }
  // Sort by leading numeric value to produce 0-2, 2-4, ... order.
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const na = Number(a.name.match(/^(\d+)/)?.[1] ?? -1);
      const nb = Number(b.name.match(/^(\d+)/)?.[1] ?? -1);
      return na - nb;
    });
}

function aggregateAge(cases: CombinedCase[]): NameCount[] {
  const map = new Map<string, number>();
  for (const c of cases) {
    if (!c.age) continue;
    map.set(c.age, (map.get(c.age) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const na = Number(a.name.match(/^(\d+)/)?.[1] ?? 0);
      const nb = Number(b.name.match(/^(\d+)/)?.[1] ?? 0);
      return na - nb;
    });
}

function aggregateSeverity(cases: CombinedCase[]): NameCount[] {
  const order: Array<"軽傷" | "中等傷" | "重傷" | "死亡"> = ["軽傷", "中等傷", "重傷", "死亡"];
  const map = new Map<string, number>();
  for (const c of cases) {
    map.set(c.severity, (map.get(c.severity) ?? 0) + 1);
  }
  return order.map((name) => ({ name, count: map.get(name) ?? 0 }));
}

function aggregateFullDbYearTrend() {
  const out: { year: number; count: number }[] = [];
  for (const [year, types] of Object.entries(byYearFullData)) {
    const total = Object.values(types).reduce((a, b) => a + (b as number), 0);
    out.push({ year: Number(year), count: total });
  }
  return out.sort((a, b) => a.year - b.year);
}

function aggregateFullDbIndustryRanking(): NameCount[] {
  const counts = new Map<string, number>();
  for (const yearMap of Object.values(byIndustryFullData)) {
    for (const [industry, count] of Object.entries(yearMap)) {
      counts.set(industry, (counts.get(industry) ?? 0) + (count as number));
    }
  }
  return allRanked(counts);
}

let cached: AnalyticsAggregates | null = null;

/**
 * Compute all dashboard aggregates. The result is cached for the lifetime
 * of the Node process so all sections share a single pass over the data.
 */
export function getAnalyticsAggregates(): AnalyticsAggregates {
  if (cached) return cached;
  const cases = loadCombinedCases();
  const yr = yearRange(cases.map((c) => c.year));
  const maxYear = yr.max || new Date().getFullYear();

  const yearTrend = aggregateYearTrend(cases);
  const fullDbYearTrend = aggregateFullDbYearTrend();
  const industryRanking = aggregateIndustryRanking(cases);
  const typeRanking = aggregateTypeRanking(cases);

  const recentYear = yearTrend.length ? yearTrend[yearTrend.length - 1] : { year: maxYear, count: 0 };
  const prevYear =
    yearTrend.length >= 2 ? yearTrend[yearTrend.length - 2] : { year: maxYear - 1, count: 0 };

  // Trailing 12 months — sum of last 12 monthly buckets that exist.
  const monthsRecent5y = aggregateMonthTrendRecent5y(cases, maxYear);
  const trailing12m = monthsRecent5y.slice(-12).reduce((acc, m) => acc + m.count, 0);

  const fatalRatePercent = (() => {
    const totals = cases.length;
    const fatal = cases.filter((c) => c.severity === "死亡").length;
    return totals === 0 ? 0 : Math.round((fatal / totals) * 1000) / 10;
  })();

  const aggregates: AnalyticsAggregates = {
    generatedAt: new Date().toISOString(),
    meta: {
      curatedCases: cases.filter((c) => c.source === "curated").length,
      mhlwDeathsCount: cases.filter((c) => c.source !== "curated").length,
      mhlwFullDbCount: (metaJson as { accidents: { total: number } }).accidents.total,
      yearsCovered: { from: yr.min, to: yr.max },
    },
    kpi: {
      curatedTotal: cases.filter((c) => c.source === "curated").length,
      mhlwDeathsTotal: cases.filter((c) => c.source !== "curated").length,
      recentYearLabel: `${recentYear.year}年`,
      recentYearCount: recentYear.count,
      trailing12mCount: trailing12m,
      riskiestIndustries: industryRanking.slice(0, 3),
      riskiestTypes: typeRanking.slice(0, 3),
      fatalRatePercent,
    },
    yearTrend,
    monthTrendRecent5y: monthsRecent5y,
    seasonalityByMonth: aggregateSeasonalityByMonth(cases),
    seasonalityByQuarter: aggregateSeasonalityByQuarter(cases),
    weekdayDistribution: aggregateWeekday(cases),
    industryRanking,
    industryDeathRate: aggregateIndustryDeathRate(cases),
    industryTypeMatrix: aggregateIndustryTypeMatrix(cases),
    typeRanking,
    typeTrendByYear: aggregateTypeTrendByYear(cases),
    prefectureRanking: aggregatePrefectureRanking(cases),
    workplaceSizeRanking: aggregateWorkplaceSize(cases),
    causeRanking: aggregateCause(cases),
    occurrenceTimeDistribution: aggregateOccurrenceTime(cases),
    ageDistribution: aggregateAge(cases),
    severityBreakdown: aggregateSeverity(cases),
    fullDbYearTrend,
    fullDbIndustryRanking: aggregateFullDbIndustryRanking(),
    yoyComparison: {
      previousYear: prevYear,
      currentYear: recentYear,
      deltaPercent:
        prevYear.count === 0
          ? 0
          : Math.round(((recentYear.count - prevYear.count) / prevYear.count) * 1000) / 10,
    },
  };

  cached = aggregates;
  return aggregates;
}
