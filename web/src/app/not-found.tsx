import Link from "next/link";
import type { Metadata } from "next";
import { MascotBadge } from "@/components/mascot-badge";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。サイト内の横断検索か、主要機能のリンクから目的のページへお進みください。",
  robots: { index: false, follow: false },
  // 存在しないURLをホームの重複URLとして扱わせない。
  alternates: { canonical: null as unknown as string },
};

// 旧URL流入・タイポ流入の取りこぼしを防ぐため、404 でも (1) サイト内横断検索 と
// (2) 主要機能ランチャー を出す（site-critique C-2「404 どん詰まり」是正）。
// グローバルな fallback ページ（app-shell 外＝ナビも ⌘K も無い）のため、検索語を
// URLへ送らない /search の入力画面へ案内する。
const LAUNCHER: { href: string; label: string }[] = [
  { href: "/risk", label: "今日の安全" },
  { href: "/laws", label: "法令一覧" },
  { href: "/accident-news", label: "重大災害情報" },
  { href: "/circulars", label: "通達" },
  { href: "/ky/paper", label: "KY用紙" },
  { href: "/chemical-ra", label: "化学物質RA" },
  { href: "/chatbot", label: "安衛法チャット" },
  { href: "/contact", label: "お問い合わせ" },
];

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center py-4">
            <MascotBadge
              variant="thinking"
              size={192}
              alt="迷子のマスコット"
            />
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

          <Link
            href="/search"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            サイト内を検索
          </Link>

          {/* 主要機能ランチャー */}
          <nav aria-label="主要機能" className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                トップへ戻る
              </Link>
              {LAUNCHER.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </main>
  );
}
