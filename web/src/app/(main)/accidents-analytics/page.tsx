import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { AnalyticsPageView } from "./analytics-page-view";
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

export default async function AccidentsAnalyticsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <AnalyticsPageView initialQuery={await searchParams}/>;
}
