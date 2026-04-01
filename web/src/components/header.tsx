export function Header() {
  return (
    <header className="border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-5">
      <p className="text-xs font-semibold tracking-wide text-emerald-700">安全AIサイト</p>
      <h1 className="mt-2 text-xl font-bold leading-snug text-slate-900">
        現場の安全情報を、すばやく確認
      </h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        法改正の一覧、AI要約、質問チャットを1つの画面で使えるMVPです。
      </p>
    </header>
  );
}
