import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。トップページから目的の機能をご覧ください。",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            404 Not Found
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            ページが見つかりません
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            URLが変更されたか、削除された可能性があります。下記のリンクから目的のページをお探しください。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              トップへ戻る
            </Link>
            <Link
              href="/laws"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              法令一覧
            </Link>
            <Link
              href="/accidents"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              事故データベース
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
