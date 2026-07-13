"use client";

/**
 * P0-011 (usability-audit-day2-2026-05-24):
 * /laws/notices-precedents から移植した「判例」セクション。
 *
 * 元ページは通達(officialNotices)と判例(courtPrecedents)の2部構成だったが、
 * 通達は /circulars (1069件 DB) と機能重複していたため /circulars に統合する
 * 過程で、判例30件は失わないようにこのコンポーネントに分離して /circulars
 * 下部に配置した。
 */

import { useMemo, useState } from "react";
import { Gavel, ExternalLink, AlertTriangle } from "lucide-react";
import type { LawRevisionCore } from "@/lib/types/domain";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";

type CourtPrecedentsListProps = {
  precedents: LawRevisionCore[];
};

const PAGE_SIZE = 8;

function formatDate(iso?: string): string {
  if (!iso) return "";
  return iso.replace(/-/g, "/");
}

export function CourtPrecedentsList({ precedents }: CourtPrecedentsListProps) {
  const sorted = useMemo(
    () =>
      [...precedents].sort((a, b) =>
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
      ),
    [precedents],
  );

  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = sorted.slice(0, shown);
  const hasMore = shown < sorted.length;

  return (
    <section
      aria-labelledby="circulars-precedents-heading"
      className="mt-12 rounded-2xl border border-violet-200 bg-violet-50/30 p-5"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-700">
        <Gavel className="h-4 w-4" aria-hidden="true" />
        司法解釈 (判例)
      </div>
      <h2
        id="circulars-precedents-heading"
        className="mt-2 text-xl font-bold text-slate-900"
      >
        安全配慮義務に関する主要判例 ({sorted.length}件)
      </h2>
      <CollapsibleDetail summary="このセクションについて（出典・引用上の注意）" className="mt-3 max-w-3xl">
        通達 (行政解釈) と並んで、第2層出典として参照される最高裁・高裁判例。
        安全配慮義務・過労死・パワハラ等の労使紛争で実務上引用される代表判例を整理しています。
        本ページは概観用です。引用時は必ず裁判所・公式判例集で原文を確認してください。
      </CollapsibleDetail>

      <ul className="mt-4 space-y-3">
        {visible.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {p.revisionNumber && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 font-bold text-violet-800">
                      {p.revisionNumber}
                    </span>
                  )}
                  {p.issuer && (
                    <span className="text-slate-500">{p.issuer}</span>
                  )}
                  {p.publishedAt && (
                    <span className="text-slate-500">
                      {formatDate(p.publishedAt)}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                  {p.summary}
                </p>
                {p.court_case && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    引用: {p.court_case}
                  </p>
                )}
              </div>
              {(p.court_case_url || p.source?.url) && (
                <a
                  href={p.court_case_url ?? p.source?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 self-start rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  裁判所判例検索
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="rounded-full border border-violet-300 bg-white px-5 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"
          >
            さらに表示 (残り {sorted.length - shown}件)
          </button>
        </div>
      )}

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
        判例要旨は概観のためのものです。引用・実務判断時は必ず裁判所公式の判例集で原文を確認してください。
      </p>
    </section>
  );
}
