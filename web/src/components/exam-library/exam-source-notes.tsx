import { ExternalLink } from "lucide-react";
import { EXAM_GROUPS, type ExamCatalogEntry } from "@/lib/exam-library-model";

interface ExamSourceNotesProps {
  /** 回ページでは該当する回の情報だけを表示する */
  entry?: ExamCatalogEntry;
  className?: string;
}

/** 出典・日付の意味・法令時点・採点方針の簡潔な注記 */
export function ExamSourceNotes({ entry, className = "" }: ExamSourceNotesProps) {
  const groups = entry ? EXAM_GROUPS.filter((group) => group.id === entry.group) : EXAM_GROUPS;
  return (
    <section
      aria-labelledby="exam-source-notes-title"
      className={`rounded-2xl border-2 border-sky-800 bg-sky-50 p-5 text-sky-950 dark:border-sky-300 dark:bg-sky-950/30 dark:text-sky-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${className}`}
    >
      <h2 id="exam-source-notes-title" className="text-xl font-black">
        出典・日付・採点について
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
        <li>
          問題は公益財団法人安全衛生技術試験協会の公表PDFに基づきます。当サイトは同協会とは別の運営です。
        </li>
        {groups.map((group) => (
          <li key={group.id}>
            {group.shortTitle}: {group.dateNote}
          </li>
        ))}
        <li>
          出題当時の法令に基づく問題です。その後の法改正で現行の規定と異なる場合があります。
        </li>
        <li>
          正解・不正解は、公表PDFの正答表示を確認できた問題だけに表示します。記述式や正答未登録の問題は採点しません。
        </li>
        <li>
          回答は初期設定では保存しません。「この端末に保存する」をオンにした場合だけ、ブラウザ内に保存します。
        </li>
      </ul>
      {entry ? (
        <div className="mt-3 flex flex-wrap gap-x-5">
          <a
            href={entry.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
          >
            この回の公式PDF
            <span className="sr-only">（新しいタブで開きます）</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href={entry.indexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
          >
            公表問題の一覧ページ
            <span className="sr-only">（新しいタブで開きます）</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </section>
  );
}
