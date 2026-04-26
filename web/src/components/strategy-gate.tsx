"use client";

import { useState } from "react";
import { SimpleMarkdown } from "@/components/simple-markdown";

export function StrategyGate({ password, content }: { password: string; content: string }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (unlocked) {
    return (
      <article className="prose prose-slate max-w-none">
        <SimpleMarkdown content={content} className="text-slate-800" />
        <div className="mt-12 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => {
              setUnlocked(false);
              setInput("");
            }}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            ロックする
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input === password) {
            setUnlocked(true);
            setError(null);
          } else {
            setError("パスワードが違います");
          }
        }}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ANZEN AI 内部文書</p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">月商100万円戦略 — パスワード保護</h1>
          <p className="mt-2 text-sm text-slate-600">
            この資料は閲覧制限されています。閲覧パスワードを入力してください。
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700">パスワード</label>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          autoComplete="off"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          表示する
        </button>
        <p className="mt-4 text-xs text-slate-500">
          このページは noindex 設定されており、検索エンジンには表示されません。
        </p>
      </form>
    </div>
  );
}
