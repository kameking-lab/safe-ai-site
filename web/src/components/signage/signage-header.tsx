"use client";

import Link from "next/link";
import { Mascot } from "@/components/mascot";

type SignageHeaderProps = {
  regionLabel: string;
  nowText: string;
  lastUpdatedText: string;
  /** 横長サイネージ向けに説明文を省略 */
  compact?: boolean;
  /** キオスクモード（常掲）: 他画面へのナビリンク行を隠し、本文の視認性を優先する */
  hideNav?: boolean;
};

export function SignageHeader({
  regionLabel,
  nowText,
  lastUpdatedText,
  compact,
  hideNav,
}: SignageHeaderProps) {

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-slate-700/60 pb-2 sm:gap-3 sm:pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-300 sm:text-sm lg:text-base xl:text-lg">
          <Mascot size="xs" alt="" className="shrink-0 rounded" />
          安全AIポータル サイネージ
        </p>
        <h1 className="mt-0.5 text-3xl font-bold leading-tight text-white lg:text-4xl">
          今日の現場リスクと安全要点
        </h1>
        {!compact && (
          <p className="mt-1 hidden text-sm text-slate-200 md:block xl:text-lg">
            朝礼・常時表示向けに、リスク・事故要点・法改正を1画面で確認できます。
          </p>
        )}
        {!hideNav && (
          <details className="mt-2 text-[10px] sm:text-xs min-[1024px]:hidden">
            <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-slate-500/60 px-3 py-1 font-semibold text-slate-100">
              メニュー
            </summary>
            <nav aria-label="サイネージの関連操作" className="mt-1 flex flex-wrap gap-1.5">
              <Link className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800" href="/">
                ポータルへ戻る
              </Link>
              <Link
                className="inline-flex min-h-[44px] items-center rounded-full border border-emerald-600/70 bg-emerald-900/40 px-3 py-1 font-semibold text-emerald-100 hover:bg-emerald-900/60"
                href="/ky/paper"
              >
                KY用紙へ
              </Link>
              <Link
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800"
                href="/guides/safety-signage"
              >
                表示・異常時の運用ガイド
              </Link>
              <Link
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800"
                href="/signage/manage"
              >
                多拠点・端末管理
              </Link>
            </nav>
          </details>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2 text-xs sm:gap-3 sm:text-sm">
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className="text-[10px] text-slate-300 sm:text-xs lg:text-sm xl:text-lg">地点（天気）</p>
          <p className="max-w-[200px] truncate text-sm font-semibold text-white sm:text-base lg:text-xl xl:text-3xl">{regionLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className="text-[10px] text-slate-300 sm:text-xs lg:text-sm xl:text-lg">現在時刻</p>
          <p className="text-sm font-semibold tabular-nums text-white sm:text-base lg:text-xl xl:text-3xl" suppressHydrationWarning>{nowText}</p>
          <p className="text-[10px] text-slate-400 sm:text-[11px] xl:text-sm" suppressHydrationWarning>更新: {lastUpdatedText}</p>
        </div>
      </div>
    </header>
  );
}

