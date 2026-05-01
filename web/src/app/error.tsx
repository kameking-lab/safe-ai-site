"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ANZEN AI] global error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/60 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            予期しないエラー
          </p>
          <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            ページの表示中に問題が発生しました
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            一時的な不具合の可能性があります。再試行しても解決しない場合は、トップページからやり直してください。問題が続く場合はお問い合わせください。
          </p>
          {error.digest ? (
            <p className="mt-3 break-all text-[11px] text-slate-500 dark:text-slate-400">
              エラーID: {error.digest}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              再試行
            </button>
            <a
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              トップへ戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
