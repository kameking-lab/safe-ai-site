import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CERT_QUIZZES, getCertQuiz } from "@/data/mock/quiz/cert-quiz";
import { CertQuizResult } from "./cert-quiz-result";

export const metadata: Metadata = {
  title: "クイズ結果",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return CERT_QUIZZES.map((c) => ({ slug: c.id }));
}

export default async function CertQuizResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cert = getCertQuiz(slug);
  if (!cert) notFound();

  return (
    <CertQuizResult
      slug={cert.id}
      certName={cert.name}
      totalQuestions={cert.questions.length}
      certColor={cert.color}
    />
  );
}
