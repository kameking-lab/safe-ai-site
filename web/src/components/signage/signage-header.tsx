"use client";

import Link from "next/link";

type SignageHeaderProps = {
  regionLabel: string;
  nowText: string;
  lastUpdatedText: string;
  /** 横長サイネージ向けに説明文を省略 */
  compact?: boolean;
};

export function SignageHeader({
  regionLabel,
  nowText,
  lastUpdatedText,
  compact,
}: SignageHeaderProps) {

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-slate-700/60 pb-2 sm:gap-3 sm:pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-emerald-300 sm:text-sm lg:text-base">ANZEN AI サイネージ</p>
        <h1 className="mt-0.5 text-xl font-bold leading-tight text-white sm:text-2xl lg:text-4xl">
          今日の現場リスクと安全要点
        </h1>
        {!compact && (
          <p className="mt-1 hidden text-sm text-slate-200 md:block">
            朝礼・常時表示向けに、リスク・事故要点・法改正を1画面で確認できます。
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] sm:text-xs">
          <Link className="rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800" href="/">
            ポータルへ戻る
          </Link>
          <Link
            className="rounded-full border border-emerald-600/70 bg-emerald-900/40 px-3 py-1 font-semibold text-emerald-100 hover:bg-emerald-900/60"
            href="/laws"
          >
            法改正一覧へ
          </Link>
          <Link className="rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800" href="/ky">
            KY用紙へ
          </Link>
          <Link
            className="rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800"
            href="/notifications"
          >
            通知設定へ
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2 text-xs sm:gap-3 sm:text-sm">
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className="text-[10px] text-slate-300 sm:text-xs lg:text-sm">地点（天気）</p>
          <p className="max-w-[200px] truncate text-sm font-semibold text-white sm:text-base lg:text-xl">{regionLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className="text-[10px] text-slate-300 sm:text-xs lg:text-sm">現在時刻</p>
          <p className="text-sm font-semibold tabular-nums text-white sm:text-base lg:text-xl">{nowText}</p>
          <p className="text-[10px] text-slate-400 sm:text-[11px]">更新: {lastUpdatedText}</p>
        </div>
      </div>
    </header>
  );
}

