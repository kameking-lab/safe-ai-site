import Link from "next/link";

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
        SDSの第1項で物質名とCAS番号を確認し、公式検索で一致する物質を選んでください。
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
      <p className="mt-5 text-sm font-black text-slate-900">CAS番号別の確認例</p>
      <nav
        aria-label="CAS番号別の確認例"
        className="mt-1 flex flex-wrap gap-x-5 gap-y-1"
      >
        <Link
          href="/chemical-database/108-88-3"
          className="inline-flex min-h-11 items-center font-bold text-brand-primary underline underline-offset-4"
        >
          トルエン（108-88-3）
        </Link>
        <Link
          href="/chemical-database/67-56-1"
          className="inline-flex min-h-11 items-center font-bold text-brand-primary underline underline-offset-4"
        >
          メタノール（67-56-1）
        </Link>
      </nav>
      <p className="mt-2 text-xs font-bold text-slate-600">
        物質名とCAS番号が一致しない場合は評価を始めず、製品の最新SDSを確認してください。
      </p>
    </section>
  );
}
