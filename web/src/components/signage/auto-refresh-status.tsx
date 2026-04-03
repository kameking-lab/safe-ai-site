"use client";

type AutoRefreshStatusProps = {
  intervalMinutes: number;
  lastUpdatedText: string;
};

export function AutoRefreshStatus({ intervalMinutes, lastUpdatedText }: AutoRefreshStatusProps) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-300">
      <p>
        自動更新間隔: <span className="font-semibold">{intervalMinutes}分ごと</span>
      </p>
      <p>
        最終更新: <span className="font-mono">{lastUpdatedText}</span>
      </p>
    </div>
  );
}

