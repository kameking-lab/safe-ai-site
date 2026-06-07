"use client";

import Link from "next/link";
import { ClipboardList, Shield, BookOpen, Scale, Gavel } from "lucide-react";
import type { AccidentCase } from "@/lib/types/domain";
import { getAccidentRelated } from "@/lib/accident-related";
import { courtCasesHrefForAccident } from "@/lib/court-cases/accident-court-field";

type Props = {
  accident: Pick<AccidentCase, "id" | "title" | "type" | "workCategory">;
  /**
   * "sticky": モバイルで画面下部に固定表示。
   * "inline": 通常のフローに表示（デスクトップや展開カード内）。
   */
  variant?: "sticky" | "inline";
};

/**
 * 事故詳細から KY起票・保護具・関連法令 へワンタップで動線を張る固定アクションバー。
 * モバイル sticky / デスクトップ inline の2モード。
 */
export function AccidentActionBar({ accident, variant = "inline" }: Props) {
  const related = getAccidentRelated(accident.type);
  const kyHref = `/ky?fromAccident=${encodeURIComponent(accident.id)}&template=${encodeURIComponent(
    related.template
  )}&q=${encodeURIComponent(accident.title)}`;
  const equipHref = `/equipment-finder?fromAccident=${encodeURIComponent(
    accident.title
  )}&categories=${encodeURIComponent(related.categories.join(","))}`;
  const lawsHref = `/laws?articles=${encodeURIComponent(related.articles.join(","))}`;
  // 事故の型・業種に対応する労災裁判例があるときだけ、分野フィルタ付きで誘導（無ければ非表示）
  const courtHref = courtCasesHrefForAccident(accident.type, accident.workCategory);

  const containerClass =
    variant === "sticky"
      ? "sticky bottom-0 z-20 -mx-3 mt-3 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:hidden"
      : "mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60";

  return (
    <div className={containerClass} aria-label={`${accident.title} の関連アクション`}>
      {variant === "inline" && (
        <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-300">
          → {related.rationale}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          href={kyHref}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:flex-none"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          KYを起票
        </Link>
        <Link
          href={equipHref}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 sm:flex-none"
        >
          <Shield className="h-3.5 w-3.5" />
          必要保護具を見る
        </Link>
        <Link
          href={lawsHref}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700 sm:flex-none"
        >
          <BookOpen className="h-3.5 w-3.5" />
          関連法令
        </Link>
        {courtHref && (
          <Link
            href={courtHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 sm:flex-none"
          >
            <Scale className="h-3.5 w-3.5" />
            関連裁判例
          </Link>
        )}
        <Link
          href="/court-cases/employer-liability"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-800 sm:flex-none"
        >
          <Gavel className="h-3.5 w-3.5" />
          問われる責任
        </Link>
      </div>
    </div>
  );
}
