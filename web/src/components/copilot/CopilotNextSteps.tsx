"use client";

/**
 * Inline panel that surfaces the next 1-2 logical steps based on the current
 * feature and the user's accumulated SafetyContext. Rendered at the end of
 * each flagship feature.
 */
import Link from "next/link";
import { ArrowRight, Database, ListChecks, MessageSquare } from "lucide-react";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import type { CopilotStepId } from "@/lib/copilot/types";
import { INDUSTRY_LABELS_JA, type IndustrySlug } from "@/lib/industry-slugs";

interface CopilotNextStepsProps {
  current: CopilotStepId;
  /** Hard override of inferred industry — useful on industry-detail pages. */
  industry?: IndustrySlug;
  /** Free-form preface like "建設業の墜落についての回答を踏まえ：" */
  intro?: string;
  /** Optional extra CTA appended to the list (e.g. "この内容を計画に反映"). */
  extraCta?: {
    label: string;
    href: string;
    description: string;
  };
}

interface NextCard {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "rose" | "violet" | "blue";
}

const TONE_CLASS: Record<NextCard["tone"], string> = {
  emerald:
    "border-emerald-300 bg-emerald-50/60 hover:border-emerald-400 dark:border-emerald-700 dark:bg-emerald-950/40",
  rose: "border-rose-300 bg-rose-50/70 hover:border-rose-400 dark:border-rose-700 dark:bg-rose-950/40",
  violet:
    "border-violet-300 bg-violet-50/70 hover:border-violet-400 dark:border-violet-700 dark:bg-violet-950/40",
  blue: "border-blue-300 bg-blue-50/70 hover:border-blue-400 dark:border-blue-700 dark:bg-blue-950/40",
};

export function CopilotNextSteps({ current, industry, intro, extraCta }: CopilotNextStepsProps) {
  const copilot = useOptionalCopilot();
  const slug = industry ?? copilot?.state.industry;
  const lbl = slug ? INDUSTRY_LABELS_JA[slug] : undefined;
  const concerns = copilot?.state.keyConcerns ?? [];
  const focusParam = concerns.length > 0 ? `&focus=${encodeURIComponent(concerns[0])}` : "";

  const cards: NextCard[] = [];

  if (current !== "accidents-reports") {
    cards.push({
      id: "to-reports",
      label: lbl
        ? `${lbl}の労働災害分析レポートを見る`
        : "業種別の労働災害分析レポートを見る",
      description: lbl
        ? `${lbl}で多発する事故型・原因 Top10・推奨対策チェックリストを確認します。`
        : "5業種の事故型・原因・推奨対策を一覧化。質問の参考データとして利用できます。",
      href: slug ? `/accidents-reports/${slug}` : "/accidents-reports",
      icon: Database,
      tone: "rose",
    });
  }

  if (current !== "plan-generator") {
    const queryParts: string[] = [];
    if (slug) queryParts.push(`industry=${slug}`);
    if (concerns[0]) queryParts.push(`focus=${encodeURIComponent(concerns[0])}`);
    const href = queryParts.length > 0 ? `/strategy/plan-generator?${queryParts.join("&")}` : "/strategy/plan-generator";
    cards.push({
      id: "to-plan",
      label: lbl
        ? `${lbl}の年次安全衛生計画を作成する`
        : "年次安全衛生計画を作成する",
      description: lbl
        ? `${lbl}向けテンプレートに、ここでの内容を反映した年次計画を自動生成します。`
        : "10業種×3規模の30テンプレートから基本方針・重点目標・月別スケジュールを生成。",
      href,
      icon: ListChecks,
      tone: "violet",
    });
  }

  if (current !== "chatbot") {
    const seed = concerns[0] ?? lbl;
    const q = seed ? `?q=${encodeURIComponent(`${lbl ?? ""}${seed ? ` ${seed}` : ""}の安全対策と関連法令`.trim())}` : "";
    cards.push({
      id: "to-chatbot",
      label: lbl
        ? `${lbl}の関連法令を安衛法AIで深掘りする`
        : "関連法令を安衛法AIで深掘りする",
      description: "33法令以上を根拠条文付きでAIが回答。具体的な選任要件・特別教育・健診を確認できます。",
      href: `/chatbot${q}`,
      icon: MessageSquare,
      tone: "blue",
    });
  }

  if (extraCta) {
    cards.push({
      id: "extra",
      label: extraCta.label,
      description: extraCta.description,
      href: extraCta.href,
      icon: ArrowRight,
      tone: "emerald",
    });
  }

  const headlineExtras: string[] = [];
  if (lbl) headlineExtras.push(lbl);
  if (concerns.length > 0) headlineExtras.push(concerns.slice(0, 2).join("・"));

  return (
    <section
      aria-labelledby="copilot-next-steps-heading"
      className="mt-8 rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5 dark:border-emerald-700 dark:from-emerald-950/40 dark:to-slate-950"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="copilot-next-steps-heading"
          className="text-base font-bold text-emerald-900 dark:text-emerald-200"
        >
          安全Copilot：次のステップ
        </h2>
        {headlineExtras.length > 0 && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            引き継ぎ中：
            {headlineExtras.map((x, i) => (
              <span key={i} className="ml-1 rounded-full bg-white px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {x}
              </span>
            ))}
          </p>
        )}
      </div>
      {intro && (
        <p className="mb-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{intro}</p>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.id}
              href={c.href}
              className={`group flex items-start gap-3 rounded-lg border-2 p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${TONE_CLASS[c.tone]}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                  {c.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                  {c.description}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
      {/* Discoverability footer for users who haven't visited a step yet */}
      {focusParam && (
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">
          ※ 重点関心事項「{concerns[0]}」が引き継がれます。
        </p>
      )}
    </section>
  );
}
