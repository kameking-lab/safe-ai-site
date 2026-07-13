"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, AlertTriangle, ArrowRight, Globe } from "lucide-react";
import { ALL_ACCIDENT_CATEGORIES, type AccidentWorkCategory } from "@/lib/types/domain";
import {
  ACC_LANGS,
  ACC_LANG_LABELS,
  accLabels,
  readStoredAccLang,
  storeAccLang,
  type AccLang,
} from "@/lib/accidents/accidents-labels";

/**
 * P0-1 事故AI注意喚起。業種・作業内容 → 過去事故事例（実データ）から類似ケースを抽出し、
 * Geminiで危険ポイント・再発防止策を要約（参考・免責）。AI未設定/失敗時は関連ケース一覧のみ表示。
 * 「みんなが専門家レベルで気軽に」を無料・登録不要で実現する中核機能。
 */
interface RelatedCase {
  id: string;
  title: string;
  type: string;
  severity: string;
  workCategory: string;
}

export function AccidentAiAnalyzer() {
  const [workContent, setWorkContent] = useState("");
  const [category, setCategory] = useState<AccidentWorkCategory | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [cases, setCases] = useState<RelatedCase[] | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [lang, setLang] = useState<AccLang>("ja");
  const L = accLabels(lang);

  useEffect(() => {
    setLang(readStoredAccLang());
  }, []);

  // P1-1: KY等からの ?work= / ?industry= プリフィル（初回のみ）。
  // C-1: useSearchParams は静的プリレンダーを Suspense フォールバックへ落とす
  // （/accidents 本文全体がクライアント差し替えになる）ため、マウント後に
  // window.location から読む。
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const w = searchParams.get("work");
    const ind = searchParams.get("industry");
    if (w) setWorkContent(w);
    if (ind && (ALL_ACCIDENT_CATEGORIES as readonly string[]).includes(ind)) {
      setCategory(ind as AccidentWorkCategory);
    }
  }, []);

  const onAnalyze = useCallback(async () => {
    if (!workContent.trim() && !category) {
      setError("作業内容を入力するか、業種を選んでください。");
      return;
    }
    setBusy(true);
    setError(null);
    setAdvice(null);
    setCases(null);
    setAiUnavailable(false);
    try {
      const res = await fetch("/api/accidents/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workContent: workContent.trim(), category }),
      });
      const data: unknown = await res.json();
      if (!res.ok || !(data as { ok?: boolean })?.ok) {
        setError("分析に失敗しました。時間をおいて再試行してください。");
        return;
      }
      const d = data as { advice: string | null; relatedCases: RelatedCase[]; source: string };
      setAdvice(d.advice);
      setCases(d.relatedCases);
      if (d.source !== "gemini") setAiUnavailable(true);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }, [workContent, category]);

  return (
    <section className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-rose-600" aria-hidden="true" />
          {L.aiTitle}
        </h2>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          <select
            value={lang}
            onChange={(e) => {
              const next = e.target.value as AccLang;
              setLang(next);
              storeAccLang(next);
            }}
            aria-label="表示言語 / Display language"
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {ACC_LANGS.map((l) => (
              <option key={l} value={l}>
                {ACC_LANG_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-600">{L.aiDesc}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AccidentWorkCategory | "")}
          aria-label="業種"
          className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">{L.industry}</option>
          {ALL_ACCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={workContent}
          onChange={(e) => setWorkContent(e.target.value)}
          placeholder={L.workContent}
          aria-label={L.workContent}
          className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      <button
        type="button"
        onClick={() => void onAnalyze()}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? L.analyzing : L.analyze}
      </button>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {advice && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-rose-700">{L.dangerPoints}</p>
          <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{advice}</div>
        </div>
      )}
      {aiUnavailable && cases && cases.length > 0 && (
        <p className="text-[11px] text-slate-500">※ AI要約は現在利用できないため、関連事例のみ表示しています。</p>
      )}

      {cases && cases.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1 text-xs font-semibold text-slate-700">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            {L.relatedCases}（{cases.length}）
          </p>
          <ul className="mt-2 space-y-1.5">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/accidents/${c.id}`}
                  className="flex min-h-[44px] items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2 hover:border-rose-300"
                >
                  <span className="flex-1 text-sm text-slate-800">
                    {c.title}
                    <span className="ml-1 text-[11px] text-slate-500">[{c.workCategory}/{c.type}/{c.severity}]</span>
                  </span>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {cases && cases.length === 0 && !error && (
        <p className="text-xs text-slate-500">{L.noCases}</p>
      )}
      <p className="text-[11px] text-slate-400">{L.disclaimer}</p>
    </section>
  );
}
