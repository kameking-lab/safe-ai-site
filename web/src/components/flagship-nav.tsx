"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
  // R3: モバイルは bottom nav(5+もっとシート) + ヘッダー「メニュー」ドロワー(全機能) で
  // 主要機能へ到達できるため、重複していた FlagshipNav モバイルドロワーは廃止し
  // 3重ナビ(「どのメニュー?」迷子)とチャム量を解消。デスクトップの横並びナビは維持。
  return <FlagshipNavDesktop />;
}
