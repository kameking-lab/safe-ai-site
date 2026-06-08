"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import {
  READINESS_QUESTIONS,
  assessReadiness,
  readinessGuidance,
} from "@/lib/mental-health-flow";

const VERDICT_META = {
  ready: {
    label: "実施可能",
    Icon: CheckCircle2,
    badgeClass: "bg-emerald-600",
    boxClass: "border-emerald-200 bg-emerald-50",
    textClass: "text-emerald-900",
  },
  partial: {
    label: "一部整備中",
    Icon: AlertTriangle,
    badgeClass: "bg-amber-500",
    boxClass: "border-amber-200 bg-amber-50",
    textClass: "text-amber-900",
  },
  early: {
    label: "準備が必要",
    Icon: AlertOctagon,
    badgeClass: "bg-rose-600",
    boxClass: "border-rose-200 bg-rose-50",
    textClass: "text-rose-900",
  },
} as const;

export function ReadinessForm() {
  const [headcount, setHeadcount] = useState<number>(50);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const assessment = useMemo(
    () => assessReadiness({ headcount, answers }),
    [headcount, answers],
  );

  const verdict = VERDICT_META[assessment.verdict];
  const VerdictIcon = verdict.Icon;

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="headcount"
          className="block text-sm font-semibold text-slate-900"
        >
          常時使用する労働者数
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="headcount"
            type="number"
            min={1}
            max={5000}
            value={headcount}
            onChange={(e) => {
              const v = Number(e.target.value);
              setHeadcount(Number.isFinite(v) && v > 0 ? Math.min(v, 5000) : 1);
            }}
            className="w-32 rounded border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-sm text-slate-700">人</span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              assessment.obligationTier === "mandatory"
                ? "bg-violet-100 text-violet-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {assessment.obligationTier === "mandatory"
              ? "義務（50人以上）"
              : "努力義務（50人未満）"}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          派遣労働者・パート等を含む、常時使用する労働者の人数を入力してください。
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {READINESS_QUESTIONS.map((q, idx) => {
          const v = answers[q.id];
          return (
            <li
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-baseline gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-slate-900">
                  {q.prompt}
                </p>
              </div>
              <p className="mt-1.5 ml-8 text-xs leading-5 text-slate-500">
                {q.helperText}
              </p>
              <div className="mt-3 ml-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: true })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    v === true
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                  }`}
                >
                  整っている
                </button>
                <button
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: false })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    v === false
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-rose-400"
                  }`}
                >
                  未整備
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div
        className={`mt-6 rounded-2xl border p-5 ${verdict.boxClass}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <VerdictIcon
            className={`mt-0.5 h-6 w-6 shrink-0 ${verdict.textClass}`}
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <p className={`text-base font-bold ${verdict.textClass}`}>
                判定：{verdict.label}
              </p>
              <span
                className={`inline-block rounded-full ${verdict.badgeClass} px-3 py-0.5 text-[11px] font-semibold text-white`}
              >
                整備率 {assessment.yesCount}/{assessment.totalQuestions}（
                {Math.round(assessment.readinessRatio * 100)}%）
              </span>
            </div>
            <p className={`mt-2 text-sm leading-6 ${verdict.textClass}`}>
              {readinessGuidance(assessment.verdict, assessment.obligationTier)}
            </p>
          </div>
        </div>
        {assessment.gaps.length > 0 && (
          <div className="mt-4">
            <p className={`text-xs font-semibold ${verdict.textClass}`}>
              優先整備項目
            </p>
            <ul className={`mt-2 space-y-1 text-xs leading-5 ${verdict.textClass}`}>
              {assessment.gaps.map((g) => (
                <li key={g.id} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                  {g.prompt}
                </li>
              ))}
            </ul>
            <a
              href="#procedure"
              className={`mt-4 inline-flex items-center gap-1 rounded-lg border border-current/30 bg-white/70 px-3 py-1.5 text-xs font-semibold ${verdict.textClass} hover:bg-white`}
            >
              次にやること：実施手順で進め方を確認する →
            </a>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        ※ 本判定はベースライン7項目に基づく簡易自己評価です。実際の制度運用は安衛則 第52条の9〜21 を直接確認のうえ、衛生委員会で審議してください。
      </p>
    </div>
  );
}
