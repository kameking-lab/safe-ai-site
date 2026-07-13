"use client";

/**
 * Client-side filter for the /accidents-reports hub.
 *
 * State source-of-truth is the URL (q, type, month). We mirror that to
 * local state for input responsiveness, then router.replace() with
 * scroll: false on change so back/forward and shareable URLs work.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, Search, X, ClipboardList, MessageSquare } from "lucide-react";
import type { AllIndustriesSummary } from "@/lib/accident-analysis";
import { SLUG_TO_SAFETY_PLAN, type IndustrySlug } from "@/lib/industry-slugs";
import {
  ACCIDENT_TYPE_LABELS,
  describeActiveFilters,
  filterIndustries,
  parseAccidentTypeFilter,
  parseMonthFilter,
  type AccidentTypeFilter,
  type HubFilterState,
} from "@/lib/accidents-reports-filter";

const COLOR_CLASS: Record<string, { card: string; pill: string }> = {
  amber: { card: "border-amber-200 hover:border-amber-400 bg-amber-50/40", pill: "bg-amber-100 text-amber-900" },
  blue: { card: "border-blue-200 hover:border-blue-400 bg-blue-50/40", pill: "bg-blue-100 text-blue-900" },
  emerald: { card: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/40", pill: "bg-emerald-100 text-emerald-900" },
  rose: { card: "border-rose-200 hover:border-rose-400 bg-rose-50/40", pill: "bg-rose-100 text-rose-900" },
  violet: { card: "border-violet-200 hover:border-violet-400 bg-violet-50/40", pill: "bg-violet-100 text-violet-900" },
};

const TYPE_CHOICES: AccidentTypeFilter[] = ["all", "fall", "caught", "trip", "shock", "other"];

const MONTH_CHOICES = Array.from({ length: 12 }, (_, i) => i + 1);

function num(n: number) {
  return n.toLocaleString("ja-JP");
}

export function HubFilter({
  industries,
  yearRange,
}: {
  industries: AllIndustriesSummary["industries"];
  yearRange?: AllIndustriesSummary["yearRange"];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const initial = useMemo<HubFilterState>(
    () => ({
      q: searchParams.get("q") ?? "",
      type: parseAccidentTypeFilter(searchParams.get("type")),
      month: parseMonthFilter(searchParams.get("month")),
    }),
    [searchParams],
  );

  const [qDraft, setQDraft] = useState<string>(initial.q);
  const [typeDraft, setTypeDraft] = useState<AccidentTypeFilter>(initial.type);
  const [monthDraft, setMonthDraft] = useState<number>(initial.month);

  // Keep local state in sync if the URL changes from outside (e.g. browser
  // back/forward). Codebase pattern: see accident-extras-panel.tsx for the
  // same URL-sync style. React only commits when a value actually changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQDraft(initial.q);
    setTypeDraft(initial.type);
    setMonthDraft(initial.month);
  }, [initial.q, initial.type, initial.month]);

  const syncUrl = useCallback(
    (next: HubFilterState) => {
      const params = new URLSearchParams();
      if (next.q.trim()) params.set("q", next.q.trim());
      if (next.type !== "all") params.set("type", next.type);
      if (next.month !== 0) params.set("month", String(next.month));
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `/accidents-reports?${query}` : "/accidents-reports", { scroll: false });
      });
    },
    [router],
  );

  // Debounce text input so typing doesn't push a URL update on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (qDraft !== initial.q) {
        syncUrl({ q: qDraft, type: typeDraft, month: monthDraft });
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [qDraft, initial.q, typeDraft, monthDraft, syncUrl]);

  const handleTypeChange = useCallback(
    (value: AccidentTypeFilter) => {
      setTypeDraft(value);
      syncUrl({ q: qDraft, type: value, month: monthDraft });
    },
    [qDraft, monthDraft, syncUrl],
  );

  const handleMonthChange = useCallback(
    (value: number) => {
      setMonthDraft(value);
      syncUrl({ q: qDraft, type: typeDraft, month: value });
    },
    [qDraft, typeDraft, syncUrl],
  );

  const reset = useCallback(() => {
    setQDraft("");
    setTypeDraft("all");
    setMonthDraft(0);
    syncUrl({ q: "", type: "all", month: 0 });
  }, [syncUrl]);

  const filterState: HubFilterState = {
    q: qDraft,
    type: typeDraft,
    month: monthDraft,
  };
  const filtered = filterIndustries(industries, filterState);
  const activeDescriptors = describeActiveFilters(filterState);
  const isFiltered = activeDescriptors.length > 0;

  return (
    <div>
      {/* Filter UI */}
      <div
        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        role="region"
        aria-label="業種レポートのフィルタ"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            キーワード検索
            <span className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                placeholder="例: 足場、墜落、フォークリフト"
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-7 pr-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                aria-label="事故内容・原因キーワード"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            事故型
            <select
              value={typeDraft}
              onChange={(e) => handleTypeChange(e.target.value as AccidentTypeFilter)}
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="事故型フィルタ"
            >
              {TYPE_CHOICES.map((c) => (
                <option key={c} value={c}>
                  {ACCIDENT_TYPE_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            ピーク月
            <select
              value={monthDraft}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="月別フィルタ（ピーク月）"
            >
              <option value={0}>全月</option>
              {MONTH_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </label>
        </div>

        {isFiltered ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">フィルタ適用中:</span>{" "}
              {activeDescriptors.join(" / ")}
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              フィルタを解除
            </button>
            <p className="ml-auto text-[11px] text-slate-500 dark:text-slate-400" aria-live="polite">
              該当 {filtered.length} 業種 / 全 {industries.length} 業種
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            キーワード・事故型・月で 5 業種を絞り込めます。条件はURLに反映され、共有・ブックマークできます。
          </p>
        )}
      </div>

      {/* Filtered industry card grid */}
      {filtered.length === 0 ? (
        <div
          className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900"
          role="status"
        >
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
            条件に合致する業種レポートはありません
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            キーワード・事故型・月を変更するか、「フィルタを解除」で全 5 業種を再表示してください。
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            フィルタを解除
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => {
            const cls = COLOR_CLASS[it.colorClass] ?? COLOR_CLASS.blue;
            return (
              <div
                key={it.slug}
                className={`flex flex-col rounded-xl border-2 p-4 transition hover:shadow-md ${cls.card}`}
              >
                <Link
                  href={`/accidents-reports/${it.slug}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label={`${it.label}の労働災害分析レポートを開く`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden="true">
                      {it.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{it.label}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{it.tagline}</p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
                      aria-hidden="true"
                    />
                  </div>
                  {/* P1-C: 単位を明示。「2007〜2026累計」を太字で示し、死亡が
                      他業種と桁違いに少ない理由（データ源の偏り）も補足する。 */}
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
                      <dt className="text-[10px] text-slate-500 dark:text-slate-400">事例（件）</dt>
                      <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {num(it.total)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
                      <dt className="text-[10px] text-slate-500 dark:text-slate-400">うち死亡（人）</dt>
                      <dd className="text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                        {num(it.fatal)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
                      <dt className="text-[10px] text-slate-500 dark:text-slate-400">最多事故型</dt>
                      <dd className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200" title={it.topType ?? ""}>
                        {it.topType ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  {yearRange && (
                    <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <strong className="font-semibold">{yearRange.min}〜{yearRange.max}年 累計</strong> ／ 出典: 厚労省「職場のあんぜんサイト」+ 編集部 curated 事例
                    </p>
                  )}
                </Link>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-700/60">
                  <Link
                    href={`/strategy/plan-generator?industry=${SLUG_TO_SAFETY_PLAN[it.slug as IndustrySlug] ?? ""}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-200 hover:bg-purple-50 dark:bg-slate-900 dark:text-purple-300 dark:ring-purple-800 dark:hover:bg-purple-950/40"
                    aria-label={`${it.label}の年次安全衛生計画を作成する`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />{it.label}の年次計画を作る
                  </Link>
                  <Link
                    href="/chatbot"
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-800 dark:hover:bg-blue-950/40"
                    aria-label={`${it.label}の労働災害について安衛法AIチャットボットに質問する`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />AIに条文を質問
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
