"use client";

import Link from "next/link";
import type { ApiMode } from "@/lib/types/api";

type SignageHeaderProps = {
  regionLabel: string;
  nowText: string;
  mode: ApiMode;
  lastUpdatedText: string;
};

function modeLabel(mode: ApiMode) {
  if (mode === "live") {
    return { text: "live（本番相当）", className: "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" };
  }
  return { text: "mock（訓練データ）", className: "bg-slate-500/20 text-slate-200 border-slate-400/60" };
}

export function SignageHeader({ regionLabel, nowText, mode, lastUpdatedText }: SignageHeaderProps) {
  const label = modeLabel(mode);

  return (
    <header className="flex flex-col gap-4 border-b border-slate-700/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-wide text-emerald-300">安全AIサイト サイネージモード</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-50 lg:text-4xl">
          今日の現場リスクと安全要点
        </h1>
        <p className="mt-2 text-base text-slate-200">
          朝礼・常時表示向けに、今日のリスク・事故要点・法改正ポイントを1画面で確認できます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link className="rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800" href="/">
            ポータルへ戻る
          </Link>
          <Link className="rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800" href="/#section-ky-sheet">
            KY用紙へ
          </Link>
          <Link
            className="rounded-full border border-slate-500/60 px-3 py-1 text-slate-100 hover:bg-slate-800"
            href="/#section-notification-settings"
          >
            通知設定へ
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="text-xs text-slate-300">対象地域</p>
          <p className="text-lg font-semibold text-slate-50">{regionLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="text-xs text-slate-300">現在時刻</p>
          <p className="text-lg font-semibold text-slate-50 tabular-nums">{nowText}</p>
          <p className="text-[11px] text-slate-400">最終更新: {lastUpdatedText}</p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${label.className}`}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
          API MODE: {label.text}
        </span>
      </div>
    </header>
  );
}

