"use client";

/**
 * Phase 4: チャットボット応答に表示する通達・告示・指針カード。
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §7
 *
 * 表示内容:
 * - 通達名 / noticeNumber / 発出日 / 発出機関 / bindingLevel バッジ
 * - 「原文を見る」ボタン（detailUrl を新タブで開く）
 * - 本文要約は表示しない（JAISH 編集解説の置換リスク回避）
 */

import { ExternalLink } from "lucide-react";
import type { AttachedNotice } from "@/lib/chatbot-notice-attachment";

const BINDING_LABEL: Record<AttachedNotice["bindingLevel"], string> = {
  binding: "拘束力あり",
  indirect: "通達（行政解釈）",
  reference: "参考",
};

const BINDING_TONE: Record<
  AttachedNotice["bindingLevel"],
  { chip: string; border: string; bg: string }
> = {
  binding: {
    chip: "bg-rose-100 text-rose-900",
    border: "border-rose-200",
    bg: "bg-rose-50/60",
  },
  indirect: {
    chip: "bg-amber-100 text-amber-900",
    border: "border-amber-200",
    bg: "bg-amber-50/60",
  },
  reference: {
    chip: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
    bg: "bg-slate-50",
  },
};

const SOURCE_LABEL: Record<AttachedNotice["source"], string> = {
  A: "条文紐付け",
  B: "応答内引用",
  C: "関連キーワード",
};

export function ChatbotNoticeCard({ notice }: { notice: AttachedNotice }) {
  const tone = BINDING_TONE[notice.bindingLevel] ?? BINDING_TONE.reference;
  return (
    <article
      className={`rounded-lg border ${tone.border} ${tone.bg} p-3 text-xs sm:text-[13px] dark:bg-slate-900/40 dark:border-slate-700`}
    >
      <header className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
          {notice.docType}
        </span>
        {notice.noticeNumber && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
            {notice.noticeNumber}
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.chip}`}>
          {BINDING_LABEL[notice.bindingLevel]}
        </span>
        {notice.issuedDateRaw && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {notice.issuedDateRaw}
          </span>
        )}
        <span
          className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          title={`検出経路: ${SOURCE_LABEL[notice.source]}`}
        >
          {notice.source}
        </span>
      </header>
      <h3 className="mt-1.5 font-bold leading-snug text-slate-900 dark:text-slate-100">
        {notice.title}
      </h3>
      {notice.issuer && (
        <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
          発出: {notice.issuer}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <a
          href={notice.detailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[32px] items-center gap-1 rounded border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-300"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          原文を見る
        </a>
      </div>
    </article>
  );
}
