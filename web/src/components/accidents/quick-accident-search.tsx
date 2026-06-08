"use client";

import { useState, type FormEvent } from "react";

/**
 * 事故DBの最上部に置く「クイック事例検索」。
 *
 * 多忙な労働安全コンサル目線レビュー(docs/third-party-reviews/accidents-busy-consultant-2026-06-08.md)で、
 * 既存の検索/絞り込みタブはページ先頭から約5,500px下（モバイルで約6.5画面）にあり、
 * 既定タブ「全件検索」にはキーワード入力欄が無いことが判明。
 * ここでは1タップ/1検索で、収録事例タブ(tab=list)へ acc_kw 付きで直行し、
 * #section-accidents へスクロールして即・絞り込み結果を見せる。
 *
 * 遷移先のURLパラメータ(tab=list / acc_kw / acc_industries)は
 * AccidentDatabasePanel が既にマウント時に復元する実装済み・テスト済みの導線を再利用している。
 */

// 厚労省「事故の型」のうち現場で頻出する代表型。タップでキーワード検索に直行。
const QUICK_TYPES: { label: string; kw: string }[] = [
  { label: "墜落・転落", kw: "墜落" },
  { label: "転倒", kw: "転倒" },
  { label: "はさまれ", kw: "はさまれ" },
  { label: "飛来・落下", kw: "飛来" },
  { label: "熱中症", kw: "熱中症" },
  { label: "感電", kw: "感電" },
];

function buildHref(kw: string): string {
  const params = new URLSearchParams();
  params.set("tab", "list");
  const trimmed = kw.trim();
  if (trimmed) params.set("acc_kw", trimmed);
  // #accident-results = AccidentDatabasePanel(キーワード欄＋絞り込み結果)の先頭。
  // 区画先頭(#section-accidents)だと自社Top5・クロス集計の下に結果が埋もれるため直接結果へ。
  return `/accidents?${params.toString()}#accident-results`;
}

export function QuickAccidentSearch() {
  const [keyword, setKeyword] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // フル遷移で HomeScreen を再マウント→tab=list 選択＋acc_kw 復元＋結果へスクロール。
    window.location.href = buildHref(keyword);
  };

  return (
    <section className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
      <h2 className="text-sm font-bold text-rose-900">🔎 事例をすぐ検索</h2>
      <p className="mt-0.5 text-[11px] text-rose-800/80">
        キーワードか事故の型を選ぶと、収録事例の絞り込み結果へ直行します。
      </p>
      <form onSubmit={onSubmit} className="mt-2 flex gap-2">
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="例: 足場 墜落 / フォークリフト"
          aria-label="事故事例キーワード検索"
          className="min-w-0 flex-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
        >
          検索
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_TYPES.map((t) => (
          <a
            key={t.kw}
            href={buildHref(t.kw)}
            className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            {t.label}
          </a>
        ))}
      </div>
    </section>
  );
}
