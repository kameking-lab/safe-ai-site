"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { findSubmissionById } from "@/lib/ugc-store";
import {
  UGC_CATEGORY_LABELS,
  UGC_INDUSTRY_OPTIONS,
  type UgcSubmission,
} from "@/lib/ugc-types";
import { ShareButtons } from "./ShareButtons";

/**
 * サーバーシードに無い投稿（クライアント localStorage に保存された投稿）を
 * 取得して表示するためのフォールバック。
 */
export function ClientFallback({ id }: { id: string }) {
  const [item, setItem] = useState<UgcSubmission | null | "loading">("loading");

  useEffect(() => {
    const found = findSubmissionById(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItem(found ?? null);
  }, [id]);

  if (item === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-slate-500">
        読み込み中...
      </main>
    );
  }

  if (!item || item.status === "rejected") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-slate-500">この事例は見つかりませんでした。</p>
        <Link
          href="/community-cases"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
        >
          一覧に戻る
        </Link>
      </main>
    );
  }

  const industryLabel =
    UGC_INDUSTRY_OPTIONS.find((i) => i.value === item.industry)?.label ?? item.industry;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/community-cases"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 一覧に戻る
      </Link>

      <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
            #{UGC_CATEGORY_LABELS[item.category]}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
            {industryLabel}
          </span>
          <span className="text-slate-400">{item.authorAlias}</span>
          {item.status === "pending" && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
              審査中
            </span>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          {item.title}
        </h1>

        <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {item.body}
        </div>

        {item.supervisorComment && (
          <aside className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-xs font-bold text-emerald-800">
                労働安全コンサルタントの監修コメント
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-900">{item.supervisorComment}</p>
          </aside>
        )}

        <div className="mt-8 border-t border-slate-200 pt-5">
          <ShareButtons title={item.title} id={item.id} />
        </div>
      </article>
    </main>
  );
}
