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
import { getAnalyticsAggregates } from "@/lib/accidents-analytics";
import type { AnalyticsFilters } from "@/lib/accidents-analytics";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { AccidentHubNav } from "@/components/accident-hub-nav";
import { OFFICIAL_ACCIDENT_SNAPSHOT as official } from "@/data/accidents/official-current";
import { OfficialAccidentFlash } from "@/components/accidents/official-accident-flash";
import { FeatureMascotCompanion } from "@/components/feature-mascot-companion";

const title = "事故統計ダッシュボード";
const description =
  "厚労省死亡災害DBと収録事例を、年・月・業種・事故種類・地域・規模・原因など25種類の軸で分析するダッシュボード。全国公式統計と収録事例の傾向を区別して表示します。";

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
  const requestedIndustry = firstParam(params.industry);
  const requestedType = firstParam(params.type);
  const requestedYear = Number.parseInt(firstParam(params.year), 10);
  const options = baseline.meta.filterOptions;
  const filters: AnalyticsFilters = {
    industry: options.industries.includes(requestedIndustry)
      ? requestedIndustry
      : undefined,
    type: options.types.includes(requestedType) ? requestedType : undefined,
    year: options.years.includes(requestedYear) ? requestedYear : undefined,
  };
  const aggregates =
    filters.industry || filters.type || filters.year
      ? getAnalyticsAggregates(filters)
      : baseline;

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
        <p className="text-xs font-black tracking-[.16em] text-rose-700">最新速報の傾向</p>
        <h1 id="analytics-current-title" className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">最新の全国傾向と、蓄積事例を分けて読む</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          上段は厚労省の{official.label}、下段は収録済み死亡災害個票・編集済み事例の多軸分析です。分母と対象期間が異なるため、件数を直接比較しません。
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
                事故データベース
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
