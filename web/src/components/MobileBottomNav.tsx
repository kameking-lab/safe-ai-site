"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  ClipboardList,
  FileText,
  Grid3x3,
  X,
  FlaskConical,
  Search,
  BarChart3,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";

/**
 * 山田職長級モバイル（iPhone SE 375px）専用ボトムナビ。
 * - 480px 以下のみ表示（CSS側で .mobile-bottom-nav を可視化）
 * - safe-area-inset-bottom 対応（iOS ホームバー回避）
 * - 5 アイコン: ホーム / KY / AIチャット / 日誌 / もっと
 *   （P1-M: 職長が日常で使う「KY/日誌」を最頻配置。化学物質RA・法令検索・
 *    事故分析・年次計画は「もっと」シートから1タップで到達）
 * - 各アイコン領域は 48px 以上のタップ領域を保証（globals.css の .tap-target）
 *
 * 既存ページ側は body {padding-bottom} で固定ナビ分の余白を確保（globals.css）。
 */
const PRIMARY_ITEMS = [
  { id: "home", label: "ホーム", href: "/", icon: Home },
  { id: "ky", label: "KY", href: "/ky/paper", icon: ClipboardList },
  { id: "chat", label: "AIチャット", href: "/chatbot", icon: MessageSquare },
  { id: "safety-diary", label: "日誌", href: "/safety-diary", icon: FileText },
] as const;

// 「もっと」シートで開く2次ナビ。職長が日常で必要になりがちな機能を網羅。
const MORE_ITEMS = [
  { id: "chemical-ra", label: "化学物質RA", href: "/chemical-ra", icon: FlaskConical },
  { id: "law-search", label: "法令検索", href: "/law-search", icon: Search },
  { id: "accidents-reports", label: "事故分析", href: "/accidents-reports", icon: BarChart3 },
  { id: "plan-generator", label: "年次計画", href: "/strategy/plan-generator", icon: CalendarCheck },
  { id: "risk", label: "気象リスク", href: "/risk", icon: AlertTriangle },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // ESCで閉じる + 開いている間は body スクロール停止
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      <nav
        aria-label="モバイル ボトムナビゲーション"
        data-mobile-nav="bottom"
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
          {PRIMARY_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`tap-target flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] leading-tight ${
                    active
                      ? "font-bold text-emerald-700 dark:text-emerald-300"
                      : "font-medium text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${active ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="mobile-bottom-nav-more"
              className="tap-target flex w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300"
            >
              <Grid3x3 className="h-6 w-6 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span className="truncate">もっと</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="mobile-bottom-nav-more"
            role="dialog"
            aria-modal="true"
            aria-label="その他の機能"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mx-auto flex max-w-md flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">その他の機能</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="閉じる"
                  className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="grid grid-cols-3 gap-2">
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="tap-target flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                      >
                        <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                        <span className="leading-tight">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default MobileBottomNav;
