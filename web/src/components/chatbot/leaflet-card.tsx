"use client";

import { useState } from "react";
import { ExternalLink, BookOpen } from "lucide-react";
import type { MhlwLeaflet } from "@/data/mhlw-leaflets";

function LeafletCardItem({ leaflet }: { leaflet: MhlwLeaflet }) {
  const url = leaflet.detailUrl || leaflet.pdfUrl || leaflet.sourceUrl;
  return (
    <article className="rounded-md border border-blue-200 bg-white p-3 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {leaflet.categoryLabel && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-900">
            {leaflet.categoryLabel}
          </span>
        )}
        {leaflet.publishedDateRaw && (
          <span className="text-[10px] text-slate-500">{leaflet.publishedDateRaw}</span>
        )}
        {leaflet.pageCount && leaflet.pageCount > 0 && (
          <span className="text-[10px] text-slate-500">{leaflet.pageCount}p</span>
        )}
      </div>
      <p className="font-semibold text-slate-900 leading-snug">{leaflet.title}</p>
      {leaflet.publisher && (
        <p className="text-[11px] text-slate-600">発行: {leaflet.publisher}</p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
        >
          原文を開く
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

/**
 * リーフレットカード一覧。インライン 3 件 + 折りたたみ。
 */
export function ChatbotLeafletCard({
  leaflets,
  initialVisible = 3,
}: {
  leaflets: MhlwLeaflet[];
  initialVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!leaflets || leaflets.length === 0) return null;
  const visible = expanded ? leaflets : leaflets.slice(0, initialVisible);
  const hidden = leaflets.length - visible.length;
  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          関連リーフレット ({leaflets.length} 件)
        </h3>
      </header>
      <div className="space-y-2">
        {visible.map((l) => (
          <LeafletCardItem key={l.id} leaflet={l} />
        ))}
      </div>
      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
        >
          もっと見る (+{hidden})
        </button>
      )}
      <p className="text-[10px] text-blue-800">
        出典: 厚労省ほか各省庁公式リーフレット (PDF 原本) 。
      </p>
    </section>
  );
}
