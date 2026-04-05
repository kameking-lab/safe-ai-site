import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExamQuizClient } from "./exam-quiz-client";

export const metadata: Metadata = {
  title: "過去問クイズ｜ANZEN AI",
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
    </>
  );
}
