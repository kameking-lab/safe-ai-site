import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema, datasetSchema } from "@/components/json-ld";

const _title = "利用統計（公開ダッシュボード）";
const _desc =
  "安全AIポータル（労働安全 × AI 研究プロジェクト）の利用状況を 8 セクションで透明公開。DAU/MAU・機能別 PV・流入元・導線・コンバージョン・AIチャット・改善インサイト。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/stats" },
  robots: { index: true, follow: true },
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
          datasetSchema({
            name: "安全AIポータル サイト利用統計データセット",
            description: _desc,
            url,
            keywords: ["DAU", "MAU", "PV", "利用統計", "AIチャット", "労働安全"],
            variableMeasured: ["DAU/MAU", "機能別ページビュー", "流入元", "コンバージョン率", "AIチャット利用数"],
          }),
        ]}
      />
      <StatsDashboard />
    </>
  );
}
