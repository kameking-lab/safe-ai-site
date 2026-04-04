"use client";

type AutoRefreshStatusProps = {
  intervalMinutes: number;
  lastUpdatedText: string;
};

export function AutoRefreshStatus({ intervalMinutes, lastUpdatedText }: AutoRefreshStatusProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-700/50 pt-2 text-[10px] text-slate-400 sm:text-xs">
      <p>
        自動更新 <span className="font-semibold text-slate-300">{intervalMinutes}分</span>
      </p>
      <p className="tabular-nums">
        更新 <span className="text-slate-300">{lastUpdatedText}</span>
      </p>
    </div>
  );
}

