import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExamQuizClient } from "./exam-quiz-client";
import { RelatedPageCards } from "@/components/related-page-cards";

export const metadata: Metadata = {
  title: "過去問クイズ",
  description: "労働安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格対応の過去問クイズ。科目・年度別に本番形式で挑戦できます。",
  openGraph: {
    title: "過去問クイズ｜ANZEN AI",
    description: "労働安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格対応の過去問クイズ。科目・年度別に本番形式で挑戦できます。",
  },
};

export default function ExamQuizPage() {
  return (
    <>
      <PageHeader
        title="過去問クイズ（全資格対応）"
        description="安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格の過去問で実力を確認"
        icon={BookOpen}
        iconColor="amber"
      />
      <ExamQuizClient />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/e-learning",
            label: "Eラーニング",
            description: "テーマ別の解説付きクイズで知識を体系的に整理。過去問の前に基礎固めするのにも最適です。",
            color: "emerald",
            cta: "Eラーニングで学ぶ",
          },
          {
            href: "/law-search",
            label: "法令検索",
            description: "問題で出てきた条文を原文で確認。労安法・安衛則などをキーワード検索できます。",
            color: "sky",
            cta: "法令を検索する",
          },
        ]}
      />
    </>
  );
}
