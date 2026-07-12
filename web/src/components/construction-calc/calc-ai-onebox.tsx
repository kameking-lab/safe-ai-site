"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, ChevronRight, HelpCircle } from "lucide-react";

/**
 * 建設計算 AI入口ワンボックス（化学一窓と同じ思想）。
 * 自由記述 → POST /api/construction-calc → 計算機の特定＋読み取れた値の提示。
 * 読み取れなかった値は「質問」として表示し、勝手に埋めない（絶対原則）。
 * 計算そのものはリンク先の計算機ページ（決定論エンジン）が行う。
 */

type RouteResponse = {
  matched: {
    slug: string;
    title: string;
    values: Record<string, string | number>;
    questions: string[];
  } | null;
  candidates: { slug: string; title: string }[];
  message: string;
  source: "ai" | "fallback";
};

const EXAMPLE_PROMPTS = [
  "2tの鉄骨をワイヤ2本・60°で吊りたい",
  "3tを目通し（絞り）で吊れるワイヤ径は？",
  "1.5tをあだ巻き2本4点で吊りたい",
  "深さ3mの溝、法面はどこまで立てられる？",
  "単管足場 建地1.8mで積載300kgは大丈夫？",
  "メッシュシート足場の風荷重を知りたい",
  "土止めの切ばりにかかる土圧と水圧は？",
  "あと施工アンカーの引抜き耐力を確認したい",
];

export function CalcAiOnebox() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/construction-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult((await res.json()) as RouteResponse);
    } catch {
      setError("接続できませんでした。下の一覧から計算機を直接選んでください。");
    } finally {
      setLoading(false);
    }
  };

  const matchedHref = (m: NonNullable<RouteResponse["matched"]>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(m.values)) qs.set(k, String(v));
    const q = qs.toString();
    return `/construction-calc/${m.slug}${q ? `?${q}` : ""}`;
  };

  return (
    <section
      aria-label="AIに相談して計算機を選ぶ"
      className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm dark:border-sky-800 dark:from-sky-950/40 dark:to-slate-900 sm:p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
        やりたいことを書くと、AIが計算機と入力値を用意します
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        計算はAIではなく、法令根拠つきの検証済み計算式が行います。読み取れない条件は質問でお返しします。
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        <label htmlFor="calc-ai-onebox" className="sr-only">
          計算したい内容（自由記述）
        </label>
        <input
          id="calc-ai-onebox"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={400}
          placeholder="例: 2tの鉄骨を2本のワイヤで60度で吊りたい"
          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          計算機を探す
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setText(p);
              void submit(p);
            }}
            className="inline-flex min-h-[44px] items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-sky-800 transition hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-800 dark:text-sky-300"
          >
            {p}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}

      {result && (
        <div aria-live="polite" className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{result.message}</p>
          {result.matched && (
            <>
              {Object.keys(result.matched.values).length > 0 && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  読み取った条件は計算機の画面に自動入力されます（開いてから修正できます）。
                </p>
              )}
              {result.matched.questions.length > 0 && (
                <ul className="mt-2 space-y-1" aria-label="確認が必要な条件">
                  {result.matched.questions.map((q) => (
                    <li
                      key={q}
                      className="flex items-start gap-1.5 text-xs leading-5 text-amber-800 dark:text-amber-300"
                    >
                      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {q}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={matchedHref(result.matched)}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
              >
                {result.matched.title.split("（")[0]}を開く
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}
          {result.candidates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.candidates.map((c) => (
                <Link
                  key={c.slug}
                  href={`/construction-calc/${c.slug}`}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                >
                  {c.title}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
