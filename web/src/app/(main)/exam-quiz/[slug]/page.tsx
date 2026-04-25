import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CERT_QUIZZES, getCertQuiz } from "@/data/mock/quiz/cert-quiz";
import { ogImageUrl } from "@/lib/og-url";
import { CertQuizPlayer } from "./cert-quiz-player";

export function generateStaticParams() {
  return CERT_QUIZZES.map((c) => ({ slug: c.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const cert = getCertQuiz(slug);
  if (!cert) return { title: "クイズが見つかりません" };
  const title = `${cert.name} 100問クイズ`;
  const desc = `${cert.name}の対策に。4択100問・解説付き・法令根拠つきカリキュラム網羅型クイズ。${cert.topics.join("・")}を分野別に学習できます。`;
  return {
    title,
    description: desc,
    openGraph: {
      title: `${title}｜ANZEN AI`,
      description: desc,
      images: [{ url: ogImageUrl(title, desc), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl(title, desc)],
    },
  };
}

export default async function CertQuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cert = getCertQuiz(slug);
  if (!cert) notFound();

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/exam-quiz"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-3 w-3" /> 試験一覧に戻る
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
                {cert.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {cert.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cert.topics.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <span className={`rounded-lg bg-gradient-to-r ${cert.color} px-3 py-1.5 text-xs font-bold text-white shadow-sm`}>
              全 {cert.questions.length} 問
            </span>
          </div>
        </div>
      </header>

      <CertQuizPlayer
        slug={cert.id}
        certName={cert.name}
        questions={cert.questions}
      />
    </>
  );
}
