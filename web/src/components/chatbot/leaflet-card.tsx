"use client";

/**
 * Phase 4: チャットボット応答に表示する厚労省リーフレット・教材カード。
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §7
 *
 * 表示内容:
 * - リーフレット名 / 発行者 / target（現場用/管理者用/一般）/ 発行日
 * - 「📕 PDFを開く」 or 「🔗 詳細ページを開く」
 * - 本文要約は表示しない
 */

import { FileText, ExternalLink } from "lucide-react";
import type { AttachedLeaflet } from "@/lib/chatbot-notice-attachment";

const TARGET_LABEL: Record<string, string> = {
  general: "一般",
  worker: "現場用",
  employer: "管理者用",
  "foreign-worker": "外国人労働者向け",
};

const TARGET_TONE: Record<string, string> = {
  worker: "bg-blue-100 text-blue-800",
  employer: "bg-violet-100 text-violet-800",
  general: "bg-slate-100 text-slate-700",
  "foreign-worker": "bg-emerald-100 text-emerald-800",
};

export function ChatbotLeafletCard({ leaflet }: { leaflet: AttachedLeaflet }) {
  const targetTxt = TARGET_LABEL[leaflet.target] ?? leaflet.target;
  const targetCls = TARGET_TONE[leaflet.target] ?? TARGET_TONE.general;
  const primaryUrl = leaflet.pdfUrl ?? leaflet.sourceUrl;
  const primaryLabel = leaflet.pdfUrl ? "📕 PDFを開く" : "🔗 詳細ページを開く";
  const PrimaryIcon = leaflet.pdfUrl ? FileText : ExternalLink;

  return (
    <article className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-xs sm:text-[13px] dark:border-sky-700/60 dark:bg-sky-900/20">
      <header className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${targetCls}`}>
          {targetTxt}
        </span>
        {leaflet.publishedDateRaw && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {leaflet.publishedDateRaw}
          </span>
        )}
        <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
          {leaflet.publisher}
        </span>
      </header>
      <h3 className="mt-1.5 font-bold leading-snug text-slate-900 dark:text-slate-100">
        {leaflet.title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[32px] items-center gap-1 rounded border border-sky-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-50 dark:border-sky-700 dark:bg-slate-800 dark:text-sky-300"
        >
          <PrimaryIcon className="h-3 w-3" aria-hidden="true" />
          {primaryLabel}
        </a>
        {leaflet.pdfUrl && leaflet.sourceUrl !== leaflet.pdfUrl && (
          <a
            href={leaflet.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[32px] items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            掲載ページ
          </a>
        )}
      </div>
    </article>
  );
}
