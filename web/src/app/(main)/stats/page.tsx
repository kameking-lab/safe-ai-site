import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";

const _title = "利用統計ダッシュボード（サンプル表示）";
const _desc =
  "安全AIポータルの利用統計ダッシュボード。GA4 / Search Console が接続されている期間は実数値、未接続時は構造確認用のサンプル数値を表示します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/stats" },
  // GA4 接続が安定するまで noindex。サンプル数値が検索結果に出るのを防ぐ
  // (content-quality audit 2026-05-16 C-1)
  robots: { index: false, follow: true },
  openGraph: withSiteOpenGraph("/stats", {
    title: _title,
    description: _desc,
  }),
  twitter: withSiteTwitter({
    card: "summary",
    title: _title,
    description: _desc,
  }),
};

export default function StatsPage() {
  const url = `${SITE_URL}/stats`;
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: _title, description: _desc, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "利用統計", url },
          ]),
        ]}
      />
      <StatsDashboard />
    </>
  );
}
