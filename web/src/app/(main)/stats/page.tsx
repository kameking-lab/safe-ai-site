import type { Metadata } from "next";
import { StatsDashboard } from "./StatsDashboard";

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
  return <StatsDashboard />;
}
