"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { FLAGSHIP_FEATURES } from "@/config/flagship-nav";

function FlagshipNavDesktop() {
  return (
    <nav aria-label="主要機能ナビゲーション" className="hidden border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:block">
      <ul className="mx-auto flex max-w-7xl items-stretch gap-1 px-4 py-1.5">
        {FLAGSHIP_FEATURES.map((f) => (
          <li key={f.id} className="group relative">
            <Link
              href={f.href}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
            >
              <span aria-hidden>{f.icon}</span>
              {f.label}
              {f.subItems.length > 0 && (
                <ChevronDown className="h-3 w-3 opacity-60 transition group-hover:rotate-180" aria-hidden />
              )}
            </Link>
            {f.subItems.length > 0 && (
              <div
                className="invisible absolute left-0 top-full z-30 mt-0.5 w-64 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900"
                role="menu"
              >
                <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  {f.label}
                </p>
                <ul>
                  {f.subItems.map((s) => (
                    <li key={`${s.label}-${s.href}`}>
                      <Link
                        href={s.href}
                        className="block rounded-md px-2 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
                      >
                        {s.label}
                        {s.description && (
                          <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">
                            {s.description}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 主要機能ナビ（デスクトップ：横並び＋ホバーPopover、モバイル：右からスライドインドロワー） */
export function FlagshipNav() {
  return (
    <>
      <FlagshipNavDesktop />
      <FlagshipNavMobile />
    </>
  );
}

function FlagshipNavMobile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  // ドロワーが開いている間は body のスクロールを止める
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [drawerOpen]);

  // ESCで閉じる
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <nav aria-label="主要機能ナビゲーション（モバイル）" className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:hidden">
      {/* P0-3: 既定はハンバーガーのみ。タップで右からスライドインドロワー表示。 */}
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">主要機能</p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-800 dark:text-emerald-300"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-controls="flagship-nav-drawer"
        >
          <Menu className="h-3.5 w-3.5" aria-hidden />
          主要機能（{FLAGSHIP_FEATURES.length}件）
        </button>
      </div>

      {drawerOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="flagship-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="主要機能ナビゲーション"
            className="fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform dark:bg-slate-900 lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">主要機能</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="メニューを閉じる"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {FLAGSHIP_FEATURES.map((f) => {
                const expanded = openId === f.id;
                return (
                  <li key={f.id}>
                    <div className="flex items-stretch">
                      <Link
                        href={f.href}
                        onClick={() => setDrawerOpen(false)}
                        className="flex min-h-[44px] flex-1 items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-emerald-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <span aria-hidden>{f.icon}</span>
                        {f.label}
                      </Link>
                      {f.subItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setOpenId(expanded ? null : f.id)}
                          aria-expanded={expanded}
                          aria-label={`${f.label}の配下機能を${expanded ? "閉じる" : "開く"}`}
                          className="flex min-h-[44px] w-12 items-center justify-center border-l border-slate-100 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <ul className="bg-slate-50 px-4 py-2 dark:bg-slate-950">
                        {f.subItems.map((s) => (
                          <li key={`${s.label}-${s.href}`}>
                            <Link
                              href={s.href}
                              onClick={() => setDrawerOpen(false)}
                              className="flex min-h-[44px] items-center rounded px-2 py-2 text-xs text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              {s.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
