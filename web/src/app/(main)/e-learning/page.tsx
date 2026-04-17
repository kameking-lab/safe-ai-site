import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, courseListSchema } from "@/components/json-ld";
import { elearningThemesCatalog } from "@/data/mock/elearning-themes-data";

const _title = "安全衛生 Eラーニング 教育コンテンツ";
const _desc =
  "高所作業・化学物質・電気安全など労働安全衛生のテーマ別学習コンテンツ。安全衛生管理者・安全担当者の知識定着に活用できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function ELearningPage() {
  const courseSchema = courseListSchema(
    elearningThemesCatalog.map((t) => ({
      name: t.title,
      description: t.description,
    }))
  );

  return (
    <>
      <JsonLd schema={courseSchema} />
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
