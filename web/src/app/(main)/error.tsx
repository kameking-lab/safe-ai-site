"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ANZEN AI] main route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/60 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          エラー
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          このページの表示で問題が発生しました
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          再試行しても解決しない場合は、別のページからやり直してください。
        </p>
        {error.digest ? (
          <p className="mt-2 break-all text-[11px] text-slate-500 dark:text-slate-400">
            エラーID: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            再試行
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
