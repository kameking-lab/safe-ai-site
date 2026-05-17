// /quiz re-exports the /exam-quiz page so cold external loads no longer
// pay the 308-redirect tax (~316 ms measured in Lighthouse 2026-05-14 B-10).
// Canonical points at /exam-quiz to preserve SEO consolidation.
import type { Metadata } from "next";
import ExamQuizPage from "../exam-quiz/page";

const _title = "安全衛生 資格試験 演習問題クイズ";
const _desc =
  "労働安全コンサルタント・衛生管理者・ボイラー技士など全資格の演習問題クイズ。科目・年度別に本番形式で挑戦できます。";

export const metadata: Metadata = {
  alternates: { canonical: "/exam-quiz" },
  title: _title,
  description: _desc,
  robots: { index: false, follow: true },
};

export default ExamQuizPage;
