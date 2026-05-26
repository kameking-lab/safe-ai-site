"use client";

import { useCallback, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";

/**
 * P1-4 最近の労災トレンドAI要約（オンデマンド・コスト管理）。
 * 期間（1/3/12か月）を選び「AIで要約」→ 事例DBの集計＋Gemini要約（参考）を表示。
 * AI未設定/失敗時は集計データのみ表示。
 */
interface Bucket {
  label: string;
  count: number;
}
interface Trend {
  periodLabel: string;
  total: number;
  byType: Bucket[];
  byIndustry: Bucket[];
}

export function AccidentTrendSummary() {
  const [months, setMonths] = useState<"1" | "3" | "12">("12");
  const [busy, setBusy] = useState(false);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setSummary(null);
    setTrend(null);
    try {
      const res = await fetch(`/api/accidents/trend-summary?months=${months}`);
      const data: unknown = await res.json();
      if (!res.ok || !(data as { ok?: boolean })?.ok) {
        setError("トレンド取得に失敗しました。");
        return;
      }
      const d = data as { trend: Trend; summary: string | null };
      setTrend(d.trend);
      setSummary(d.summary);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }, [months]);

  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 space-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <TrendingUp className="h-5 w-5 text-amber-600" aria-hidden="true" />
        最近の労災トレンド（AI要約）
      </h2>
      <p className="text-xs text-slate-600">
        事例DBの集計から、最近どんな事故が多いかをAIが要約します（参考）。期間を選んで実行してください。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={months}
          onChange={(e) => setMonths(e.target.value as "1" | "3" | "12")}
          aria-label="集計期間"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="1">直近1か月</option>
          <option value="3">直近3か月</option>
          <option value="12">直近1年</option>
        </select>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          AIで要約
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {trend && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">
            {trend.periodLabel}の事例集計（サンプル {trend.total}件）
          </p>
          {trend.total === 0 ? (
            <p className="text-xs text-slate-500">この期間の事例サンプルがありません。期間を広げてお試しください。</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-600">事故型別（上位）</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                  {trend.byType.map((b) => (
                    <li key={b.label} className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span>{b.label}</span>
                      <span className="font-mono">{b.count}件</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">業種別（上位）</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                  {trend.byIndustry.map((b) => (
                    <li key={b.label} className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span>{b.label}</span>
                      <span className="font-mono">{b.count}件</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {summary && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
              {summary}
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            ※ 集計は本サイト事例DB（サンプル）の範囲です。確定統計は厚労省・e-Statの公式データをご確認ください。AI要約は参考情報です。
          </p>
        </div>
      )}
    </section>
  );
}
