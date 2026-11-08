/* eslint-disable @next/next/no-html-link-for-pages -- These links live inside noscript; client-side Link hydration cannot run here. */

export function ChemicalRaNoScriptFallback() {
  return (
    <section
      aria-labelledby="chemical-ra-nojs-title"
      className="mx-auto max-w-7xl px-4 py-5 lg:px-8"
      data-chemical-ra-nojs
    >
      <h2 id="chemical-ra-nojs-title" className="text-xl font-black text-slate-950">
        JavaScriptを有効にすると判定できます
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
        リスクレベルの計算は、入力した内容をサーバーへ送らずにこの端末の中で行います。ブラウザのJavaScriptを有効にしてから開き直してください。物質の確認には、SDSの第3項（組成及び成分情報）にある物質名・CAS番号・含有率を使います。
      </p>
      <p className="mt-5 text-sm font-black text-slate-900">物質ごとの収録情報</p>
      <nav
        aria-label="CAS番号別の収録情報"
        className="mt-1 flex flex-wrap gap-x-5 gap-y-1"
      >
        <a
          href="/chemical-database/108-88-3"
          className="inline-flex min-h-11 items-center font-bold text-brand-primary underline underline-offset-4"
        >
          トルエン（108-88-3）
        </a>
        <a
          href="/chemical-database/67-56-1"
          className="inline-flex min-h-11 items-center font-bold text-brand-primary underline underline-offset-4"
        >
          メタノール（67-56-1）
        </a>
      </nav>
    </section>
  );
}
