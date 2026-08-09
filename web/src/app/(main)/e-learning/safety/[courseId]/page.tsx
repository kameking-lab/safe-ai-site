/* eslint-disable @next/next/no-html-link-for-pages -- The back link intentionally performs a document navigation so visited public learning HTML works offline. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { SafetyQuestionPlayer } from "@/components/safety-elearning/safety-question-player";
import { OfflineLearningStatus } from "@/components/safety-elearning/offline-learning-status";
import {
  UnscoredDescriptivePractice,
  type UnscoredPracticeResource,
} from "@/components/safety-elearning/unscored-descriptive-practice";
import {
  SAFETY_COURSES,
  findSafetyCourse,
  getCourseOfficialResources,
  getCourseQuestions,
} from "@/data/safety-elearning/courses";
import { findSafetySource } from "@/data/safety-elearning/source-registry";
import { assertSafetyLearningDataset } from "@/data/safety-elearning/validation";
import { SITE_URL } from "@/lib/seo-metadata";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export function generateStaticParams() {
  return SAFETY_COURSES.filter((course) => course.published).map((course) => ({
    courseId: course.courseId,
  }));
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = findSafetyCourse(courseId);
  if (!course?.published) return {};
  const path = `/e-learning/safety/${course.courseId}`;
  return {
    title: course.title,
    description: `${course.description} 回答・学習時間・長期進捗は保存しません。`,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
  };
}

export default async function SafetyCoursePage({ params }: CoursePageProps) {
  assertSafetyLearningDataset();
  const { courseId } = await params;
  const course = findSafetyCourse(courseId);
  if (!course?.published) notFound();

  const questions = getCourseQuestions(course);
  const officialResources = getCourseOfficialResources(course);
  const path = `/e-learning/safety/${course.courseId}`;
  const url = `${SITE_URL}${path}`;
  const subjectTitles = Object.fromEntries(
    course.subjects.map((subject) => [subject.subjectId, subject.title]),
  );
  const descriptiveResources: UnscoredPracticeResource[] =
    course.unscoredDescriptiveResources.flatMap((resource) => {
      const source = findSafetySource(resource.sourceId);
      const officialQuestionUrl = source?.sourcePdfUrl ?? source?.sourceUrl;
      if (!officialQuestionUrl) return [];
      return [{
        resourceId: resource.resourceId,
        title: resource.title,
        officialQuestionUrl,
        topicChecklist: resource.topicChecklist,
        structureSteps: resource.structureSteps,
        lawLinks: resource.lawLinks,
      }];
    });

  return (
    <PageContainer width="prose">
      <JsonLd
        schema={[
          webPageSchema({ name: course.title, description: course.description, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "安全資格Eラーニング", url: `${SITE_URL}/e-learning/safety` },
            { name: course.shortTitle, url },
          ]),
        ]}
      />

      <nav aria-label="パンくず補助" className="mb-4">
        <a
          href="/e-learning/safety"
          className="inline-flex min-h-11 items-center gap-2 font-black text-sky-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          安全資格一覧へ戻る
        </a>
      </nav>

      <header>
        <p className="text-sm font-black tracking-[.12em] text-emerald-800 dark:text-emerald-300 forced-colors:text-[CanvasText]">
          独自問題・一次根拠確認済み
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {course.shortTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
          {course.description}
        </p>
        <p className="mt-3 rounded-xl border-2 border-slate-700 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-950 dark:border-slate-300 dark:bg-slate-900 dark:text-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
          {questions.length}問・1画面1問。回答と学習時間は保存・送信しません。誤答した場合は、理由を確認して正答するまで同じ問題をやり直せます。
        </p>
      </header>

      <div id="question-player" className="mt-7 scroll-mt-24">
        <OfflineLearningStatus />
        <SafetyQuestionPlayer
          courseTitle={course.shortTitle}
          questions={questions}
          subjectTitles={subjectTitles}
        />
      </div>

      <section
        aria-labelledby="official-course-resources-title"
        className="mt-10 rounded-3xl border-2 border-slate-300 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-900 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-7"
      >
        <h2 id="official-course-resources-title" className="text-2xl font-black text-slate-950 dark:text-white">
          協会の公表問題・正答
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          問題原文の転載許諾は確認できていないため、このサイトには複製せず、協会の公式ページまたはPDFへ直接リンクします。PDFには公式正答がありますが、公式解説はありません。
        </p>
        <ul className="mt-4 space-y-3">
          {officialResources.map((source) => {
            const href = source.sourcePdfUrl ?? source.sourceUrl;
            return (
              <li key={source.sourceId}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 max-w-full items-center gap-2 font-black text-sky-900 underline decoration-2 underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
                >
                  {source.examName ?? source.subject ?? "公式資料"}
                  <span className="sr-only">（新しいタブで開きます）</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <UnscoredDescriptivePractice resources={descriptiveResources} />
    </PageContainer>
  );
}
