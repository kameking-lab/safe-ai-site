"use client";

import { useMemo, useState } from "react";
import {
  READINESS_QUESTIONS,
  assessReadiness,
} from "@/lib/mental-health-flow";
import { readinessConclusion } from "@/lib/mental-health/readiness-visual";
import { SAFETY_TONE } from "@/lib/design/safety-tone";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";

export function ReadinessForm() {
  const [headcount, setHeadcount] = useState<number>(50);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const assessment = useMemo(
    () => assessReadiness({ headcount, answers }),
    [headcount, answers],
  );
  const answeredCount = useMemo(
    () =>
      READINESS_QUESTIONS.filter((q) => typeof answers[q.id] === "boolean")
        .length,
    [answers],
  );
  const conclusion = readinessConclusion(assessment, answeredCount);
  const tone = SAFETY_TONE[conclusion.tone];

  return (
    <div>
      {/* 結論ファースト: 回答のこり（青）→ 全問回答で整備率%の判定色 */}
      <ConclusionCard
        tone={conclusion.tone}
        value={conclusion.value}
        unit={conclusion.unit}
        title={conclusion.title}
        description={conclusion.description}
        action={
          conclusion.settled
            ? { href: "#procedure", label: "実施手順へ" }
            : { href: "#readiness-questions", label: "診断に答える" }
        }
      >
        <StatusBadge
          tone={assessment.obligationTier === "mandatory" ? "info" : "neutral"}
        >
          {assessment.obligationTier === "mandatory"
            ? "義務（50人以上）"
            : "努力義務（50人未満）"}
        </StatusBadge>
        {conclusion.settled && (
          <StatusBadge tone={conclusion.tone}>
            整備 {assessment.yesCount}/{assessment.totalQuestions} 項目
          </StatusBadge>
        )}
      </ConclusionCard>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
        </div>
        <p className="mt-2 text-xs text-slate-500">
          派遣労働者・パート等を含む、常時使用する労働者の人数を入力してください。
        </p>
      </div>

      <ol id="readiness-questions" className="mt-4 scroll-mt-4 space-y-3">
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
                  className={`min-h-[44px] rounded-lg border px-4 py-1.5 text-xs font-semibold transition ${
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
                  className={`min-h-[44px] rounded-lg border px-4 py-1.5 text-xs font-semibold transition ${
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

      {/* 詳細: 判定の内訳（色は結論カードと同じトーン＝単一ソース） */}
      <div
        className={`mt-6 rounded-2xl border-2 p-5 ${tone.soft}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-base font-bold">
            判定：{conclusion.title}
          </p>
          <span
            className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold ${tone.solid}`}
          >
            整備率 {assessment.yesCount}/{assessment.totalQuestions}（
            {Math.round(assessment.readinessRatio * 100)}%）
          </span>
        </div>
        <p className="mt-2 text-sm leading-6">{conclusion.description}</p>
        {conclusion.settled && assessment.gaps.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold">優先整備項目</p>
            <ul className="mt-2 space-y-1 text-xs leading-5">
              {assessment.gaps.map((g) => (
                <li key={g.id} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                  {g.prompt}
                </li>
              ))}
            </ul>
            <a
              href="#procedure"
              className="mt-4 inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-current/30 bg-white/70 px-3 py-1.5 text-xs font-semibold hover:bg-white"
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
