"use client";

import { useState } from "react";
import { BadgeCheck, Download, Languages, Stamp } from "lucide-react";
import {
  DIRECT_TEXT_IS_EXACT,
  PILOT_LANGUAGES,
  PILOT_LANGUAGE_LABELS,
  pilotDownloadUrl,
  type PilotBrand,
  type PilotLanguage,
  type PilotVariant,
} from "@/data/safety-image-pilot";
import { PilotPoster } from "./pilot-poster";

const comparisonRows = [
  { label: "文字の正確さ", a: "定義文字列と一致", b: "5言語一致（目視）" },
  { label: "読みやすさ", a: "太字・印刷向け", b: "生成結果のまま" },
  { label: "言語変更", a: "5言語＋各言語", b: "変更不可" },
  { label: "再利用のしやすさ", a: "画像と文字を分離", b: "比較用" },
] as const;

export function PilotComparisonClient() {
  const [selectedVariant, setSelectedVariant] = useState<PilotVariant>("a");
  const [language, setLanguage] = useState<PilotLanguage>("all");
  const [brand, setBrand] = useState<PilotBrand>("branded");

  function chooseVariant(variant: PilotVariant) {
    setSelectedVariant(variant);
    if (variant === "b") setLanguage("all");
  }

  return (
    <div>
      <section aria-labelledby="method-heading" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black tracking-[.14em] text-emerald-800 dark:text-emerald-300">COMPARE</p>
            <h2 id="method-heading" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">表示を切り替える</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><BadgeCheck className="h-4 w-4" aria-hidden="true" />方式</p>
              <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900" role="tablist" aria-label="比較方式">
                {(["a", "b"] as const).map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    role="tab"
                    aria-selected={selectedVariant === variant}
                    aria-controls={`pilot-panel-${variant}`}
                    onClick={() => chooseVariant(variant)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${selectedVariant === variant ? "bg-emerald-800 text-white shadow-sm" : "text-slate-700 dark:text-slate-200"}`}
                  >
                    {variant === "a" ? "A 後付け文字" : "B 画像内文字"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><Stamp className="h-4 w-4" aria-hidden="true" />ブランド</p>
              <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="ブランド表示">
                {(["branded", "clean"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={brand === option}
                    onClick={() => setBrand(option)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${brand === option ? "bg-white text-emerald-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
                  >
                    {option === "branded" ? "チワワ・©あり" : "なし"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="mb-2 flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><Languages className="h-4 w-4" aria-hidden="true" />方式Aの言語</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="方式Aの表示言語">
            {PILOT_LANGUAGES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={selectedVariant === "a" && language === option}
                onClick={() => {
                  setSelectedVariant("a");
                  setLanguage(option);
                }}
                className={`min-h-11 rounded-full border px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${selectedVariant === "a" && language === option ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"}`}
              >
                {PILOT_LANGUAGE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <noscript>
        <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 font-bold text-emerald-950">
          JavaScriptなしでは推奨の方式A・5言語併記版を表示しています。下の通常リンクからダウンロードできます。
        </p>
      </noscript>

      <section aria-label="AとBの実画像比較" className="mt-6 grid gap-5 lg:grid-cols-2">
        <article
          id="pilot-panel-a"
          role="tabpanel"
          className={`${selectedVariant === "a" ? "block" : "hidden"} rounded-3xl border-2 ${selectedVariant === "a" ? "border-emerald-600" : "border-slate-200"} bg-white p-3 shadow-sm lg:block sm:p-4 dark:bg-slate-950`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">推奨</p>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">A 後付け文字版</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">文字を分離</span>
          </div>
          <PilotPoster variant="a" language={language} branded={brand === "branded"} priority />
        </article>

        <article
          id="pilot-panel-b"
          role="tabpanel"
          className={`${selectedVariant === "b" ? "block" : "hidden"} rounded-3xl border-2 ${selectedVariant === "b" ? "border-sky-600" : "border-slate-200"} bg-white p-3 shadow-sm lg:block sm:p-4 dark:bg-slate-950`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-800 dark:text-sky-300">比較用</p>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">B 画像生成内文字版</h2>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-900">5言語一致</span>
          </div>
          <PilotPoster variant="b" language="all" branded={brand === "branded"} />
        </article>
      </section>

      <section aria-labelledby="download-heading" className="mt-8 rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[.14em] text-emerald-300">DOWNLOAD</p>
            <h2 id="download-heading" className="mt-1 text-2xl font-black">
              {selectedVariant === "a" ? "方式A" : "方式B・比較用"}をダウンロード
            </h2>
            <p className="mt-1 text-sm text-slate-300">{brand === "branded" ? "チワワ・©あり" : "ブランドなし"}／{selectedVariant === "a" ? PILOT_LANGUAGE_LABELS[language] : "5言語併記"}</p>
          </div>
          {selectedVariant === "a" ? <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">この用途におすすめ</span> : null}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(["A4", "A3"] as const).flatMap((paper) =>
            (["jpeg", "pdf"] as const).map((format) => (
              <a
                key={`${paper}-${format}`}
                href={pilotDownloadUrl({ variant: selectedVariant, language, brand, paper, format })}
                download
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 shadow-sm hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {paper}縦 {format.toUpperCase()}
              </a>
            )),
          )}
        </div>
        {!DIRECT_TEXT_IS_EXACT && selectedVariant === "b" ? (
          <p className="mt-4 rounded-xl bg-amber-300 p-3 font-black text-amber-950">比較用・現場使用不可</p>
        ) : null}
      </section>

      <section aria-labelledby="comparison-heading" className="mt-8">
        <h2 id="comparison-heading" className="text-xl font-black text-slate-950 dark:text-white">比較項目</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[1.05fr_1fr_1fr] bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <span>項目</span><span>方式A</span><span>方式B</span>
          </div>
          {comparisonRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1.05fr_1fr_1fr] gap-2 border-t border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="font-black text-slate-950 dark:text-white">{row.label}</span>
              <span className="text-slate-700 dark:text-slate-200">{row.a}</span>
              <span className="text-slate-700 dark:text-slate-200">{row.b}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
