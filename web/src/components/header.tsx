"use client";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:py-5">
      <div className="flex items-center gap-3">
        {/* ヘルメットアイコン */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-white"
            aria-hidden="true"
          >
            <path d="M12 2C7.03 2 3 6.03 3 11v2h18v-2c0-4.97-4.03-9-9-9z" />
            <path d="M2 13h20" />
            <path d="M3 15a9 9 0 0 0 18 0" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            ANZEN AI
          </p>
          <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            現場の安全情報を、すばやく確認
          </h1>
        </div>
        {/* 更新ボタン */}
        <button
          onClick={() => window.location.reload()}
          aria-label="ページを更新"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        法改正・現場リスク・事故DB・KY用紙をまとめて確認できます。
      </p>
    </header>
  );
}
