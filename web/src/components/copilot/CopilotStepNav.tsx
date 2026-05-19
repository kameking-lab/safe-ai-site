"use client";

/**
 * Three-step indicator surfaced on each flagship feature. Renders the
 * journey "質問 → 事故確認 → 計画作成" and reflects whether the user
 * has already touched each step plus their current position.
 */
import Link from "next/link";
import { Check, MessageSquare, Database, ListChecks, ArrowRight } from "lucide-react";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import type { CopilotStepId } from "@/lib/copilot/types";

interface StepDef {
  id: CopilotStepId;
  label: string;
  caption: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  {
    id: "chatbot",
    label: "1. 質問する",
    caption: "安衛法AIで疑問を解消",
    href: "/chatbot",
    icon: MessageSquare,
  },
  {
    id: "accidents-reports",
    label: "2. 事故傾向を確認",
    caption: "業種別の労働災害分析",
    href: "/accidents-reports",
    icon: Database,
  },
  {
    id: "plan-generator",
    label: "3. 年次計画を作成",
    caption: "業種×規模で30テンプレ",
    href: "/strategy/plan-generator",
    icon: ListChecks,
  },
];

interface CopilotStepNavProps {
  current: CopilotStepId;
  /** Optional industry override for deep-link destinations */
  industry?: string;
  className?: string;
}

export function CopilotStepNav({ current, industry, className = "" }: CopilotStepNavProps) {
  const copilot = useOptionalCopilot();
  const effectiveIndustry = industry ?? copilot?.state.industry;

  const completed: Record<CopilotStepId, boolean> = {
    chatbot: Boolean(copilot?.state.progress.visitedChatbot),
    "accidents-reports": Boolean(copilot?.state.progress.visitedAccidentsReports),
    "plan-generator": Boolean(copilot?.state.progress.generatedPlan),
  };

  const buildHref = (step: StepDef) => {
    if (!effectiveIndustry) return step.href;
    if (step.id === "accidents-reports") return `/accidents-reports/${effectiveIndustry}`;
    if (step.id === "plan-generator") return `/strategy/plan-generator?industry=${effectiveIndustry}`;
    return step.href;
  };

  return (
    <nav
      aria-label="安全Copilot 3ステップ"
      className={`rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-3 sm:p-4 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-slate-950 ${className}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          安全Copilot
        </p>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          メイン3機能を連続して使うと、業種・関心事項が自動で引き継がれます
        </span>
      </div>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        {STEPS.map((step, idx) => {
          const isCurrent = step.id === current;
          const isDone = completed[step.id];
          const Icon = step.icon;
          const href = buildHref(step);
          const stateClass = isCurrent
            ? "border-emerald-500 bg-white ring-2 ring-emerald-200 dark:border-emerald-400 dark:bg-slate-900 dark:ring-emerald-700/40"
            : isDone
              ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/40"
              : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";

          const Inner = (
            <span
              className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 transition ${stateClass} ${
                isCurrent ? "" : "hover:border-emerald-400 hover:shadow-sm"
              }`}
            >
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? "bg-emerald-600 text-white"
                    : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
                aria-hidden="true"
              >
                {isDone && !isCurrent ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                  {step.label}
                  {isCurrent && (
                    <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      現在
                    </span>
                  )}
                </span>
                <span className="block text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                  {step.caption}
                </span>
              </span>
            </span>
          );

          return (
            <li key={step.id} className="flex flex-1 items-center gap-2 sm:gap-0">
              {isCurrent ? (
                <span className="block w-full" aria-current="step">
                  {Inner}
                </span>
              ) : (
                <Link
                  href={href}
                  className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-lg"
                >
                  {Inner}
                </Link>
              )}
              {idx < STEPS.length - 1 && (
                <ArrowRight
                  className="hidden h-4 w-4 shrink-0 text-emerald-400 sm:block dark:text-emerald-600"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
