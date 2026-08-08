"use client";

import { useEffect, useState } from "react";
import { Award, RotateCcw, ShieldCheck } from "lucide-react";
import {
  EMPTY_VISUAL_KY_PROGRESS,
  readVisualKyProgress,
  resetVisualKyProgress,
  VISUAL_KY_BADGES,
  type VisualKyProgress,
} from "@/lib/visual-ky/progress";

export function VisualKyLocalProgressPanel({
  totalScenarios,
}: {
  totalScenarios: number;
}) {
  const [progress, setProgress] = useState<VisualKyProgress>(
    EMPTY_VISUAL_KY_PROGRESS,
  );
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const result = readVisualKyProgress();
      setProgress(result.progress);
      setStorageAvailable(result.available);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handleReset() {
    const removed = resetVisualKyProgress();
    setProgress({ ...EMPTY_VISUAL_KY_PROGRESS });
    setStorageAvailable(removed);
    setStatus(
      removed
        ? "この端末のビジュアルKYT進捗を削除しました。"
        : "保存機能が使えないため、削除する端末内進捗はありません。",
    );
  }

  return (
    <section
      aria-labelledby="visual-ky-progress-heading"
      className="rounded-3xl border border-teal-200 bg-white p-5 shadow-sm dark:border-teal-900 dark:bg-slate-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black tracking-[0.16em] text-teal-800 uppercase dark:text-teal-300">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            この端末だけ
          </p>
          <h2
            id="visual-ky-progress-heading"
            className="mt-2 text-xl font-black text-slate-950 dark:text-white"
          >
            個人学習の進捗
          </h2>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:border-rose-400 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          端末の進捗を削除
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-teal-50 p-4 dark:bg-teal-950/40">
          <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
            完了
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {progress.completedScenarioIds.length}
            <span className="ml-1 text-sm font-bold text-slate-600 dark:text-slate-300">
              / {totalScenarios}問
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
            連続利用
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {progress.streakDays}
            <span className="ml-1 text-sm font-bold text-slate-600 dark:text-slate-300">
              日
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/40">
          <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
            学習バッジ
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {progress.badgeIds.length}
            <span className="ml-1 text-sm font-bold text-slate-600 dark:text-slate-300">
              個
            </span>
          </p>
        </div>
      </div>

      {progress.badgeIds.length > 0 ? (
        <ul
          aria-label="獲得した学習バッジ"
          className="mt-4 flex flex-wrap gap-2"
        >
          {progress.badgeIds.map((id) => {
            const badge = Object.values(VISUAL_KY_BADGES).find(
              (candidate) => candidate.id === id,
            );
            if (!badge) return null;
            return (
              <li
                key={id}
                title={badge.description}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-950 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100"
              >
                <Award className="h-4 w-4" aria-hidden="true" />
                {badge.label}
              </li>
            );
          })}
        </ul>
      ) : null}

      {status || !storageAvailable ? (
        <p
          className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          {status || "このブラウザーでは進捗を保存できません。"}
        </p>
      ) : null}
    </section>
  );
}
