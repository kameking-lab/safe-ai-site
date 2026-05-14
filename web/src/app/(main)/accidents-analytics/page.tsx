import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { getAnalyticsAggregates } from "@/lib/accidents-analytics";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { SITE_STATS } from "@/data/site-stats";

const title = "事故統計ダッシュボード";
const description = `労働災害 ${SITE_STATS.accidents10yCount} 件を年・月・業種・事故種類・地域・規模・原因など多軸で集計したダッシュボード。厚労省死亡災害DB（${SITE_STATS.mhlwDeathsCount} 件）と curated 事例を統合し、25 種類の分析軸で可視化。`;

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

export default function AccidentsAnalyticsPage() {
  const aggregates = getAnalyticsAggregates();

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
      <AnalyticsDashboard aggregates={aggregates} />
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
                🚨 事故データベース
              </Link>
            </li>
            <li>
              <Link
                href="/stats"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                📊 サイト利用統計
              </Link>
            </li>
            <li>
              <Link
                href="/risk-prediction"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                🤖 AIリスク予測
              </Link>
            </li>
            <li>
              <Link
                href="/ky"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                📝 KY用紙
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
