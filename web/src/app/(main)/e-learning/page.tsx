import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";
import { RelatedPageCards } from "@/components/related-page-cards";

export const metadata: Metadata = {
  title: "Eラーニング",
  description: "労働安全に関するテーマ別学習コンテンツとクイズで知識を確認。",
  openGraph: {
    title: "Eラーニング｜ANZEN AI",
    description: "労働安全に関するテーマ別学習コンテンツとクイズで知識を確認。",
  },
};

export default function ELearningPage() {
  return (
    <>
      <HomeScreen variant="elearning">
        <PageHeader
          title="Eラーニング"
          description="労働安全に関するテーマ別学習コンテンツとクイズ"
          icon={GraduationCap}
          iconColor="emerald"
        />
      </HomeScreen>
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/exam-quiz",
            label: "過去問クイズ",
            description: "学んだ知識を実際の試験問題で確認。安全コンサルタント・衛生管理者等の過去問に挑戦できます。",
            color: "amber",
            cta: "過去問に挑戦する",
          },
          {
            href: "/accidents",
            label: "事故データベース",
            description: "学習内容と関連する実際の事故事例を検索。リアルな現場のリスクを確認できます。",
            color: "orange",
            cta: "実際の事故事例を見る",
          },
        ]}
      />
    </>
  );
}
