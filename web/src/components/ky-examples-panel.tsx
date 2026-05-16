"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  KY_INDUSTRY_IDS,
  KY_INDUSTRY_LABELS,
  KY_WORK_TYPE_IDS,
  KY_WORK_TYPE_LABELS,
  type KyIndustryId,
  type KyWorkTypeId,
  type KyExample,
} from "@/types/ky-example";
import {
  loadKySuggestionHistory,
  recordKySuggestionUsage,
  suggestKyByIndustryAndWork,
  type KySuggestionHistoryEntry,
  type KySuggestionResult,
} from "@/lib/ky-suggestion";

const HISTORY_STORAGE_KEY = "ky-suggestion-history-v1";
const EMPTY_HISTORY: KySuggestionHistoryEntry[] = [];

function subscribeHistory(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === HISTORY_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("ky-suggestion-history-updated", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("ky-suggestion-history-updated", listener);
  };
}

function useKyHistory(): KySuggestionHistoryEntry[] {
  return useSyncExternalStore(
    subscribeHistory,
    loadKySuggestionHistory,
    () => EMPTY_HISTORY
  );
}

export type KyExamplesPanelProps = {
  /** Optional default industry derived from the company profile. */
  defaultIndustry?: KyIndustryId;
  defaultWorkType?: KyWorkTypeId;
  /** Optional free-text seed from the current work content. */
  workContextText?: string;
  /** Called when the user picks an example card. */
  onApply: (example: KyExample) => void;
  /** Set to true to render an inline (always-open) view; default is collapsible. */
  alwaysOpen?: boolean;
};

export function KyExamplesPanel(props: KyExamplesPanelProps) {
  const {
    defaultIndustry,
    defaultWorkType,
    workContextText,
    onApply,
    alwaysOpen = false,
  } = props;

  const [open, setOpen] = useState(alwaysOpen);
  const [industry, setIndustry] = useState<KyIndustryId | "">(
    defaultIndustry ?? ""
  );
  const [workType, setWorkType] = useState<KyWorkTypeId | "">(
    defaultWorkType ?? ""
  );
  const history = useKyHistory();

  const suggestions = useMemo<KySuggestionResult[]>(() => {
    if (!industry && !workType) return [];
    return suggestKyByIndustryAndWork({
      industry: industry || undefined,
      workType: workType || undefined,
      freeText: workContextText,
      history,
      limit: 12,
    });
  }, [industry, workType, workContextText, history]);

  const handleApply = useCallback(
    (example: KyExample) => {
      recordKySuggestionUsage(example.id);
      onApply(example);
    },
    [onApply]
  );

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 shadow-sm print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-indigo-900">
          <span aria-hidden>📚</span>
          過去事例から提案（業種・作業を選んで KY 候補を呼び出す）
        </span>
        <span className="text-indigo-700">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-indigo-200 px-4 pb-4 pt-3">
          <FilterControls
            industry={industry}
            workType={workType}
            onIndustry={setIndustry}
            onWorkType={setWorkType}
          />
          <SuggestionList
            suggestions={suggestions}
            industry={industry}
            workType={workType}
            onApply={handleApply}
          />
        </div>
      )}
    </section>
  );
}

function FilterControls(props: {
  industry: KyIndustryId | "";
  workType: KyWorkTypeId | "";
  onIndustry: (v: KyIndustryId | "") => void;
  onWorkType: (v: KyWorkTypeId | "") => void;
}) {
  const { industry, workType, onIndustry, onWorkType } = props;
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-bold text-indigo-800">業種</p>
        <div className="flex flex-wrap gap-1.5">
          <ChipButton
            selected={industry === ""}
            onClick={() => onIndustry("")}
            tone="indigo"
          >
            すべて
          </ChipButton>
          {KY_INDUSTRY_IDS.map((id) => (
            <ChipButton
              key={id}
              selected={industry === id}
              onClick={() => onIndustry(id)}
              tone="indigo"
            >
              {KY_INDUSTRY_LABELS[id]}
            </ChipButton>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold text-indigo-800">作業種別</p>
        <div className="flex flex-wrap gap-1.5">
          <ChipButton
            selected={workType === ""}
            onClick={() => onWorkType("")}
            tone="violet"
          >
            すべて
          </ChipButton>
          {KY_WORK_TYPE_IDS.map((id) => (
            <ChipButton
              key={id}
              selected={workType === id}
              onClick={() => onWorkType(id)}
              tone="violet"
            >
              {KY_WORK_TYPE_LABELS[id]}
            </ChipButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function SuggestionList(props: {
  suggestions: KySuggestionResult[];
  industry: KyIndustryId | "";
  workType: KyWorkTypeId | "";
  onApply: (ex: KyExample) => void;
}) {
  const { suggestions, industry, workType, onApply } = props;

  if (!industry && !workType) {
    return (
      <p className="mt-4 rounded-lg border border-indigo-200 bg-white px-3 py-3 text-xs text-indigo-700">
        業種または作業種別を選ぶと、該当する KY 事例が候補として表示されます。
      </p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
        条件に合致する事例が見つかりません。業種または作業種別を変更してください。
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {suggestions.map((s) => (
        <li key={s.example.id}>
          <SuggestionCard suggestion={s} onApply={onApply} />
        </li>
      ))}
    </ul>
  );
}

function SuggestionCard(props: {
  suggestion: KySuggestionResult;
  onApply: (ex: KyExample) => void;
}) {
  const { suggestion, onApply } = props;
  const ex = suggestion.example;
  return (
    <article className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <header className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
          {KY_INDUSTRY_LABELS[ex.industry]}
        </span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
          {KY_WORK_TYPE_LABELS[ex.workType]}
        </span>
        {suggestion.matchedOn.includes("history") && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            最近選択
          </span>
        )}
      </header>
      <h3 className="text-sm font-bold text-slate-900">{ex.title}</h3>
      <div className="text-[11px] text-slate-700">
        <p className="font-semibold text-rose-700">危険要因</p>
        <ul className="ml-4 list-disc">
          {ex.hazards.slice(0, 2).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
        <p className="mt-1 font-semibold text-emerald-700">対策</p>
        <ul className="ml-4 list-disc">
          {ex.countermeasures.slice(0, 2).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      <footer className="mt-auto flex items-end justify-between gap-2 pt-2">
        <span className="text-[10px] text-slate-500">出典: {ex.source.label}</span>
        <button
          type="button"
          onClick={() => onApply(ex)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          この事例を反映
        </button>
      </footer>
    </article>
  );
}

function ChipButton(props: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  tone: "indigo" | "violet";
}) {
  const { children, selected, onClick, tone } = props;
  const selectedClass =
    tone === "indigo"
      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
      : "border-violet-600 bg-violet-600 text-white shadow-sm";
  const idleClass =
    tone === "indigo"
      ? "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
      : "border-slate-300 bg-white text-slate-700 hover:border-violet-400 hover:bg-violet-50";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[32px] rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        selected ? selectedClass : idleClass
      }`}
    >
      {children}
    </button>
  );
}
