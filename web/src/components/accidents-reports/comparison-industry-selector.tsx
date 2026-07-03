"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import type { IndustrySlug } from "@/lib/industry-slugs";

const MIN_COMPARE_INDUSTRIES = 2;
const MAX_COMPARE_INDUSTRIES = 5;

type Option = {
  slug: IndustrySlug;
  label: string;
  icon: string;
  colorClass: string;
};

const COLOR_BORDER: Record<string, string> = {
  amber: "ring-amber-500 bg-amber-50 border-amber-400 text-amber-900",
  blue: "ring-blue-500 bg-blue-50 border-blue-400 text-blue-900",
  emerald: "ring-emerald-500 bg-emerald-50 border-emerald-400 text-emerald-900",
  rose: "ring-rose-500 bg-rose-50 border-rose-400 text-rose-900",
  violet: "ring-violet-500 bg-violet-50 border-violet-400 text-violet-900",
};

/**
 * Multi-select industry chips that drive the ?industries= URL parameter.
 *
 * UX rules:
 *  - Range enforced at MIN (2) and MAX (5) — clicks that would break the
 *    range are no-ops with a tooltip message.
 *  - URL is the source of truth. We push() to the router on Apply so the
 *    server component re-renders with fresh data. (Live-update on every
 *    click would re-aggregate the 5,000-case dataset per toggle.)
 *  - The "Apply" button is only enabled when the selection differs from
 *    the URL state, so accidental double-clicks are cheap.
 */
export function ComparisonIndustrySelector({
  options,
  selected,
}: {
  options: Option[];
  selected: IndustrySlug[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<IndustrySlug[]>(selected);
  const [isPending, startTransition] = useTransition();

  const selectedSet = useMemo(() => new Set(draft), [draft]);
  const sortedDraft = useMemo(() => [...draft].sort().join(","), [draft]);
  const sortedSelected = useMemo(
    () => [...selected].sort().join(","),
    [selected],
  );
  const changed = sortedDraft !== sortedSelected;
  const tooFew = draft.length < MIN_COMPARE_INDUSTRIES;

  const toggle = useCallback(
    (slug: IndustrySlug) => {
      setDraft((current) => {
        if (current.includes(slug)) {
          if (current.length <= MIN_COMPARE_INDUSTRIES) return current;
          return current.filter((s) => s !== slug);
        }
        if (current.length >= MAX_COMPARE_INDUSTRIES) return current;
        return [...current, slug];
      });
    },
    [],
  );

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("industries", draft.join(","));
    startTransition(() => {
      router.push(`/accidents-reports/compare?${params.toString()}`);
    });
  }, [draft, router, searchParams]);

  const reset = useCallback(() => {
    setDraft(selected);
  }, [selected]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          比較する業種を選ぶ ({MIN_COMPARE_INDUSTRIES}〜{MAX_COMPARE_INDUSTRIES}業種)
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          現在: <span className="font-semibold tabular-nums">{draft.length}</span> 業種
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="業種選択">
        {options.map((opt) => {
          const active = selectedSet.has(opt.slug);
          const willHitMax =
            !active && draft.length >= MAX_COMPARE_INDUSTRIES;
          const willHitMin =
            active && draft.length <= MIN_COMPARE_INDUSTRIES;
          const cls = COLOR_BORDER[opt.colorClass] ?? COLOR_BORDER.blue;
          return (
            <li key={opt.slug}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(opt.slug)}
                disabled={willHitMax || willHitMin}
                title={
                  willHitMax
                    ? `最大 ${MAX_COMPARE_INDUSTRIES} 業種までです`
                    : willHitMin
                      ? `最低 ${MIN_COMPARE_INDUSTRIES} 業種が必要です`
                      : undefined
                }
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${
                  active
                    ? cls
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                } ${willHitMax || willHitMin ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <span aria-hidden="true">{opt.icon}</span>
                <span>{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {changed && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            選択を戻す
          </button>
        )}
        <button
          type="button"
          onClick={apply}
          disabled={!changed || tooFew || isPending}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {isPending ? "更新中…" : "比較を更新"}
        </button>
      </div>
    </div>
  );
}
