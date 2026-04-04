export function Header() {
  return (
    <header className="border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3 sm:py-5">
      <p className="text-xs font-semibold tracking-wide text-emerald-700">安全AIサイト</p>
      <h1 className="mt-1.5 text-xl font-bold leading-snug text-slate-900">
        現場の安全情報を、すばやく確認
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        法改正・現場リスク・事故DB・KY用紙をまとめて確認できます。
      </p>
    </header>
  );
}
