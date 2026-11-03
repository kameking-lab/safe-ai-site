import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { ExamQuestionPlayer } from "@/components/exam-library/exam-question-player";
import { ExamSourceNotes } from "@/components/exam-library/exam-source-notes";
import { EXAM_LIBRARY_PATH, findExamEntry } from "@/lib/exam-library-catalog";
import {
  describeExamDate,
  examPath,
  findExamGroup,
  formatExamDate,
  isScorableQuestion,
  type ExamCatalogEntry,
} from "@/lib/exam-library-model";
import { listAvailableExamIds, loadExamPaper } from "@/lib/exam-library-papers";
import { SITE_URL } from "@/lib/seo-metadata";

interface ExamPageProps {
  params: Promise<{ id: string }>;
}

// 問題データを表示できるカタログ内の回だけを受け付ける（その他は404）
export const dynamicParams = false;

export function generateStaticParams() {
  return listAvailableExamIds().map((id) => ({ id }));
}

function resolveExam(id: string) {
  const entry = findExamEntry(id);
  if (!entry) return null;
  const questions = loadExamPaper(entry.id);
  if (!questions) return null;
  return { entry, questions };
}

function examTitle(entry: ExamCatalogEntry): string {
  return `${entry.subject} ${entry.label}`;
}

function examDescription(entry: ExamCatalogEntry, questionCount: number, scoredCount: number): string {
  const dateText =
    entry.dateKind === "publication"
      ? `${formatExamDate(entry.date)}公表分（試験実施日ではありません）`
      : `${formatExamDate(entry.date)}実施分`;
  const scoring =
    scoredCount > 0
      ? `公式正答で${scoredCount}問を採点し、間違えた問題を解き直せます。`
      : "自動採点はせず、解答メモで自己確認できます。";
  return `${entry.subject}の公表試験問題（${dateText}）${questionCount}問を1問ずつ解けます。${scoring}`;
}

export async function generateMetadata({ params }: ExamPageProps): Promise<Metadata> {
  const { id } = await params;
  const resolved = resolveExam(id);
  if (!resolved) return {};
  const { entry, questions } = resolved;
  const scoredCount = questions.filter(isScorableQuestion).length;
  return {
    title: `${examTitle(entry)}（${describeExamDate(entry)}）過去問演習`,
    description: examDescription(entry, questions.length, scoredCount),
    alternates: { canonical: examPath(entry.id) },
    robots: { index: true, follow: true },
  };
}

export default async function ExamPage({ params }: ExamPageProps) {
  const { id } = await params;
  const resolved = resolveExam(id);
  if (!resolved) notFound();
  const { entry, questions } = resolved;
  const group = findExamGroup(entry.group);
  const scoredCount = questions.filter(isScorableQuestion).length;
  const title = examTitle(entry);
  const url = `${SITE_URL}${examPath(entry.id)}`;
  const backHref = `${EXAM_LIBRARY_PATH}?${new URLSearchParams({ group: entry.group, subject: entry.subject }).toString()}`;

  return (
    <PageContainer width="full">
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description: examDescription(entry, questions.length, scoredCount),
            url,
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "公表試験問題の過去問演習", url: `${SITE_URL}${EXAM_LIBRARY_PATH}` },
            { name: title, url },
          ]),
        ]}
      />

      <nav aria-label="パンくず補助" className="mb-3">
        <Link
          href={backHref}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-2 font-black text-sky-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          試験・科目・回の選択へ戻る
        </Link>
      </nav>

      <header className="mb-6">
        <p className="text-sm font-black text-emerald-800 dark:text-emerald-300 forced-colors:text-[CanvasText]">
          {group?.title ?? "公表試験問題"}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          {entry.subject}
          <span className="ml-2 inline-block text-xl sm:text-2xl">{entry.label}</span>
        </h1>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-800 dark:text-slate-100">
          <div className="flex gap-1">
            <dt className="font-black">{entry.dateKind === "publication" ? "公表時期" : "実施日"}:</dt>
            <dd>
              <time dateTime={entry.date}>{formatExamDate(entry.date)}</time>
              {entry.dateKind === "publication" ? "（試験実施日ではありません）" : null}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-black">問題数:</dt>
            <dd>{questions.length}問</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-black">公式正答で採点:</dt>
            <dd>{scoredCount}問</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-black">公表ページ確認日:</dt>
            <dd>
              <time dateTime={entry.checkedAt}>{formatExamDate(entry.checkedAt)}</time>
            </dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl border-2 border-amber-700 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
          出題当時の法令に基づく問題です。その後の法改正で、現行の規定と異なる場合があります。
        </p>
      </header>

      <ExamQuestionPlayer
        key={entry.id}
        examId={entry.id}
        examTitle={title}
        pdfUrl={entry.pdfUrl}
        indexUrl={entry.indexUrl}
        questions={questions}
      />

      {entry.noteLinks ? (
        <section aria-labelledby="exam-note-links-title" className="mt-8">
          <h2 id="exam-note-links-title" className="text-xl font-black text-slate-950 dark:text-white">
            関連する解説記事
          </h2>
          <ul className="mt-2 grid gap-1">
            {entry.noteLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline decoration-2 underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
                >
                  {link.title}
                  <span className="sr-only">（新しいタブで開きます）</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ExamSourceNotes entry={entry} className="mt-10" />
    </PageContainer>
  );
}
