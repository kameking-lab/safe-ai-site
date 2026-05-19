"use client";

/**
 * Compact horizontal "memory" chip strip rendered above the chatbot input
 * (or any feature that wants to surface what the Copilot has remembered so
 * far). Lets the user clear or trust the running context.
 */
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import { INDUSTRY_LABELS_JA } from "@/lib/industry-slugs";

interface CopilotMemoProps {
  /** When true, render even if the memo is empty (with an empty hint). */
  showWhenEmpty?: boolean;
  className?: string;
}

export function CopilotMemo({ showWhenEmpty = false, className = "" }: CopilotMemoProps) {
  const copilot = useOptionalCopilot();
  if (!copilot) return null;
  const { state, hydrated, reset } = copilot;

  if (!hydrated) return null;

  const industryLabel = state.industry ? INDUSTRY_LABELS_JA[state.industry] : null;
  const hasAny =
    industryLabel != null ||
    (state.keyConcerns?.length ?? 0) > 0 ||
    state.activePlan != null;

  if (!hasAny && !showWhenEmpty) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 ${className}`}
    >
      <span className="font-bold uppercase tracking-widest text-[10px] text-emerald-700 dark:text-emerald-300">
        Copilot記憶
      </span>
      {industryLabel && (
        <span className="rounded-full bg-white px-2 py-0.5 font-bold text-emerald-800 shadow-sm dark:bg-emerald-900 dark:text-emerald-100">
          業種: {industryLabel}
        </span>
      )}
      {state.keyConcerns.slice(0, 3).map((c) => (
        <span
          key={c}
          className="rounded-full bg-white px-2 py-0.5 text-emerald-700 shadow-sm dark:bg-emerald-900 dark:text-emerald-200"
        >
          関心: {c}
        </span>
      ))}
      {state.activePlan?.href && (
        <a
          href={state.activePlan.href}
          className="rounded-full border border-violet-300 bg-white px-2 py-0.5 font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"
        >
          計画書を再表示
        </a>
      )}
      {!hasAny && (
        <span className="text-emerald-700 dark:text-emerald-300">
          まだ情報なし。質問や業種の選択で自動的に蓄積されます。
        </span>
      )}
      {hasAny && (
        <button
          type="button"
          onClick={reset}
          className="ml-auto rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
        >
          リセット
        </button>
      )}
    </div>
  );
}
