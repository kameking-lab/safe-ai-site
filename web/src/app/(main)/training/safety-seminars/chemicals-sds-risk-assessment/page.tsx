import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd } from "@/components/json-ld";
import { SafetySeminarPlayer } from "@/components/training/safety-seminar-player";
import { SeminarQuiz } from "@/components/training/seminar-quiz";
import trainingJson from "@/data/safety-seminars/chemicals-sds-risk-assessment.json";
import claimsJson from "@/data/safety-seminars/chemical-claims.json";
import quizJson from "@/data/safety-seminars/chemicals-sds-risk-assessment-quiz.json";
import sourcesJson from "@/data/safety-seminars/chemical-source-registry.json";
import type { TrainingClaim, TrainingCourse, TrainingQuiz, TrainingSource } from "@/data/safety-seminars/types";
import { SITE_URL, withSiteAlternates, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const PATH = "/training/safety-seminars/chemicals-sds-risk-assessment";
const TITLE = "化学物質・SDS・リスクアセスメント入門｜無料安全研修";
const DESCRIPTION = "洗浄剤の作業変更を例に、SDS、作業条件、リスクアセスメント、対策、記録・周知を12枚で学ぶ無料研修。";
const training = trainingJson as TrainingCourse;
const claims = claimsJson as TrainingClaim[];
const quiz = quizJson as TrainingQuiz;
const sources = sourcesJson as TrainingSource[];

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const query = await searchParams;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: withSiteAlternates(PATH),
    robots: Object.keys(query).length > 0 ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(PATH, { title: TITLE, description: DESCRIPTION }),
    twitter: withSiteTwitter(),
  };
}

export default function ChemicalsSdsRiskAssessmentPage() {
  return (
    <PageContainer width="full" className="pb-20">
      <JsonLd schema={[{
        "@context": "https://schema.org", "@type": "LearningResource", name: training.title,
        description: training.subtitle, url: `${SITE_URL}${PATH}`, inLanguage: "ja",
        learningResourceType: "社内安全研修", timeRequired: "PT20M", isAccessibleForFree: true,
      }]} />
      <Link href="/training/safety-seminars" className="inline-flex min-h-11 items-center gap-2 font-bold text-teal-800 underline underline-offset-4 dark:text-teal-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />安全研修ライブラリへ戻る
      </Link>
      <header className="mt-5 max-w-5xl">
        <p className="text-sm font-black text-teal-800 dark:text-teal-300">無料・12枚・確認クイズ5問</p>
        <h1 className="mt-2 text-4xl font-black leading-tight text-slate-950 sm:text-5xl dark:text-white">{training.title}</h1>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-700 dark:text-slate-200">{training.subtitle}</p>
        <div className="mt-5 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>この教材の範囲：</strong> {training.boundary}</div>
      </header>
      <section aria-label="化学物質・SDS・リスクアセスメント研修" className="mt-8">
        <SafetySeminarPlayer slides={training.slides} claims={claims} sources={sources} audioEnabled={false} playerLabel="化学物質・SDS・リスクアセスメントの安全研修スライド" />
      </section>
      <noscript>
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">JavaScriptを使わずに読む</h2>
          <ol className="mt-4 space-y-5">{training.slides.map((slide) => <li key={slide.id}><h3 className="font-black">{slide.number}. {slide.title}</h3><p className="mt-1">{slide.message}</p><p className="mt-2 text-sm leading-6">{slide.narration}</p></li>)}</ol>
        </section>
      </noscript>
      <section aria-labelledby="quiz-title" className="mt-12">
        <h2 id="quiz-title" className="text-3xl font-black text-slate-950 dark:text-white">5問の確認クイズ</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">回答後に全選択肢の理由と公的根拠を確認できます。誤答した問題だけ再挑戦できます。</p>
        <SeminarQuiz courseId={training.id} quiz={quiz} sources={sources} />
      </section>
      <section aria-labelledby="outline-title" className="mt-12">
        <h2 id="outline-title" className="text-3xl font-black text-slate-950 dark:text-white">12枚を戻って復習</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{training.slides.map((slide) => <details key={slide.id} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><summary className="min-h-11 cursor-pointer py-2 font-black text-slate-950 dark:text-white">{slide.number}. {slide.title}</summary><p className="mt-2 leading-7 text-slate-700 dark:text-slate-200">{slide.message}</p><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{slide.narration}</p></details>)}</div>
      </section>
      <section aria-labelledby="sources-title" className="mt-12">
        <h2 id="sources-title" className="text-3xl font-black text-slate-950 dark:text-white">公的根拠</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">e-Govの現行法令と厚生労働省の一次資料だけを掲載し、義務、努力義務、行政指針を区別しています。</p>
        <ol className="mt-5 space-y-3">{sources.map((source) => <li key={source.sourceId} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-black text-teal-800 underline underline-offset-4 dark:text-teal-300">{source.title}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{source.publisher} / {source.locator}</p></li>)}</ol>
      </section>
    </PageContainer>
  );
}
