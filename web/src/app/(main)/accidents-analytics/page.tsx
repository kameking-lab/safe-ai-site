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
  buildAnalyticsInsights,
  getAnalyticsAggregates,
} from "@/lib/accidents-analytics";
import type { AnalyticsFilters } from "@/lib/accidents-analytics";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { AccidentHubNav } from "@/components/accident-hub-nav";
import { OFFICIAL_ACCIDENT_SNAPSHOT as official } from "@/data/accidents/official-current";
import { OfficialAccidentFlash } from "@/components/accidents/official-accident-flash";
import { FeatureMascotCompanion } from "@/components/feature-mascot-companion";

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
  const insights = buildAnalyticsInsights(aggregates);

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
        url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx",
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
      <AccidentHubNav current="accidents-analytics" />
      <section
        className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8"
        aria-labelledby="analytics-current-title"
      >
        <p className="text-xs font-black tracking-[.16em] text-rose-700">厚生労働省データを多軸分析</p>
        <h1 id="analytics-current-title" className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">事故分析ダッシュボード</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          最新の全国傾向と収録済み死亡災害個票を分け、業種・事故型・時間帯などから絞り込んで読めます。上段は厚労省の{official.label}です。
        </p>
        <FeatureMascotCompanion
          variant="detective"
          eyebrow="傾向調査チワワ"
          title="件数の先にある、次の一手を探します。"
          message="全国速報と収録事例を混ぜず、気になる軸から掘り下げられます。"
          tone="sky"
          compact
          className="mt-4 max-w-3xl"
        />
        <OfficialAccidentFlash />
        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
          <p className="text-xs font-black tracking-[.16em] text-sky-700 dark:text-sky-300">蓄積事例の多軸分析</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">年・業種・事故型・地域・規模・原因を掘り下げる</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">ここから下は最新速報の全国総数ではなく、画面に示す収録範囲内の傾向です。</p>
        </div>
      </section>
      <section
        className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8"
        aria-labelledby="analytics-insights-title"
        data-testid="analytics-server-insights"
      >
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="analytics-insights-title" className="text-lg font-black text-slate-950">
              対象{aggregates.meta.filteredCases.toLocaleString("ja-JP")}件から見える3つの構成
            </h2>
            <p className="text-xs font-semibold text-sky-900">
              収録事例内の構成比（発生率・リスク評価ではありません）
            </p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {insights.map((item) => (
              <article key={item.label} className="rounded-lg border border-sky-100 bg-white p-3">
                <p className="text-xs font-bold text-sky-800">{item.label}</p>
                <p className="mt-1 text-base font-black text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-6">
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          </div>
        }
      >
        <AnalyticsDashboard aggregates={aggregates} />
      </Suspense>
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
