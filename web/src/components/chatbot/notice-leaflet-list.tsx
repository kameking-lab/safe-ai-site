"use client";

/**
 * Phase 4: 通達・リーフレットをカードリストで表示する折りたたみコンポーネント。
 *
 * 表示ルール（設計参照 §7.3）:
 *   - 1〜3 件: インライン展開（default open）
 *   - 4 件以上: デフォルトは先頭3件のみ表示、「もっと見る」で全件展開
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  AttachedLeaflet,
  AttachedNotice,
} from "@/lib/chatbot-notice-attachment";
import { ChatbotNoticeCard } from "./notice-card";
import { ChatbotLeafletCard } from "./leaflet-card";

const INLINE_THRESHOLD = 3;

type NoticeListProps = {
  notices: AttachedNotice[];
};

export function ChatbotNoticeList({ notices }: NoticeListProps) {
  const [expanded, setExpanded] = useState(false);
  if (notices.length === 0) return null;

  const overflow = notices.length > INLINE_THRESHOLD;
  const shown = !overflow || expanded ? notices : notices.slice(0, INLINE_THRESHOLD);

  return (
    <section
      aria-labelledby="chatbot-notices-heading"
      className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-700/60 dark:bg-emerald-900/15"
    >
      <h3
        id="chatbot-notices-heading"
        className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-900 dark:text-emerald-200"
      >
        関連通達・告示（{notices.length}件）
      </h3>
      <ul className="space-y-2">
        {shown.map((n) => (
          <li key={n.id}>
            <ChatbotNoticeCard notice={n} />
          </li>
        ))}
      </ul>
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          {expanded
            ? "折りたたむ"
            : `もっと見る（あと ${notices.length - INLINE_THRESHOLD} 件）`}
        </button>
      )}
    </section>
  );
}

type LeafletListProps = {
  leaflets: AttachedLeaflet[];
};

export function ChatbotLeafletList({ leaflets }: LeafletListProps) {
  const [expanded, setExpanded] = useState(false);
  if (leaflets.length === 0) return null;

  const overflow = leaflets.length > INLINE_THRESHOLD;
  const shown = !overflow || expanded ? leaflets : leaflets.slice(0, INLINE_THRESHOLD);

  return (
    <section
      aria-labelledby="chatbot-leaflets-heading"
      className="mt-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-700/60 dark:bg-sky-900/15"
    >
      <h3
        id="chatbot-leaflets-heading"
        className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-900 dark:text-sky-200"
      >
        関連リーフレット・教材（{leaflets.length}件）
      </h3>
      <ul className="space-y-2">
        {shown.map((l) => (
          <li key={l.id}>
            <ChatbotLeafletCard leaflet={l} />
          </li>
        ))}
      </ul>
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-full border border-sky-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-50 dark:border-sky-700 dark:bg-slate-800 dark:text-sky-300"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          {expanded
            ? "折りたたむ"
            : `もっと見る（あと ${leaflets.length - INLINE_THRESHOLD} 件）`}
        </button>
      )}
    </section>
  );
}
