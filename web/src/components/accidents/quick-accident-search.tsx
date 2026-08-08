"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { setTransientAccidentKeyword } from "@/lib/accidents/transient-search";

export function QuickAccidentSearch() {
  const [keyword, setKeyword] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTransientAccidentKeyword(keyword);
    window.setTimeout(() => {
      document.getElementById("accident-results")?.scrollIntoView?.({
        block: "start",
      });
    }, 0);
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
    </section>
  );
}
