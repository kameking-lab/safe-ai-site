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
            {/* ヘルメット形状 */}
            <path d="M12 2C7.03 2 3 6.03 3 11v2h18v-2c0-4.97-4.03-9-9-9z" />
            <path d="M2 13h20" />
            <path d="M3 15a9 9 0 0 0 18 0" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            ANZEN AI
          </p>
          <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            現場の安全情報を、すばやく確認
          </h1>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        法改正・現場リスク・事故DB・KY用紙をまとめて確認できます。
      </p>
    </header>
  );
}
