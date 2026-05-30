import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";

const _title = "利用統計ダッシュボード";
const _desc =
  "安全AIポータルの利用統計ダッシュボード。Google Analytics 4 / Search Console を接続した期間の実数値のみを表示します（未接続時はサンプル数値を表示せず、準備中の案内のみ表示）。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/stats" },
  // 実データ蓄積前は noindex（運営用ダッシュボードのため検索結果に出さない）
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
