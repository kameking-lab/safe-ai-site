import Link from "next/link";
import type { Metadata } from "next";
import { Mascot } from "@/components/mascot";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。サイト内の横断検索か、主要機能のリンクから目的のページへお進みください。",
  robots: { index: false, follow: false },
};

// 旧URL流入・タイポ流入の取りこぼしを防ぐため、404 でも (1) サイト内横断検索 と
// (2) 主要機能ランチャー を出す（site-critique C-2「404 どん詰まり」是正）。
// グローバルな fallback ページ（app-shell 外＝ナビも ⌘K も無い）のため、JS 非依存の
// ネイティブ GET フォームで /search?q= へ送る（サーバーレンダリングのみで検索手段を担保）。
const LAUNCHER: { href: string; label: string }[] = [
  { href: "/laws", label: "法令一覧" },
  { href: "/accidents", label: "事故データベース" },
  { href: "/court-cases", label: "労災判例" },
  { href: "/circulars", label: "通達" },
  { href: "/ky", label: "KY用紙" },
  { href: "/e-learning", label: "Eラーニング" },
  { href: "/chatbot", label: "安衛法チャット" },
  { href: "/contact", label: "お問い合わせ" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center py-4">
            <Mascot variant="thinking" size="xl" alt="迷子のマスコット" />
            <p className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">
              ページが見つかりません。迷子になったみたい…
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            404 Not Found
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            ページが見つかりません
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            URLが変更されたか、削除された可能性があります。キーワードでサイト内を横断検索するか、
            下記の主要機能からお探しください。
          </p>

          {/* サイト内 横断検索（JS 不要のネイティブ GET フォーム → /search?q=） */}
          <form action="/search" method="get" role="search" className="mt-5">
            <label
              htmlFor="notfound-search"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              サイト内を検索
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="notfound-search"
                type="search"
                name="q"
                inputMode="search"
                autoComplete="off"
                placeholder="例: 足場 点検 / 熱中症 / 特別教育"
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                検索
              </button>
            </div>
          </form>

          {/* 主要機能ランチャー */}
          <nav aria-label="主要機能" className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                トップへ戻る
              </Link>
              {LAUNCHER.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
