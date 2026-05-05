import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";
import { PageJsonLd } from "@/components/page-json-ld";

const _title = "利用統計（公開ダッシュボード）｜ANZEN AI";
const _desc =
  "ANZEN AI（労働安全 × AI 研究プロジェクト）の利用状況を 8 セクションで透明公開。DAU/MAU・機能別 PV・流入元・導線・コンバージョン・AIチャット・改善インサイト。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/stats" },
  robots: { index: true, follow: true },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: _title,
    description: _desc,
  },
};

export default function StatsPage() {
  return (
    <>
      <PageJsonLd
        name="ANZEN AI 利用統計ダッシュボード"
        description="個人運営の労働安全研究プロジェクトの利用状況を透明公開（DAU/MAU・機能別利用・流入元・コンバージョン・AIチャット利用・改善インサイト）。"
        path="/stats"
      />
      <StatsDashboard />
    </>
  );
}
