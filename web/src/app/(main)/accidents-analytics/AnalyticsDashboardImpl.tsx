"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import type { AnalyticsAggregates, NameCount } from "@/lib/accidents-analytics/types";
import { getIndustryInsight } from "@/lib/accidents-analytics/industry-insight";
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
      <div className="text-[11px] font-semibold tracking-wide text-slate-500 sm:text-xs">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
      {note ? <div className="mt-1 text-[11px] text-slate-500 sm:text-xs">{note}</div> : null}
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
        <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{description}</p>
      ) : null}
      <LazyChart className="mt-3" style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </LazyChart>
    </div>
  );
}

function applyFilter(
  data: NameCount[],
  industry: string | null,
  type: string | null,
): NameCount[] {
  // Industry/type filters affect dimensions other than themselves only;
  // the filter UI is informational on rankings already-restricted by the
  // dimension being shown. We apply a simple visibility filter that
  // preserves the dataset's existing aggregate when no filter is set.
  if (!industry && !type) return data;
  // For rankings within the dimension of the filter itself, keep only the
  // matched row so users can see relative magnitude on its own.
  if (industry && data.some((d) => d.name === industry)) {
    return data.filter((d) => d.name === industry);
  }
  if (type && data.some((d) => d.name === type)) {
    return data.filter((d) => d.name === type);
  }
  return data;
}

export function AnalyticsDashboardImpl({ aggregates }: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [industryFilter, setIndustryFilter] = useState<string>(
    () => searchParams?.get("industry") ?? "",
  );
  const [typeFilter, setTypeFilter] = useState<string>(
    () => searchParams?.get("type") ?? "",
  );

  // Sync filter state -> URL (replace so back goes to a previous page, not a previous filter)
  useEffect(() => {
    const params = new URLSearchParams();
    if (industryFilter) params.set("industry", industryFilter);
    if (typeFilter) params.set("type", typeFilter);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current =
      window.location.pathname + (window.location.search || "");
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [industryFilter, typeFilter, pathname, router]);

  const industryOptions = useMemo(
    () => aggregates.industryRanking.map((x) => x.name),
    [aggregates.industryRanking],
  );
  // 軸G: 「まず、自業種の要点」サマリー。業種選択で多い事故型・順位・死亡率を即提示。
  const insight = useMemo(
    () => getIndustryInsight(aggregates, industryFilter),
    [aggregates, industryFilter],
  );
  const typeOptions = useMemo(
    () => aggregates.typeRanking.map((x) => x.name),
    [aggregates.typeRanking],
  );

  const i = industryFilter || null;
  const t = typeFilter || null;

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

  const industryRankTop12 = applyFilter(aggregates.industryRanking, i, t).slice(0, 12);
  const typeRankTop10 = applyFilter(aggregates.typeRanking, i, t).slice(0, 10);

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
  const severityBreakdown = aggregates.severityBreakdown.filter((s) => s.count > 0);
  const prefectureTop15 = aggregates.prefectureRanking.slice(0, 15);

  const fullDbYearTrend = aggregates.fullDbYearTrend.map((y) => ({
    year: String(y.year),
    count: y.count,
  }));
  const fullDbIndustryTop10 = aggregates.fullDbIndustryRanking.slice(0, 10);

  const yoy = aggregates.yoyComparison;

  // 柱C-7: 会議資料への持ち出し（CSV/要点コピー）。集計値そのままを文字列化。
  const exportCsv = useMemo(() => analyticsToCsv(aggregates), [aggregates]);
  const exportText = useMemo(() => analyticsToSummaryText(aggregates), [aggregates]);

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
              ← 事故データベースへ戻る
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              Analytics
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            事故統計ダッシュボード
          </h1>
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
                収録 労働災害
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums text-slate-900 sm:text-5xl">
                  {formatNumber(
                    aggregates.meta.curatedCases + aggregates.meta.mhlwDeathsCount,
                  )}
                </span>
                <span className="text-lg font-bold text-slate-700">件</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {aggregates.meta.yearsCovered.from}〜{aggregates.meta.yearsCovered.to}年・厚労省統合データセット
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800">
                厚労省死亡災害DB {formatNumber(aggregates.meta.mhlwDeathsCount)}件
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                curated詳細 {formatNumber(aggregates.meta.curatedCases)}件
              </span>
            </div>
          </div>
          {/* 柱0バッチ7/9: 長い説明文は折りたたみへ（下のKPI・軸Gがファーストビューの主役）。内容は不変。 */}
          <CollapsibleDetail summary="このダッシュボードのデータ源について">
            curated 詳細事例＋厚労省 死亡災害DB（{formatNumber(aggregates.meta.mhlwDeathsCount)} 件 / 2019〜2024）を統合し、時系列・業種・事故種類・地域・規模・原因など多軸で集計したダッシュボードです。
            厚労省「職場のあんぜんサイト」全件DB（{formatNumber(aggregates.meta.mhlwFullDbCount)} 件 / 2006〜2021）の集計データも参照軸として併載しています。
          </CollapsibleDetail>
          {/* 柱C-7: 集計の出力手段。月例安全会議の資料へCSV/要点コピー/共有/印刷で持ち出せる。 */}
          <DataExportToolbar
            filename={ANALYTICS_CSV_FILENAME}
            csv={exportCsv}
            text={exportText}
            shareTitle="事故統計ダッシュボード"
          />
        </header>

        {/* ===== 軸G: まず、自業種の要点（67枚のグラフに入る前の段階表示） ===== */}
        <section className="rounded-xl border-2 border-emerald-300 bg-emerald-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-emerald-900 sm:text-base">
              📊 まず、あなたの業種の要点を見る
            </h2>
            <span className="text-[11px] text-emerald-700">3秒で「自業種で多い事故」が分かります</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-900/70 sm:text-xs">
            下には時系列・業種・事故種類など多軸の詳細グラフが続きます。まずは業種を選んで、要点だけ先に確認してください。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="quick-industry" className="text-xs font-semibold text-emerald-900">
              あなたの業種
            </label>
            <select
              id="quick-industry"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="min-h-[44px] rounded-md border border-emerald-400 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">― 選んでください ―</option>
              {industryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {insight ? (
            <div className="mt-3 space-y-2.5">
              <div className="rounded-lg border border-emerald-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-slate-500">
                  {insight.industry}で多い事故の型
                  {insight.rank ? `（事故件数 全${insight.industryCount}業種中 第${insight.rank}位・${formatNumber(insight.industryTotal)}件）` : ""}
                </p>
                {insight.topTypes.length > 0 ? (
                  <ol className="mt-1.5 flex flex-wrap gap-1.5">
                    {insight.topTypes.map((t, i) => (
                      <li
                        key={t.name}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          i === 0
                            ? "bg-rose-600 text-white"
                            : "border border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                      >
                        <span className="tabular-nums opacity-80">{i + 1}.</span>
                        {t.name}
                        <span className="tabular-nums opacity-80">{formatNumber(t.count)}件</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">この業種の詳細事例データは現在ありません。</p>
                )}
              </div>

              {insight.deathRate ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                  <span className="font-semibold text-slate-500">{insight.industry}の死亡率</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ${
                      insight.fatalComparison === "above"
                        ? "bg-rose-100 text-rose-800"
                        : insight.fatalComparison === "below"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {insight.deathRate.rate}%
                  </span>
                  <span className="text-slate-500">
                    （全体 {insight.overallFatalRatePercent}%
                    {insight.fatalComparison === "above"
                      ? "より高い＝重篤化しやすい"
                      : insight.fatalComparison === "below"
                        ? "より低い"
                        : "と同程度"}）
                  </span>
                </div>
              ) : null}

              {insight.topTypes.length > 0 ? (
                <p className="rounded-lg bg-emerald-100/60 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-900">
                  💡 {insight.industry}でまず備えるべきは「{insight.topTypes[0].name}」。
                  KY・打合せ書ではこの型を最初の危険ポイントに。
                  <Link href={`/accidents?industry=${encodeURIComponent(insight.industry)}`} className="ml-1 underline hover:text-emerald-700">
                    {insight.industry}の事故事例を見る →
                  </Link>
                </p>
              ) : null}

              <a href="#detail-charts" className="inline-block text-xs font-bold text-emerald-700 hover:underline">
                ↓ さらに時系列・季節性・原因など多軸の詳しい分析を見る
              </a>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-emerald-300 bg-white/60 p-3 text-xs text-slate-600">
              業種を選ぶと、その業種で<span className="font-semibold">多い事故の型・死亡率・順位</span>がすぐ表示されます。
              {aggregates.kpi.riskiestTypes.length > 0 && (
                <span className="mt-1 block text-[11px] text-slate-500">
                  （全体で最も多い事故の型: {aggregates.kpi.riskiestTypes.slice(0, 3).map((t) => t.name).join("・")}）
                </span>
              )}
            </div>
          )}
        </section>

        {/* ===== Filter bar ===== */}
        <section id="detail-charts" className="scroll-mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
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
                onChange={(e) => setIndustryFilter(e.target.value)}
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
                onChange={(e) => setTypeFilter(e.target.value)}
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
            {(industryFilter || typeFilter) && (
              <button
                type="button"
                onClick={() => {
                  setIndustryFilter("");
                  setTypeFilter("");
                }}
                className="min-h-[44px] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                絞り込みをクリア
              </button>
            )}
            <p className="ml-auto text-[10px] text-slate-500 sm:text-[11px]">
              ※ フィルタは「業種別」「事故種類別」ランキングの強調表示に作用します。
            </p>
          </div>
        </section>

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
              note="統合データセット最新年"
              tone="rose"
            />
            <KpiCard
              label="直近12ヶ月"
              value={`${formatNumber(aggregates.kpi.trailing12mCount)} 件`}
              note="月次推移から累計"
              tone="amber"
            />
            <KpiCard
              label="死亡災害比率"
              value={`${aggregates.kpi.fatalRatePercent}%`}
              note="全事例に占める死亡災害"
              tone="rose"
            />
            <KpiCard
              label="収録総件数"
              value={`${formatNumber(aggregates.meta.curatedCases + aggregates.meta.mhlwDeathsCount)} 件`}
              note={`curated ${formatNumber(aggregates.meta.curatedCases)} ＋ 厚労省 ${formatNumber(aggregates.meta.mhlwDeathsCount)}`}
              tone="emerald"
            />
          </CardGrid>
          <CardGrid cols={2} gap="md" className="mt-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 sm:text-xs">
                危険業種 TOP3
              </div>
              <ol className="mt-2 space-y-1.5">
                {aggregates.kpi.riskiestIndustries.map((ind, idx) => (
                  <li key={ind.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900">{ind.name}</span>
                    </span>
                    <span className="tabular-nums text-slate-600">{formatNumber(ind.count)} 件</span>
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
                  <li key={ty.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900">{ty.name}</span>
                    </span>
                    <span className="tabular-nums text-slate-600">{formatNumber(ty.count)} 件</span>
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
              description={`${aggregates.meta.yearsCovered.from}〜${aggregates.meta.yearsCovered.to}年・統合データセット`}
            >
              <LineChart data={yearTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartCard>

            <ChartCard
              title="月別 事故件数推移（直近5年）"
              description="月次の細かい変動を把握"
            >
              <LineChart data={monthTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={"preserveStartEnd"} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Line type="monotone" dataKey="count" stroke="#0891b2" strokeWidth={1.5} dot={false} />
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
              <BarChart data={industryRankTop12} layout="vertical" margin={{ left: 24 }}>
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
              title="業種別 死亡率（全事例比）"
              description="統合データセット内での死亡災害比率"
              height={360}
            >
              <BarChart data={industryDeathRate} layout="vertical" margin={{ left: 24 }}>
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
                    if (name === "rate") return [`${Number(value)}%`, "死亡率"];
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
              <BarChart data={typeRankTop10} layout="vertical" margin={{ left: 24 }}>
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
              <BarChart data={prefectureTop15} layout="vertical" margin={{ left: 24 }}>
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
              <BarChart data={workplaceSize} layout="vertical" margin={{ left: 24 }}>
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
          description="年度比較・長期トレンド・参照軸との比較。"
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
              description={`2006〜2021・504,415件の全件統計`}
            >
              <LineChart data={fullDbYearTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatNumber(Number(v))} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartCard>

            <ChartCard
              title="厚労省 全件DB 業種別 TOP10（参照軸）"
              description="長期スパンでの業種ランキング"
              height={320}
            >
              <BarChart data={fullDbIndustryTop10} layout="vertical" margin={{ left: 24 }}>
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
          <p className="font-semibold text-slate-800">📊 データソースと制限</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              <strong>統合データセット</strong>（curated {formatNumber(aggregates.meta.curatedCases)} 件 ＋ 厚労省死亡災害DB {formatNumber(aggregates.meta.mhlwDeathsCount)} 件 / 2019〜2024）を主軸に集計。
            </li>
            <li>
              <strong>都道府県・年齢</strong>は厚労省 2024年データ（739件）のみで取得可能なため、その範囲での集計です。
            </li>
            <li>
              <strong>曜日</strong>は curated 事例（日付詳細あり）からの集計のため、サンプル数が限定的です。
            </li>
            <li>
              <strong>参照軸（⑥）</strong>は厚労省全件DB（{formatNumber(aggregates.meta.mhlwFullDbCount)} 件・2006〜2021）の事前集計値を表示しています。
            </li>
            <li>
              数値は<Link href="/accidents" className="underline">/accidents</Link>と<Link href="/stats" className="underline">/stats</Link>で表示される件数と整合しています。
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
                    entry.name && entry.count ? `${entry.name}: ${entry.count}` : ""
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
  const max = matrix.matrix.reduce(
    (m, row) => Math.max(m, ...row),
    0,
  );
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
    <div className="mt-3 overflow-x-auto">
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
                    style={{ backgroundColor: intensity(v), color: v / max > 0.55 ? "#fff" : "#0f172a" }}
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
