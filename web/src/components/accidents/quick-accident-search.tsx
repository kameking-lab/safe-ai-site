"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { AccidentType } from "@/lib/types/domain";
import { accidentTypeHref } from "@/lib/accidents/accident-visual";
import { ACCIDENT_TYPE_SHORT } from "@/lib/accidents/accident-pictogram-map";
import { AccidentTypePictogram } from "@/components/accidents/accident-type-pictogram";

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

// 厚労省「事故の型」のうち現場で頻出する代表型。
// タップで型の正確な絞り込み（acc_type）に直行。ピクトグラム＝柱0の視覚言語。
const QUICK_TYPES: AccidentType[] = ["墜落", "転倒", "はさまれ・巻き込まれ", "飛来・落下", "熱中症", "感電"];

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
      <h2 className="text-sm font-bold text-rose-900">
        <Search className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
        事例をすぐ検索
      </h2>
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
          className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
        >
          検索
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_TYPES.map((t) => (
          <a
            key={t}
            href={accidentTypeHref(t)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-rose-300 bg-white py-1 pl-1.5 pr-3 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            <AccidentTypePictogram type={t} size="sm" />
            {ACCIDENT_TYPE_SHORT[t]}
          </a>
        ))}
      </div>
    </section>
  );
}
