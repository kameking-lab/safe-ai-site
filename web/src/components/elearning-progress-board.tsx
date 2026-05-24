"use client";

/**
 * P0-014 (usability-audit-day3-2026-05-24):
 * Eラーニング「あなたの進捗」ボード。
 *
 * 受講履歴がゼロの初回ユーザーには何も表示しない (邪魔せず)。
 * 履歴があれば、合計テーマ数 / 完了 / 進行中 / 正答率 と直近5テーマの
 * カードを表示する。
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, GraduationCap } from "lucide-react";
import {
  buildProgressSummary,
  loadProgressList,
  type ProgressSummary,
  type ThemeProgress,
} from "@/lib/elearning/progress";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export function ElearningProgressBoard() {
  const [list, setList] = useState<ThemeProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const records = loadProgressList();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage は外部システム、初回マウントでの hydration として setState は正当
    setList(records);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(buildProgressSummary(records));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  if (!hydrated) return null;
  if (list.length === 0 || !summary) return null;

  const correctRate =
    summary.totalQuestions > 0
      ? Math.round((summary.totalCorrect / summary.totalQuestions) * 100)
      : 0;

  return (
    <section
      aria-labelledby="elearning-progress-heading"
      className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <GraduationCap className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        <h2
          id="elearning-progress-heading"
          className="text-base font-bold text-slate-900"
        >
          あなたの進捗
        </h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          端末内のみ保存
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryStat label="受講テーマ" value={summary.totalThemes} unit="件" />
        <SummaryStat
          label="完了 (全問正答)"
          value={summary.completedThemes}
          unit="件"
          tone="emerald"
        />
        <SummaryStat
          label="進行中"
          value={summary.inProgressThemes}
          unit="件"
          tone="amber"
        />
        <SummaryStat label="正答率" value={correctRate} unit="%" tone="sky" />
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-600">直近の受講</p>
      <ul className="mt-2 space-y-1.5">
        {list.slice(0, 5).map((r) => {
          const isComplete =
            r.correctCount === r.totalQuestions && r.totalQuestions > 0;
          return (
            <li
              key={r.themeId}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                isComplete
                  ? "border-emerald-200 bg-white text-emerald-900"
                  : "border-amber-200 bg-white text-amber-900"
              }`}
            >
              <span className="flex flex-1 items-center gap-1.5 truncate">
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                )}
                <span className="font-semibold truncate">{r.themeTitle}</span>
              </span>
              <span className="shrink-0 text-[11px] text-slate-600">
                {r.correctCount}/{r.totalQuestions}
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {formatDate(r.lastAttemptedAt)}
              </span>
            </li>
          );
        })}
      </ul>

      {summary.inProgressThemes > 0 && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
          💡 進行中のテーマ {summary.inProgressThemes} 件あります。間違えた問題を再表示して全問正答を目指せます。
        </p>
      )}
    </section>
  );
}

function SummaryStat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  tone?: "emerald" | "amber" | "sky";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-800"
      : tone === "amber"
        ? "text-amber-800"
        : tone === "sky"
          ? "text-sky-800"
          : "text-slate-800";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${toneClass}`}>
        {value}
        <span className="ml-0.5 text-[11px] font-normal">{unit}</span>
      </p>
    </div>
  );
}
