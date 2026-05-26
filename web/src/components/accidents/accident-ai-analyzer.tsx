"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { ALL_ACCIDENT_CATEGORIES, type AccidentWorkCategory } from "@/lib/types/domain";

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
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Sparkles className="h-5 w-5 text-rose-600" aria-hidden="true" />
        AI事故注意喚起（作業内容から「起きやすい事故」を分析）
      </h2>
      <p className="text-xs text-slate-600">
        業種・作業内容を入れると、過去の労働災害事例から類似ケースを抽出し、危険ポイントと再発防止策をAIが要約します（参考）。
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AccidentWorkCategory | "")}
          aria-label="業種"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">業種を選択（任意）</option>
          {ALL_ACCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={workContent}
          onChange={(e) => setWorkContent(e.target.value)}
          placeholder="作業内容（例: 高所での外壁塗装、プレス機の金型交換）"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      <button
        type="button"
        onClick={() => void onAnalyze()}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        AIで分析する
      </button>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {advice && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-rose-700">AIによる危険ポイント・再発防止策（参考）</p>
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
            関連する過去の労働災害事例（{cases.length}）
          </p>
          <ul className="mt-2 space-y-1.5">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/accidents/${c.id}`}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2 hover:border-rose-300"
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
        <p className="text-xs text-slate-500">該当する事例が見つかりませんでした。別の作業内容・業種でお試しください。</p>
      )}
      <p className="text-[11px] text-slate-400">
        ※ AI出力は過去事例に基づく参考情報です。最終判断は公式情報・専門家の指導に従ってください。
      </p>
    </section>
  );
}
