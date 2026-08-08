"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, AlertTriangle, ArrowRight, Globe } from "lucide-react";
import { ALL_ACCIDENT_CATEGORIES, type AccidentWorkCategory } from "@/lib/types/domain";
import {
  ACC_LANGS,
  ACC_LANG_LABELS,
  accLabels,
  readStoredAccLang,
  storeAccLang,
  type AccLang,
} from "@/lib/accidents/accidents-labels";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

/** 業種・作業内容から、運用証拠に使用できる事故参考事例だけを検索する。 */
interface RelatedCase {
  id: string;
  title: string;
  type: string;
  severity: string;
  workCategory: string;
  provenance: "mhlw" | "curated";
  provenanceLabel: string;
  humanConfirmationRequired: true;
}

export function AccidentAiAnalyzer() {
  const [workContent, setWorkContent] = useState("");
  const [category, setCategory] = useState<AccidentWorkCategory | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<RelatedCase[] | null>(null);
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
    const safety = evaluateChatbotSafety(workContent);
    if (safety) {
      setCases(null);
      setError(safety.response);
      return;
    }
    if (!workContent.trim() && !category) {
      setError("作業内容を入力するか、業種を選んでください。");
      return;
    }
    setBusy(true);
    setError(null);
    setCases(null);
    try {
      const res = await fetch("/api/accidents/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workContent: workContent.trim(), category }),
      });
      const data: unknown = await res.json();
      if (!res.ok || !(data as { ok?: boolean })?.ok) {
        setError(
          typeof (data as { message?: unknown })?.message === "string"
            ? (data as { message: string }).message
            : "分析に失敗しました。時間をおいて再試行してください。",
        );
        return;
      }
      const d = data as { relatedCases: RelatedCase[] };
      setCases(d.relatedCases);
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
          <Search className="h-5 w-5 text-rose-600" aria-hidden="true" />
          出典区分付き類似事例検索
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
      <p className="text-xs text-slate-600">
        業種と作業内容から公開済みの事故参考事例を検索します。AIによる危険ポイント・対策の生成は行いません。
      </p>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        類似検索には、厚生労働省公開事例の再収録または編集済み事例だけを使います。
        架空の学習例・速報に基づく想定例は除外しています。
      </p>

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
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {busy ? "検索中…" : "類似事例を検索"}
      </button>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {cases && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950">
          生成助言は主張単位の根拠確認ができないため停止中です。関連事例をKY・教育資料へ移す前に、元資料と自現場への適用可能性を人が確認してください。
        </p>
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
                    <span className="mt-1 block text-[11px] font-semibold text-indigo-800">
                      出典区分: {c.provenanceLabel}／人間確認が必要
                    </span>
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
      <p className="text-[11px] leading-5 text-slate-600">
        検索結果は事例標本への案内です。発生率や対策の適合性を示すものではありません。最終判断では一次資料と自現場の条件を確認してください。
      </p>
    </section>
  );
}
