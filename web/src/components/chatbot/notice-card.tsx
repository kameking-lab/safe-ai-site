"use client";

import { useState } from "react";
import { ExternalLink, ScrollText } from "lucide-react";
import type { MhlwNotice } from "@/data/mhlw-notices";

const BINDING_LABEL: Record<string, string> = {
  binding: "告示（拘束力あり）",
  indirect: "通達（行政解釈・間接拘束）",
  reference: "指針（参考）",
};

const BINDING_BADGE: Record<string, string> = {
  binding: "bg-rose-100 text-rose-800 border-rose-200",
  indirect: "bg-amber-100 text-amber-800 border-amber-200",
  reference: "bg-slate-100 text-slate-700 border-slate-200",
};

const DOC_TYPE_BADGE: Record<string, string> = {
  通達: "bg-blue-100 text-blue-800",
  告示: "bg-rose-100 text-rose-800",
  指針: "bg-emerald-100 text-emerald-800",
};

function NoticeCardItem({ notice }: { notice: MhlwNotice }) {
  const url = notice.detailUrl || notice.pdfUrl || notice.sourceUrl;
  const bindingClass =
    BINDING_BADGE[notice.bindingLevel ?? "reference"] ?? BINDING_BADGE.reference;
  const docBadge = DOC_TYPE_BADGE[notice.docType ?? "通達"] ?? "bg-slate-100 text-slate-700";
  return (
    <article className="rounded-md border border-amber-200 bg-white p-3 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {notice.docType && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${docBadge}`}>
            {notice.docType}
          </span>
        )}
        {notice.noticeNumber && (
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
            {notice.noticeNumber}
          </span>
        )}
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${bindingClass}`}>
          {BINDING_LABEL[notice.bindingLevel ?? "reference"] ?? notice.bindingLevel}
        </span>
        {notice.issuedDateRaw && (
          <span className="text-[10px] text-slate-500">{notice.issuedDateRaw}</span>
        )}
      </div>
      <p className="font-semibold text-slate-900 leading-snug">{notice.title}</p>
      {notice.issuer && (
        <p className="text-[11px] text-slate-600">発出: {notice.issuer}</p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
        >
          原文を開く
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

/**
 * 通達・告示・指針カード一覧。インライン 3 件 + 折りたたみで残りを表示。
 */
export function ChatbotNoticeCard({
  notices,
  initialVisible = 3,
}: {
  notices: MhlwNotice[];
  initialVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!notices || notices.length === 0) return null;
  const visible = expanded ? notices : notices.slice(0, initialVisible);
  const hidden = notices.length - visible.length;
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
          関連通達・告示 ({notices.length} 件)
        </h3>
      </header>
      <div className="space-y-2">
        {visible.map((n) => (
          <NoticeCardItem key={n.id} notice={n} />
        ))}
      </div>
      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
        >
          もっと見る (+{hidden})
        </button>
      )}
      <p className="text-[10px] text-amber-800">
        出典: 厚労省・JAISH(中央労働災害防止協会)。本ツールは構造化情報 (発出番号・日付・URL) のみ表示し、通達本文の要約・転載は行いません。
      </p>
    </section>
  );
}
