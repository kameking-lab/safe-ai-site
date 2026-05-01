import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。",
  robots: { index: false, follow: false },
};

export default function MainNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
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
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          <li>
            <Link
              href="/"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              トップ
            </Link>
          </li>
          <li>
            <Link
              href="/laws"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              法令一覧
            </Link>
          </li>
          <li>
            <Link
              href="/accidents"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              事故データベース
            </Link>
          </li>
          <li>
            <Link
              href="/e-learning"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Eラーニング
            </Link>
          </li>
          <li>
            <Link
              href="/ky"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              KY用紙
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              お問い合わせ
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
