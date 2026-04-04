import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExamQuizClient } from "./exam-quiz-client";

export const metadata: Metadata = {
  title: "過去問クイズ",
  description: "労働安全コンサルタント試験の過去問を解いて実力を確認。科目・年度・出題モードを選択できます。",
};

export default function ExamQuizPage() {
  return (
    <>
      <PageHeader
        title="過去問クイズ"
        description="労働安全コンサルタント試験の過去問で実力を確認"
        icon={BookOpen}
        iconColor="amber"
      />
      <ExamQuizClient />
    </>
  );
}
