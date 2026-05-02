import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "利用統計｜ANZEN AI 研究プロジェクト",
  description:
    "ANZEN AI（労働安全 × AI/DX 研究プロジェクト）の利用統計とコンテンツ規模。UU推移・AI利用・フィードバック件数を公開しています。",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "利用統計｜ANZEN AI",
    description: "労働安全研究プロジェクトの透明性のため、利用統計とコンテンツ規模を公開しています。",
  },
};

export default function StatsPage() {
  return (
    <>
      <PageJsonLd name="労働災害統計ダッシュボード" description="厚労省公表の労働災害統計を業種別・年次別に可視化。死亡災害・休業4日以上の傷病を集計。" path="/stats" />
      <StatsDashboard />
    </>
  );
}
