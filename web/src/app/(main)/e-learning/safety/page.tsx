import type { Metadata } from "next";
import { ArrowRight, BookOpenCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { SAFETY_COURSES } from "@/data/safety-elearning/courses";
import { assertSafetyLearningDataset } from "@/data/safety-elearning/validation";
import { SITE_URL } from "@/lib/seo-metadata";

const PAGE_PATH = "/e-learning/safety";
const TITLE = "安全資格Eラーニング｜一次根拠付き問題演習";
const DESCRIPTION =
  "第一種・第二種衛生管理者、労働安全・労働衛生コンサルタントの独自問題を、全選択肢の公式根拠付きで1問ずつ確認できます。回答や学習時間は保存しません。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  robots: { index: true, follow: true },
};

export default function SafetyLearningIndexPage() {
  assertSafetyLearningDataset();
  const url = `${SITE_URL}${PAGE_PATH}`;
  const publishedCourses = SAFETY_COURSES.filter((course) => course.published);
  const questionCount = publishedCourses.reduce(
    (total, course) => total + course.questionIds.length,
    0,
  );

  return (
    <PageContainer width="wide">
      <JsonLd
        schema={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "Eラーニング", url: `${SITE_URL}/e-learning` },
            { name: "安全資格", url },
          ]),
        ]}
      />

      <header className="overflow-hidden rounded-[2rem] border-2 border-slate-800 bg-slate-950 p-5 text-white shadow-xl forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-8">
        <p className="flex items-center gap-2 text-sm font-black tracking-[.12em] text-cyan-300 forced-colors:text-[CanvasText]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          OFFICIAL-EVIDENCE LEARNING
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          安全資格Eラーニング
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 forced-colors:text-[CanvasText] sm:text-base">
          協会問題の転載ではなく、現行のe-Gov法令など一次情報に基づいて作成・独立確認した独自問題です。正答だけでなく、誤答を含む全選択肢に公式根拠があります。
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
          <li className="rounded-full border border-white/40 px-3 py-2">{publishedCourses.length}コース</li>
          <li className="rounded-full border border-white/40 px-3 py-2">公開{questionCount}問</li>
          <li className="rounded-full border border-white/40 px-3 py-2">保存なし</li>
          <li className="rounded-full border border-white/40 px-3 py-2">runtime AIなし</li>
        </ul>
      </header>

      <section aria-labelledby="safety-course-list-title" className="mt-8">
        <h2 id="safety-course-list-title" className="text-2xl font-black text-slate-950 dark:text-white">
          資格を選ぶ
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {publishedCourses.map((course) => (
            <article
              key={course.courseId}
              className="flex min-w-0 flex-col rounded-3xl border-2 border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-950 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
            >
              <div className="flex items-start justify-between gap-3">
                <BookOpenCheck className="h-7 w-7 shrink-0 text-emerald-800 dark:text-emerald-300 forced-colors:text-[CanvasText]" aria-hidden="true" />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-100 forced-colors:border forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
                  {course.questionIds.length}問
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black leading-7 text-slate-950 dark:text-white">
                {course.shortTitle}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {course.description}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                {course.subjects.map((subject) => (
                  <li key={subject.subjectId} className="rounded-full border border-slate-400 px-2 py-1">
                    {subject.title}
                  </li>
                ))}
              </ul>
              <a
                href={`${PAGE_PATH}/${course.courseId}`}
                aria-label={`${course.shortTitle}の問題演習を始める`}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 motion-reduce:transition-none forced-colors:border-2 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
              >
                問題演習を始める
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border-2 border-sky-800 bg-sky-50 p-5 text-sky-950 dark:border-sky-300 dark:bg-sky-950/30 dark:text-sky-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]" aria-labelledby="safety-learning-policy-title">
        <h2 id="safety-learning-policy-title" className="text-xl font-black">原文・採点・記録の扱い</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
          <li>安全衛生技術試験協会の問題文・選択肢は掲載せず、公式PDFへリンクします。</li>
          <li>公式正答がない記述式は自動採点せず、論点メモだけを端末内の一時入力として使えます。</li>
          <li>学習時間、日次履歴、連続日数、長期進捗を保存・送信しません。</li>
          <li>法令の条文・施行時点は各問の「根拠を見る」から確認できます。</li>
        </ul>
        <a
          href="https://www.exam.or.jp/h_link/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
        >
          協会のリンク方針を確認
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </section>
    </PageContainer>
  );
}
