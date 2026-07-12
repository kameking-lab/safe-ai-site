import type { Metadata } from "next";
import { Suspense } from "react";
import { ELearningPanel } from "@/components/elearning-panel";
import { ElearningConclusionCard } from "@/components/elearning-conclusion-card";
import { ElearningProgressBoard } from "@/components/elearning-progress-board";
import { ElearningReceiptExport } from "@/components/elearning-receipt-print";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { LocalStorageWarningBanner } from "@/components/local-storage-warning-banner";
import { RelatedPageCards } from "@/components/related-page-cards";
import { PageContainer } from "@/components/layout";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, courseListSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { elearningThemesCatalog } from "@/data/mock/elearning-themes-data";

const _title = "安全衛生 Eラーニング 教育コンテンツ";
const _desc =
  "高所作業・化学物質・電気安全など労働安全衛生のテーマ別学習コンテンツ。安全衛生管理者・安全担当者の知識定着に活用できます。";

export const metadata: Metadata = {
  alternates: { canonical: "/e-learning" },
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
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
      <PageJsonLd name={_title} description={_desc} path="/e-learning" />
      <JsonLd schema={courseSchema} />
      {/* P0-012 (usability-audit-day3): HomeScreen 経由を廃止し、ファースト
          ビューを直接「コース一覧」に。ペルソナA (建設業職長) が「クイズを
          すぐ始めたい」用途で 5-6 スクロール → 1 スクロール以内に短縮。
          P0-014 (受講者進捗保存) と組み合わせて学習継続性を担保する。 */}
      <PageContainer width="wide" paddingY="default">
        <TranslatedPageHeader
          titleJa="Eラーニング"
          titleEn="E-Learning"
          descriptionJa="労働安全に関するテーマ別学習コンテンツとクイズ"
          descriptionEn="Topic-based safety training content and quizzes"
          iconName="GraduationCap"
          iconColor="emerald"
        />
        {/* 柱0: 最上部は「いまの状態」1メッセージ（入門から開始/学習のこりN/全問正答） */}
        <ElearningConclusionCard />
        <LocalStorageWarningBanner />
        {/* P0-014: 受講者進捗ボード (履歴ゼロ時は非表示) */}
        <ElearningProgressBoard />
        {/* NIQ-REC2: 社内記録用の受講記録 A4出力（履歴ゼロ時は非表示・修了証ではない） */}
        <ElearningReceiptExport />
        <Suspense fallback={<PageSkeleton label="コース一覧を読み込み中" />}>
          <ELearningPanel />
        </Suspense>
      </PageContainer>
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
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
