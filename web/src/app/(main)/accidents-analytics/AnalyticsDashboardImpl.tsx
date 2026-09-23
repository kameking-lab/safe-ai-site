"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardGrid, PageContainer, Section, Stack } from "@/components/layout";
import { LazyChart } from "@/components/charts/lazy-chart";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { DataExportToolbar } from "@/components/accidents/data-export-toolbar";
import type {
  AnalyticsAggregates,
  NameCount,
} from "@/lib/accidents-analytics/types";
import {
  ANALYTICS_CSV_FILENAME,
  analyticsToCsv,
  analyticsToSummaryText,
} from "@/lib/accidents-analytics/export";

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#f59e0b",
  "#0891b2",
];

type AnalyticsDashboardProps = {
  aggregates: AnalyticsAggregates;
};

type FilterState = {
  industry: string;
  type: string;
  year: string;
  month: string;
  industryMedium: string;
  cause: string;
  workplaceSize: string;
  occurrenceTime: string;
  prefecture: string;
  age: string;
  severity: string;
  source: string;
};

const SOURCE_LABELS: Record<string, string> = {
  official: "公式死亡個票（既定）",
  "mhlw-deaths-compact": "厚労省 死亡災害 2019〜2023",
  "mhlw-deaths-2024": "厚労省 死亡災害 2024",
  curated: "編集済み事例",
  all: "全ソース",
};

function FilterSelect({
  id,
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-1 text-[11px] font-semibold text-slate-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

function KpiCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "rose" | "amber" | "emerald" | "sky";
}) {
  const toneClass: Record<typeof tone, string> = {
    default: "border-slate-200 bg-white text-slate-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return (
    <div className={`rounded-lg border p-3 sm:p-4 ${toneClass[tone]}`}>
      <div className="text-[11px] font-semibold tracking-wide text-slate-500 sm:text-xs">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
        {value}
      </div>
      {note ? (
        <div className="mt-1 text-[11px] text-slate-500 sm:text-xs">{note}</div>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  height = 260,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <h3 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
          {description}
        </p>
      ) : null}
      <LazyChart className="mt-3" style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </LazyChart>
    </div>
  );
}

function RiskVisualSummary({
  fatalRatePercent,
  recentYearLabel,
  recentYearCount,
  seasonality,
}: {
  fatalRatePercent: number;
  recentYearLabel: string;
  recentYearCount: number;
  seasonality: NameCount[];
}) {
  const clampedFatalRate = Math.min(100, Math.max(0, fatalRatePercent));
  const maxMonthCount = Math.max(0, ...seasonality.map((item) => item.count));

  return (
    <section
      aria-labelledby="risk-visual-summary-title"
      className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold tracking-[.12em] text-rose-700">
            VISUAL SUMMARY
          </p>
          <h2
            id="risk-visual-summary-title"
            className="text-base font-bold text-slate-950 sm:text-lg"
          >
            メーターと月別ヒートマップで先に把握
          </h2>
        </div>
        <p className="max-w-xl text-[11px] leading-5 text-slate-600 sm:text-xs">
          色と長さは現在の絞り込み条件に連動します。死亡災害比率は全国の発生確率ではなく、収録事例内の構成比です。
        </p>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-lg border border-rose-200 bg-white p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                収録事例中の死亡災害比率
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums text-rose-700">
                {fatalRatePercent}%
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800">
              構成比
            </span>
          </div>
          <div
            role="meter"
            aria-label="収録事例中の死亡災害比率"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clampedFatalRate}
            aria-valuetext={`${fatalRatePercent}%`}
            className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600"
              style={{ width: `${clampedFatalRate}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="rounded-lg border border-orange-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">月別発生ヒートマップ</h3>
            <p className="text-[10px] text-slate-500">濃い色ほど収録件数が多い</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6" aria-hidden="true">
            {seasonality.map((item) => {
              const intensity =
                maxMonthCount === 0 ? 0 : item.count / maxMonthCount;
              return (
                <div
                  key={item.name}
                  className="min-w-0 rounded-md border border-orange-100 px-2 py-2 text-center"
                  style={{
                    backgroundColor: `rgba(234, 88, 12, ${0.08 + intensity * 0.82})`,
                    color: intensity > 0.55 ? "#ffffff" : "#7c2d12",
                  }}
                >
                  <div className="text-[10px] font-bold">{item.name}</div>
                  <div className="mt-0.5 text-sm font-black tabular-nums">
                    {formatNumber(item.count)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-bold text-slate-800">
          グラフの数値を表で確認
        </summary>
        <div className="mt-3 overflow-x-auto" role="region" aria-label="視覚サマリーの代替データ表">
          <table className="min-w-full border-collapse text-xs">
            <caption className="sr-only">死亡災害比率、最新年件数、月別件数</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th scope="col" className="whitespace-nowrap px-2 py-2">指標</th>
                <th scope="col" className="whitespace-nowrap px-2 py-2 text-right">値</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-semibold">死亡災害比率</th>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{fatalRatePercent}%</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-semibold">{recentYearLabel}の事故件数</th>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatNumber(recentYearCount)}件</td>
              </tr>
              {seasonality.map((item) => (
                <tr key={item.name} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-semibold">{item.name}</th>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatNumber(item.count)}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function AnalyticsDashboardImpl({
  aggregates,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const filterState: FilterState = {
    industry: aggregates.meta.filters.industry ?? "",
    type: aggregates.meta.filters.type ?? "",
    year: aggregates.meta.filters.year
      ? String(aggregates.meta.filters.year)
      : "",
    month: aggregates.meta.filters.month
      ? String(aggregates.meta.filters.month)
      : "",
    industryMedium: aggregates.meta.filters.industryMedium ?? "",
    cause: aggregates.meta.filters.cause ?? "",
    workplaceSize: aggregates.meta.filters.workplaceSize ?? "",
    occurrenceTime: aggregates.meta.filters.occurrenceTime ?? "",
    prefecture: aggregates.meta.filters.prefecture ?? "",
    age: aggregates.meta.filters.age ?? "",
    severity: aggregates.meta.filters.severity ?? "",
    source: aggregates.meta.filters.source,
  };
  const industryFilter = filterState.industry;
  const typeFilter = filterState.type;
  const yearFilter = filterState.year;

  const replaceFilters = (changes: Partial<FilterState>) => {
    const next = { ...filterState, ...changes };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (!value || (key === "source" && value === "official")) continue;
      params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const replaceFilter = (key: keyof FilterState, value: string) => {
    replaceFilters({ ...filterState, [key]: value });
  };

  const industryOptions = useMemo(
    () => aggregates.meta.filterOptions.industries,
    [aggregates.meta.filterOptions.industries],
  );
  const typeOptions = useMemo(
    () => aggregates.meta.filterOptions.types,
    [aggregates.meta.filterOptions.types],
  );
  const yearOptions = aggregates.meta.filterOptions.years;
  const hasFilters = Object.entries(filterState).some(
    ([key, value]) => Boolean(value) && !(key === "source" && value === "official"),
  );
  const activeFilters = [
    ["industry", "業種", filterState.industry],
    ["type", "事故型", filterState.type],
    ["year", "年", filterState.year && `${filterState.year}年`],
    ["month", "月", filterState.month && `${filterState.month}月`],
    ["industryMedium", "中分類", filterState.industryMedium],
    ["cause", "起因物", filterState.cause],
    ["workplaceSize", "事業場規模", filterState.workplaceSize],
    ["occurrenceTime", "時間帯", filterState.occurrenceTime],
    ["prefecture", "都道府県", filterState.prefecture],
    ["age", "年齢", filterState.age],
    ["severity", "重傷度", filterState.severity],
    [
      "source",
      "データ源",
      filterState.source !== "official" ? SOURCE_LABELS[filterState.source] : "",
    ],
  ].filter((item) => item[2]) as Array<[keyof FilterState, string, string]>;

  const yearTrendData = aggregates.yearTrend.map((y) => ({
    year: String(y.year),
    count: y.count,
  }));

  const monthTrend = aggregates.monthTrendRecent5y.map((m) => ({
    month: m.month,
    count: m.count,
  }));

  const seasonalityData = aggregates.seasonalityByMonth.map((s) => ({
    name: s.name,
    count: s.count,
  }));

  const quarterData = aggregates.seasonalityByQuarter;

  const weekdayData = aggregates.weekdayDistribution.map((w) => ({
    name: w.weekday,
    count: w.count,
  }));

  const industryRankTop12 = aggregates.industryRanking.slice(0, 12);
  const typeRankTop10 = aggregates.typeRanking.slice(0, 10);

  const industryDeathRate = aggregates.industryDeathRate.slice(0, 10);

  const typeTrend = useMemo(() => {
    return aggregates.typeTrendByYear.years.map((year, idx) => {
      const row: Record<string, number | string> = { year: String(year) };
      for (const s of aggregates.typeTrendByYear.series) {
        row[s.type] = s.values[idx] ?? 0;
      }
      return row;
    });
  }, [aggregates.typeTrendByYear]);

  const causeTop = aggregates.causeRanking;
  const occurrenceTime = aggregates.occurrenceTimeDistribution;
  const ageDistribution = aggregates.ageDistribution;
  const workplaceSize = aggregates.workplaceSizeRanking;
  const severityBreakdown = aggregates.severityBreakdown.filter(
    (s) => s.count > 0,
  );
  const prefectureTop15 = aggregates.prefectureRanking.slice(0, 15);

  const fullDbYearTrend = aggregates.fullDbYearTrend.map((y) => ({
    year: String(y.year),
    count: y.count,
  }));
  const fullDbIndustryTop10 = aggregates.fullDbIndustryRanking.slice(0, 10);

  const yoy = aggregates.yoyComparison;
  const periodLabel =
    aggregates.meta.yearsCovered.from > 0
      ? aggregates.meta.yearsCovered.from === aggregates.meta.yearsCovered.to
        ? `${aggregates.meta.yearsCovered.from}年`
        : `${aggregates.meta.yearsCovered.from}〜${aggregates.meta.yearsCovered.to}年`
      : "該当期間なし";
  const coverageItems = [
    ["業種", aggregates.meta.coverage.industry],
    ["事故型", aggregates.meta.coverage.type],
    ["発生月", aggregates.meta.coverage.month],
    ["都道府県", aggregates.meta.coverage.prefecture],
    ["年齢", aggregates.meta.coverage.age],
  ] as const;

  const resetFilters = () => {
    replaceFilters({
      industry: "",
      type: "",
      year: "",
      month: "",
      industryMedium: "",
      cause: "",
      workplaceSize: "",
      occurrenceTime: "",
      prefecture: "",
      age: "",
      severity: "",
      source: "official",
    });
  };

  // 柱C-7: 会議資料への持ち出し（CSV/要点コピー）。集計値そのままを文字列化。
  const exportCsv = useMemo(() => analyticsToCsv(aggregates), [aggregates]);
  const exportText = useMemo(
    () => analyticsToSummaryText(aggregates),
    [aggregates],
  );

  return (
    <PageContainer width="full" paddingX="default" paddingY="default">
      <Stack className="space-y-6 sm:space-y-8">
        {/* ===== Page header ===== */}
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accidents"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              ← 事故事例検索（補助）へ戻る
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              Analytics
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            収録個票を絞り込んで分析
          </h2>
          {/* 柱0・結論ファースト: 統計DBの規模をファーストビュー最上部にデカ数字で提示。
              値は下の「サマリーKPI」と同一ソース（収録総件数＝curatedCases＋mhlwDeathsCount、
              内訳＝厚労省死亡災害DB mhlwDeathsCount＋curated curatedCases、期間＝meta.yearsCovered）
              の転記のみ＝捏造なし。「いま何件を集計したダッシュボードか」を段落を読まず3秒で掴ませる。
              ※死亡災害比率は死亡災害DB寄りの統合構成で高めに出るため、文脈注記つきの
                サマリーKPI側に残し、ここでは誤読を避けて構成内訳チップのみ並べる。 */}
          <div
            data-testid="analytics-headline"
            className="flex flex-wrap items-end gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-slate-500">
                {hasFilters ? "絞り込み対象" : "収録 労働災害"}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums text-slate-900 sm:text-5xl">
                  {formatNumber(aggregates.meta.filteredCases)}
                </span>
                <span className="text-lg font-bold text-slate-700">件</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {periodLabel}・{SOURCE_LABELS[filterState.source] ?? "選択データ源"}
                {hasFilters
                  ? `（全${formatNumber(aggregates.meta.datasetCases)}件中）`
                  : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800">
                厚労省死亡災害DB {formatNumber(aggregates.meta.mhlwDeathsCount)}
                件
              </span>
              {aggregates.meta.curatedCases > 0 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  編集済み事例 {formatNumber(aggregates.meta.curatedCases)}件
                </span>
              ) : null}
            </div>
          </div>
          {/* 長いデータ源説明は折りたたみ、操作と対象件数を先に見せる。 */}
          <CollapsibleDetail summary="このダッシュボードのデータ源について">
            既定では厚労省の死亡災害個票だけを対象にし、編集済み事例は混ぜません。詳細条件の「データ源」で切り替えた場合だけ、選んだ母集団を集計します。現在の対象は
            {formatNumber(aggregates.meta.filteredCases)}件です。
            厚労省「職場のあんぜんサイト」全件DB（
            {formatNumber(aggregates.meta.mhlwFullDbCount)} 件 /
            2006〜2021）の集計データも参照軸として併載しています。
          </CollapsibleDetail>
          {/* 柱C-7: 集計の出力手段。月例安全会議の資料へCSV/要点コピー/共有/印刷で持ち出せる。 */}
          <DataExportToolbar
            filename={ANALYTICS_CSV_FILENAME}
            csv={exportCsv}
            text={exportText}
            shareTitle="事故分析ダッシュボード"
          />
        </header>

        {/* ===== Filter bar ===== */}
        <section
          id="detail-charts"
          className="scroll-mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4"
        >
          <div className="mb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-950">条件を選んで事故を絞り込む</h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  選んだ条件はすべてANDで集計・グラフ・CSVへ反映します。
                </p>
              </div>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                対象 {formatNumber(aggregates.meta.filteredCases)}件
              </span>
            </div>
            <div className="mt-3 space-y-2" aria-label="よく使う条件">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-bold text-slate-500">よく使う業種</span>
                {industryOptions.slice(0, 5).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={industryFilter === option}
                    onClick={() => replaceFilter("industry", industryFilter === option ? "" : option)}
                    className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-bold ${
                      industryFilter === option
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-bold text-slate-500">よく使う事故型</span>
                {typeOptions.slice(0, 5).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={typeFilter === option}
                    onClick={() => replaceFilter("type", typeFilter === option ? "" : option)}
                    className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-bold ${
                      typeFilter === option
                        ? "border-rose-700 bg-rose-700 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-rose-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label
                htmlFor="industry-filter"
                className="mb-1 text-[11px] font-semibold text-slate-600"
              >
                業種で絞り込み
              </label>
              <select
                id="industry-filter"
                value={industryFilter}
                onChange={(e) =>
                  replaceFilters({
                    industry: e.target.value,
                    type: typeFilter,
                    year: yearFilter,
                  })
                }
                className="min-h-[44px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">全業種</option>
                {industryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="type-filter"
                className="mb-1 text-[11px] font-semibold text-slate-600"
              >
                事故種類で絞り込み
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) =>
                  replaceFilters({
                    industry: industryFilter,
                    type: e.target.value,
                    year: yearFilter,
                  })
                }
                className="min-h-[44px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">全種類</option>
                {typeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="year-filter"
                className="mb-1 text-[11px] font-semibold text-slate-600"
              >
                年で絞り込み
              </label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(e) =>
                  replaceFilters({
                    industry: industryFilter,
                    type: typeFilter,
                    year: e.target.value,
                  })
                }
                className="min-h-[44px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">全期間</option>
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}年
                  </option>
                ))}
              </select>
            </div>
            <details className="w-full rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">
                詳細条件（月・中分類・起因物・規模・時間帯・地域・年齢・重傷度・データ源）
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <FilterSelect
                  id="month-filter"
                  label="発生月"
                  value={filterState.month}
                  allLabel="全月"
                  options={aggregates.meta.filterOptions.months.map((month) => ({ value: String(month), label: `${month}月` }))}
                  onChange={(value) => replaceFilter("month", value)}
                />
                <FilterSelect
                  id="industry-medium-filter"
                  label="業種中分類"
                  value={filterState.industryMedium}
                  allLabel="全中分類"
                  options={aggregates.meta.filterOptions.industryMediums.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("industryMedium", value)}
                />
                <FilterSelect
                  id="cause-filter"
                  label="起因物"
                  value={filterState.cause}
                  allLabel="全起因物"
                  options={aggregates.meta.filterOptions.causes.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("cause", value)}
                />
                <FilterSelect
                  id="workplace-size-filter"
                  label="事業場規模"
                  value={filterState.workplaceSize}
                  allLabel="全規模"
                  options={aggregates.meta.filterOptions.workplaceSizes.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("workplaceSize", value)}
                />
                <FilterSelect
                  id="occurrence-time-filter"
                  label="発生時間帯（2時間）"
                  value={filterState.occurrenceTime}
                  allLabel="全時間帯"
                  options={aggregates.meta.filterOptions.occurrenceTimes.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("occurrenceTime", value)}
                />
                <FilterSelect
                  id="prefecture-filter"
                  label="都道府県"
                  value={filterState.prefecture}
                  allLabel="全国"
                  options={aggregates.meta.filterOptions.prefectures.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("prefecture", value)}
                />
                <FilterSelect
                  id="age-filter"
                  label="年齢"
                  value={filterState.age}
                  allLabel="全年齢"
                  options={aggregates.meta.filterOptions.ages.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("age", value)}
                />
                <FilterSelect
                  id="severity-filter"
                  label="重傷度"
                  value={filterState.severity}
                  allLabel="全重傷度"
                  options={aggregates.meta.filterOptions.severities.map((value) => ({ value, label: value }))}
                  onChange={(value) => replaceFilter("severity", value)}
                />
                <FilterSelect
                  id="source-filter"
                  label="データ源"
                  value={filterState.source}
                  allLabel="公式死亡個票（既定）"
                  options={aggregates.meta.filterOptions.sources.map((value) => ({ value, label: SOURCE_LABELS[value] ?? value }))}
                  onChange={(value) => replaceFilter("source", value || "official")}
                />
              </div>
            </details>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[44px] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                絞り込みをリセット
              </button>
            )}
            <p className="ml-auto text-[10px] text-slate-500 sm:text-[11px]">
              公式死亡個票が既定です。編集済み事例はデータ源で明示的に選べます。
            </p>
          </div>
          {activeFilters.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="適用中の条件">
              <span className="text-[11px] font-bold text-slate-500">適用中</span>
              {activeFilters.map(([key, label, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => replaceFilter(key, key === "source" ? "official" : "")}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
                  aria-label={`${label} ${value} を解除`}
                >
                  {label}: {value}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}
              <button type="button" onClick={resetFilters} className="min-h-[32px] px-2 text-[11px] font-bold text-slate-600 underline">
                すべて解除
              </button>
            </div>
          ) : null}
          <div
            className="mt-3 rounded-lg border border-slate-200 bg-white p-3"
            aria-live="polite"
            data-testid="analytics-filter-summary"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">
                対象 {formatNumber(aggregates.meta.filteredCases)}件
                <span className="ml-2 text-xs font-normal text-slate-500">
                  全{formatNumber(aggregates.meta.datasetCases)}件中・
                  {periodLabel}
                </span>
              </p>
              {hasFilters ? (
                <p className="text-[11px] font-semibold text-emerald-800">
                  {activeFilters.map(([, label, value]) => `${label}: ${value}`).join(" × ")}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">公式死亡個票を表示中</p>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {coverageItems.map(([label, coverage]) => (
                <div key={label} className="rounded-md bg-slate-50 px-2 py-1.5">
                  <dt className="text-[10px] font-semibold text-slate-500">
                    {label}欠損率
                  </dt>
                  <dd className="text-xs font-bold tabular-nums text-slate-800">
                    {coverage.missingRatePercent}%
                    <span className="ml-1 font-normal text-slate-500">
                      ({formatNumber(coverage.missing)}/
                      {formatNumber(aggregates.meta.filteredCases)})
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            {aggregates.meta.filteredCases === 0 ? (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                この条件に一致する事例はありません。条件を1つ外すか、
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-1 font-bold underline underline-offset-2"
                >
                  全条件をリセット
                </button>
                してください。
              </div>
            ) : null}
          </div>
        </section>

        <RiskVisualSummary
          fatalRatePercent={aggregates.kpi.fatalRatePercent}
          recentYearLabel={aggregates.kpi.recentYearLabel}
          recentYearCount={aggregates.kpi.recentYearCount}
          seasonality={seasonalityData}
        />
        {/* ===== KPI summary ===== */}
        <Section
          title="サマリーKPI"
          description="ダッシュボードの主要指標。"
          spacing="tight"
        >
          <CardGrid cols={4} gap="md">
            <KpiCard
              label={`${aggregates.kpi.recentYearLabel}の事故件数`}
              value={`${formatNumber(aggregates.kpi.recentYearCount)} 件`}
              note={yearFilter ? "選択年の対象件数" : "選択データ源の最新年"}
              tone="rose"
            />
            <KpiCard
              label={yearFilter ? "選択年（月情報あり）" : "直近12ヶ月"}
              value={`${formatNumber(aggregates.kpi.trailing12mCount)} 件`}
              note={
                yearFilter ? "月を特定できる事例の累計" : "月次推移から累計"
              }
              tone="amber"
            />
            <KpiCard
              label="死亡事例の構成比"
              value={`${aggregates.kpi.fatalRatePercent}%`}
              note="収録事例内の構成比（発生率ではありません）"
              tone="rose"
            />
            <KpiCard
              label={hasFilters ? "対象総件数" : "収録総件数"}
              value={`${formatNumber(aggregates.meta.filteredCases)} 件`}
              note={`${SOURCE_LABELS[filterState.source] ?? "選択データ源"}の対象`}
              tone="emerald"
            />
          </CardGrid>
          <CardGrid cols={2} gap="md" className="mt-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 sm:text-xs">
                収録件数の多い業種 TOP3
              </div>
              <ol className="mt-2 space-y-1.5">
                {aggregates.kpi.riskiestIndustries.map((ind, idx) => (
                  <li
                    key={ind.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {ind.name}
                      </span>
                    </span>
                    <span className="tabular-nums text-slate-600">
                      {formatNumber(ind.count)} 件
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 sm:text-xs">
                事故種類 TOP3
              </div>
              <ol className="mt-2 space-y-1.5">
                {aggregates.kpi.riskiestTypes.map((ty, idx) => (
                  <li
                    key={ty.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {ty.name}
                      </span>
                    </span>
                    <span className="tabular-nums text-slate-600">
                      {formatNumber(ty.count)} 件
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </CardGrid>
        </Section>

        {/* ===== Section 1: Time-series ===== */}
        <Section
          title="① 時系列分析"
          description="年・月・四半期・曜日の単位で事故発生の傾向を把握する。"
          spacing="tight"
        >
          <CardGrid cols={2} gap="md">
            <ChartCard
              title="年別 事故件数推移"
              description={`${periodLabel}・現在の絞り込み対象`}
            >
              <LineChart
                data={yearTrendData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartCard>

            <ChartCard
              title="月別 事故件数推移（直近5年）"
              description="月次の細かい変動を把握"
            >
              <LineChart
                data={monthTrend}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9 }}
                  interval={"preserveStartEnd"}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0891b2"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ChartCard>

            <ChartCard
              title="月別 季節性（合算）"
              description="全期間累計を1〜12月で割り当て"
            >
              <BarChart data={seasonalityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#f97316" />
              </BarChart>
            </ChartCard>

            <ChartCard title="四半期別 集計" description="Q1〜Q4 の合算">
              <BarChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ChartCard>
          </CardGrid>

          {weekdayData.some((w) => w.count > 0) && (
            <ChartCard
              title="曜日別 分布"
              description="curated 事例のみ（日付情報がある事例から集計）"
              height={220}
            >
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ChartCard>
          )}
        </Section>

        {/* ===== Section 2: Industry ===== */}
        <Section
          title="② 業種分析"
          description="どの業種でどんな事故が起きているかを比較。"
          spacing="tight"
        >
          <CardGrid cols={2} gap="md">
            <ChartCard title="業種別 事故件数 TOP12" height={360}>
              <BarChart
                data={industryRankTop12}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#dc2626" />
              </BarChart>
            </ChartCard>

            <ChartCard
              title="業種別 収録事例中の死亡事例割合"
              description="収録事例内の構成比です。全国の発生確率やリスクの高さを示す値ではありません。"
              height={360}
            >
              <BarChart
                data={industryDeathRate}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  domain={[0, "dataMax"]}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="industry"
                  width={88}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "rate")
                      return [`${Number(value)}%`, "収録事例中の割合"];
                    return [formatNumber(Number(value)), String(name)];
                  }}
                />
                <Bar dataKey="rate" fill="#ef4444" />
              </BarChart>
            </ChartCard>
          </CardGrid>

          <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              業種 × 事故種類 クロス分析
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
              TOP7 業種 × TOP8 事故種類。色が濃いほど件数が多い。
            </p>
            <CrossHeatmap matrix={aggregates.industryTypeMatrix} />
          </div>
        </Section>

        {/* ===== Section 3: Accident type ===== */}
        <Section
          title="③ 事故種類分析"
          description="事故種類ごとの構成比と年次トレンド。"
          spacing="tight"
        >
          <CardGrid cols={2} gap="md">
            <ChartCard title="事故種類別 件数 TOP10" height={360}>
              <BarChart
                data={typeRankTop10}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={104}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ChartCard>

            <ChartCard title="事故種類 TOP5 の年次トレンド" height={360}>
              <LineChart data={typeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {aggregates.typeTrendByYear.series.map((s, idx) => (
                  <Line
                    key={s.type}
                    type="monotone"
                    dataKey={s.type}
                    stroke={PALETTE[idx % PALETTE.length]}
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                ))}
              </LineChart>
            </ChartCard>
          </CardGrid>
        </Section>

        {/* ===== Section 4: Region / scale ===== */}
        <Section
          title="④ 地域・事業規模分析"
          description="都道府県別（2024年データ）・事業所規模別の分布。"
          spacing="tight"
        >
          <CardGrid cols={2} gap="md">
            <ChartCard
              title="都道府県別 死亡災害 TOP15"
              description="厚労省 2024年 死傷病報告（739件・都道府県情報あり）"
              height={360}
            >
              <BarChart
                data={prefectureTop15}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={64}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ChartCard>

            <ChartCard
              title="事業所規模別 分布"
              description="厚労省データの workplaceSize 区分"
              height={360}
            >
              <BarChart
                data={workplaceSize}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ChartCard>
          </CardGrid>
        </Section>

        {/* ===== Section 5: Detail (cause / time / age / severity) ===== */}
        <DetailsSection
          causeTop={causeTop}
          occurrenceTime={occurrenceTime}
          ageDistribution={ageDistribution}
          severityBreakdown={severityBreakdown}
        />

        {/* ===== Section 6: Comparison ===== */}
        <Section
          title="⑥ 比較分析"
          description="現在の業種・事故型における年度比較と、絞り込み対象外の長期参照軸。"
          spacing="tight"
        >
          <CardGrid cols={3} gap="md">
            <KpiCard
              label={`${yoy.previousYear.year}年`}
              value={`${formatNumber(yoy.previousYear.count)} 件`}
              note="前年（統合データセット）"
            />
            <KpiCard
              label={`${yoy.currentYear.year}年`}
              value={`${formatNumber(yoy.currentYear.count)} 件`}
              note="最新年（統合データセット）"
              tone="rose"
            />
            <KpiCard
              label="前年比"
              value={`${yoy.deltaPercent > 0 ? "+" : ""}${yoy.deltaPercent}%`}
              note={yoy.deltaPercent >= 0 ? "増加" : "減少"}
              tone={yoy.deltaPercent >= 0 ? "rose" : "emerald"}
            />
          </CardGrid>

          <CardGrid cols={2} gap="md">
            <ChartCard
              title="厚労省 全件DB 年別推移（参照軸）"
              description={`2006〜2021・504,415件の全件統計（上の絞り込み対象外）`}
            >
              <LineChart data={fullDbYearTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartCard>

            <ChartCard
              title="厚労省 全件DB 業種別 TOP10（参照軸）"
              description="長期スパンでの業種ランキング（上の絞り込み対象外）"
              height={320}
            >
              <BarChart
                data={fullDbIndustryTop10}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ChartCard>
          </CardGrid>
        </Section>

        {/* ===== Disclaimer footer ===== */}
        <section className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 sm:text-xs">
          <p className="font-semibold text-slate-800">
            <BarChart3
              className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
              aria-hidden="true"
            />
            データソースと制限
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              <strong>選択中の母集団</strong>は
              {SOURCE_LABELS[aggregates.meta.filters.source] ?? "選択データ源"}の
              {formatNumber(aggregates.meta.datasetCases)}件です。現在の絞り込み後は
              {formatNumber(aggregates.meta.filteredCases)}件です。編集済み事例はデータ源で明示的に選んだ場合だけ含めます。
            </li>
            <li>
              <strong>都道府県・年齢</strong>は厚労省
              2024年データ（739件）のみで取得可能なため、その範囲での集計です。
            </li>
            <li>
              <strong>曜日</strong>は編集済み事例をデータ源で選んだ場合だけ表示し、日付詳細がある事例を母数にします。
            </li>
            <li>
              <strong>参照軸（⑥）</strong>は厚労省全件DB（
              {formatNumber(aggregates.meta.mhlwFullDbCount)}{" "}
              件・2006〜2021）の事前集計値を表示しています。
            </li>
            <li>
              表示中の数値は、上記のデータ源・期間・現在の絞り込み条件に基づきます。
            </li>
          </ul>
        </section>
      </Stack>
    </PageContainer>
  );
}

function DetailsSection({
  causeTop,
  occurrenceTime,
  ageDistribution,
  severityBreakdown,
}: {
  causeTop: NameCount[];
  occurrenceTime: NameCount[];
  ageDistribution: NameCount[];
  severityBreakdown: NameCount[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Section
      title="⑤ 詳細分析"
      description="起因物・時間帯・年齢・重傷度。詳細項目はクリックで展開できます。"
      spacing="tight"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        aria-expanded={open}
      >
        {open ? "詳細項目を折りたたむ ▲" : "詳細項目を展開 ▼"}
      </button>

      {open && (
        <CardGrid cols={2} gap="md">
          <ChartCard
            title="起因物 TOP15"
            description="厚労省 cause 区分"
            height={360}
          >
            <BarChart data={causeTop} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(v) => formatNumber(Number(v))} />
              <Bar dataKey="count" fill="#14b8a6" />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="時間帯別 分布"
            description="2時間刻みでの発生時刻"
            height={360}
          >
            <BarChart data={occurrenceTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatNumber(Number(v))} />
              <Bar dataKey="count" fill="#ec4899" />
            </BarChart>
          </ChartCard>

          {ageDistribution.length > 0 && (
            <ChartCard
              title="年齢別 分布"
              description="厚労省 2024年データ（739件・年齢情報あり）"
              height={300}
            >
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Bar dataKey="count" fill="#0891b2" />
              </BarChart>
            </ChartCard>
          )}

          {severityBreakdown.length > 0 && (
            <ChartCard
              title="重傷度 内訳"
              description="curated 事例から（厚労省データは全て死亡）"
              height={300}
            >
              <PieChart>
                <Pie
                  data={severityBreakdown}
                  dataKey="count"
                  nameKey="name"
                  outerRadius={92}
                  label={(entry: { name?: string; count?: number }) =>
                    entry.name && entry.count
                      ? `${entry.name}: ${entry.count}`
                      : ""
                  }
                >
                  {severityBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartCard>
          )}
        </CardGrid>
      )}
    </Section>
  );
}

function CrossHeatmap({
  matrix,
}: {
  matrix: { industries: string[]; types: string[]; matrix: number[][] };
}) {
  const max = matrix.matrix.reduce((m, row) => Math.max(m, ...row), 0);
  const intensity = (v: number): string => {
    if (max === 0) return "#f8fafc";
    const ratio = v / max;
    // Tailwind rose scale interpolation
    const hue = Math.round(15 + ratio * 5);
    const sat = Math.round(85 + ratio * 5);
    const light = Math.round(98 - ratio * 50);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };
  return (
    <div
      className="mt-3 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      role="region"
      aria-label="業種と事故型のクロス集計表。横方向にスクロールできます"
      tabIndex={0}
    >
      <table className="min-w-full border-separate border-spacing-0 text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-slate-500" />
            {matrix.types.map((t) => (
              <th
                key={t}
                scope="col"
                className="whitespace-nowrap px-2 py-1 text-center font-semibold text-slate-700"
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.industries.map((ind, i) => (
            <tr key={ind}>
              <th
                scope="row"
                className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1 text-left font-semibold text-slate-700"
              >
                {ind}
              </th>
              {matrix.types.map((_, j) => {
                const v = matrix.matrix[i][j];
                return (
                  <td
                    key={j}
                    className="px-2 py-1 text-center tabular-nums"
                    style={{
                      backgroundColor: intensity(v),
                      color: v / max > 0.55 ? "#fff" : "#0f172a",
                    }}
                  >
                    {v === 0 ? "·" : formatNumber(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
