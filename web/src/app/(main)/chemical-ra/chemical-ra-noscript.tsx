export function ChemicalRaNoScriptFallback() {
  return (
    <section
      aria-labelledby="chemical-ra-nojs-title"
      className="mx-auto max-w-7xl px-4 py-5 lg:px-8"
      data-chemical-ra-nojs
    >
      <h2 id="chemical-ra-nojs-title" className="text-xl font-black text-slate-950">
        物質名・CAS番号を確認
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
        SDS第1項の物質名・CAS番号を確認し、一致しない場合は評価せず最新SDSを確認してください。
      </p>
      <nav
        aria-label="JavaScriptなしの化学物質確認"
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <a
          href="https://www.nite.go.jp/chem/chrip/chrip_search/systemTop"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-center text-sm font-black text-white"
        >
          NITEで物質名・CAS番号を検索
        </a>
        <a
          href="https://anzeninfo.mhlw.go.jp/ras/user/anzen/kag/default.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-slate-700 bg-white px-5 py-3 text-center text-sm font-black text-slate-950"
        >
          公式CREATE-SIMPLEを開く
        </a>
      </nav>
    </section>
  );
}
