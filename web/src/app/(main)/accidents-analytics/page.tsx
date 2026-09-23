import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Siren,
  Sparkles,
  Tag,
} from "lucide-react";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import {
  buildTypeComposition,
  getAnalyticsAggregates,
} from "@/lib/accidents-analytics";
import type { AnalyticsFilters } from "@/lib/accidents-analytics";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { OFFICIAL_ACCIDENT_SNAPSHOT as official } from "@/data/accidents/official-current";
import { OfficialAccidentFlash } from "@/components/accidents/official-accident-flash";

const title = "事故分析ダッシュボード";
const description =
  "厚労省死亡災害DBを、年・月・業種・事故種類・地域・規模・原因など12種類の条件で絞り込む事故分析ダッシュボード。公式統計と収録事例の傾向を区別して表示します。";

export const metadata: Metadata = {
  alternates: { canonical: "/accidents-analytics" },
  title,
  description,
  openGraph: withSiteOpenGraph("/accidents-analytics", {
    title,
    description,
    images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(title, description)],
  }),
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AccidentsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = firstParam(params.view) === "flash" ? "flash" : "cases";
  const baseline = getAnalyticsAggregates();
  const requestedSource = firstParam(params.source);
  const source = baseline.meta.filterOptions.sources.includes(
    requestedSource as (typeof baseline.meta.filterOptions.sources)[number],
  )
    ? (requestedSource as (typeof baseline.meta.filterOptions.sources)[number])
    : "official";
  const sourceBaseline =
    source === "official" ? baseline : getAnalyticsAggregates({ source });
  const requestedIndustry = firstParam(params.industry);
  const requestedType = firstParam(params.type);
  const requestedYear = Number.parseInt(firstParam(params.year), 10);
  const requestedMonth = Number.parseInt(firstParam(params.month), 10);
  const options = sourceBaseline.meta.filterOptions;
  const filters: AnalyticsFilters = {
    industry: options.industries.includes(requestedIndustry)
      ? requestedIndustry
      : undefined,
    type: options.types.includes(requestedType) ? requestedType : undefined,
    year: options.years.includes(requestedYear) ? requestedYear : undefined,
    month: options.months.includes(requestedMonth) ? requestedMonth : undefined,
    industryMedium: options.industryMediums.includes(
      firstParam(params.industryMedium),
    )
      ? firstParam(params.industryMedium)
      : undefined,
    cause: options.causes.includes(firstParam(params.cause))
      ? firstParam(params.cause)
      : undefined,
    workplaceSize: options.workplaceSizes.includes(
      firstParam(params.workplaceSize),
    )
      ? firstParam(params.workplaceSize)
      : undefined,
    occurrenceTime: options.occurrenceTimes.includes(
      firstParam(params.occurrenceTime),
    )
      ? firstParam(params.occurrenceTime)
      : undefined,
    prefecture: options.prefectures.includes(firstParam(params.prefecture))
      ? firstParam(params.prefecture)
      : undefined,
    age: options.ages.includes(firstParam(params.age))
      ? firstParam(params.age)
      : undefined,
    severity: options.severities.includes(
      firstParam(params.severity) as (typeof options.severities)[number],
    )
      ? (firstParam(params.severity) as (typeof options.severities)[number])
      : undefined,
    source,
  };
  const aggregates = getAnalyticsAggregates(filters);
  const compositionBaseline = filters.type
    ? getAnalyticsAggregates({ ...filters, type: undefined })
    : aggregates;
  const typeComposition = buildTypeComposition(
    aggregates,
    compositionBaseline,
    filters.type,
  );

  // JSON-LD: Dataset describing the analytics dataset.
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "労働災害 統合事故統計データセット",
    description,
    url: "https://www.anzen-ai-portal.jp/accidents-analytics",
    license: "https://creativecommons.org/licenses/by/4.0/",
    keywords: [
      "労働災害",
      "事故統計",
      "死亡災害",
      "業種別",
      "事故種類",
      "厚生労働省",
      "労働安全",
    ],
    creator: {
      "@type": "Organization",
      name: "安全AIポータル",
    },
    temporalCoverage: `${aggregates.meta.yearsCovered.from}/${aggregates.meta.yearsCovered.to}`,
    variableMeasured: [
      "年別事故件数",
      "月別事故件数",
      "業種別事故件数",
      "事故種類別件数",
      "都道府県別件数",
      "事業所規模別件数",
      "起因物別件数",
      "時間帯別件数",
      "年齢別件数",
      "重傷度内訳",
    ],
    isBasedOn: [
      {
        "@type": "Dataset",
        name: "厚生労働省 職場のあんぜんサイト 死亡災害DB",
        url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html",
      },
      {
        "@type": "Dataset",
        name: "厚生労働省 労働者死傷病報告オープンデータ",
        url: "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
      },
    ],
  };

  return (
    <>
      <JsonLd schema={datasetSchema} />
      <section
        className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
        aria-labelledby="analytics-current-title"
      >
        <p className="text-[11px] font-black tracking-[.14em] text-rose-700">厚生労働省データを図で確認</p>
        <h1 id="analytics-current-title" className="mt-0.5 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">事故分析ダッシュボード</h1>
        <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm">
          最新の全国傾向と収録済み死亡災害個票を分け、業種・事故型・時間帯などから絞り込んで読めます。上段は厚労省の{official.label}です。
        </p>
        <nav aria-label="表示する事故データ" className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
          <Link
            href="/accidents-analytics"
            aria-current={view === "cases" ? "page" : undefined}
            className={`min-h-[44px] rounded-lg border px-3 py-2 text-center text-sm font-black ${
              view === "cases"
                ? "border-rose-700 bg-rose-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            収録事例
          </Link>
          <Link
            href="/accidents-analytics?view=flash"
            aria-current={view === "flash" ? "page" : undefined}
            className={`min-h-[44px] rounded-lg border px-3 py-2 text-center text-sm font-black ${
              view === "flash"
                ? "border-rose-700 bg-rose-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            全国速報
          </Link>
        </nav>
        <aside
          data-analytics-scope-caution
          aria-label="集計期間と母数の注意"
          className="mt-2 max-w-4xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100 sm:text-xs"
        >
          {view === "cases" ? (
            <p>
              <strong>{sourceBaseline.meta.yearsCovered.from}〜{sourceBaseline.meta.yearsCovered.to}年・収録個票{sourceBaseline.meta.filteredCases.toLocaleString("ja-JP")}件</strong>を基準に、現在{aggregates.meta.filteredCases.toLocaleString("ja-JP")}件を表示。割合の母数は分析項目の値が確認できる件数で、欠損値を除きます。発生率やリスクの高さを示すものではありません。
            </p>
          ) : (
            <p>
              <strong>全国速報は発生対象 {official.occurredThrough} まで・報告締切 {official.reportAsOf}</strong>の集計です。収録事例の2019〜2024年系列には接続していません。
            </p>
          )}
        </aside>
      </section>
      {view === "flash" ? (
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-3 sm:px-6 lg:px-8">
          <OfficialAccidentFlash />
        </section>
      ) : (
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
              <div className="h-52 animate-pulse rounded-lg bg-slate-100" />
            </div>
          }
        >
          <AnalyticsDashboard
            aggregates={aggregates}
            typeComposition={typeComposition}
          />
        </Suspense>
      )}
      <nav
        aria-label="関連ページ"
        className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <p className="text-sm font-semibold text-slate-900">関連ページ</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            <li>
              <Link
                href="/accidents"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                <Siren className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                事故事例検索（補助）
              </Link>
            </li>
            <li>
              <Link
                href="/accidents-reports"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                業種別レポート
              </Link>
            </li>
            <li>
              <Link
                href="/stats"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                <BarChart3
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                サイト利用統計
              </Link>
            </li>
            <li>
              <Link
                href="/risk-prediction"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                AIリスク予測
              </Link>
            </li>
            <li>
              <Link
                href="/ky"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                <ClipboardList
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                KY用紙
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
