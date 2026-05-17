"use client";

import { useState } from "react";
import { Search, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import {
  identifyTargetWorkplaces,
  INDUSTRY_GROUPS,
  COMMON_PROCESSES,
} from "@/lib/measurement-engine";
import { FREQUENCY_LABEL, METHOD_LABEL } from "@/data/measurement-rules";
import type { TargetFinderInput, IdentifiedTarget } from "@/types/work-environment";

type FormInput = Omit<TargetFinderInput, "substances"> & { substances: string };

const INITIAL_FORM_INPUT: FormInput = {
  industryGroup: "",
  processes: [],
  substances: "",
  keywords: "",
};

export function WorkEnvTargetFinder() {
  const [form, setForm] = useState<FormInput>(INITIAL_FORM_INPUT);
  const [results, setResults] = useState<IdentifiedTarget[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleProcessToggle(process: string) {
    setForm((f) => ({
      ...f,
      processes: f.processes.includes(process)
        ? f.processes.filter((p) => p !== process)
        : [...f.processes, process],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: TargetFinderInput = {
      ...form,
      substances: form.substances
        .split(/[,、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setResults(identifyTargetWorkplaces(input));
    setExpandedId(null);
  }

  function handleReset() {
    setForm(INITIAL_FORM_INPUT);
    setResults(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          事業場の情報を入力
        </h2>

        {/* Industry group */}
        <div className="mb-4">
          <label htmlFor="industryGroup" className="mb-1 block text-sm font-medium text-slate-700">
            業種
          </label>
          <select
            id="industryGroup"
            value={form.industryGroup}
            onChange={(e) => setForm((f) => ({ ...f, industryGroup: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="">-- 業種を選択 --</option>
            {INDUSTRY_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Work processes */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            作業工程（該当するものをすべて選択）
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMMON_PROCESSES.map((p) => (
              <label key={p} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700 hover:bg-teal-50 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-teal-600"
                  checked={form.processes.includes(p)}
                  onChange={() => handleProcessToggle(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        {/* Substances */}
        <div className="mb-4">
          <label htmlFor="substances" className="mb-1 block text-sm font-medium text-slate-700">
            取扱物質（カンマ区切りで入力）
          </label>
          <input
            id="substances"
            type="text"
            value={form.substances}
            onChange={(e) => setForm((f) => ({ ...f, substances: e.target.value }))}
            placeholder="例: トリクロロエチレン、シンナー、有機溶剤"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </div>

        {/* Keywords */}
        <div className="mb-5">
          <label htmlFor="keywords" className="mb-1 block text-sm font-medium text-slate-700">
            その他キーワード（任意）
          </label>
          <input
            id="keywords"
            type="text"
            value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            placeholder="例: タンク内作業、炉前、粉体袋詰め"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <Search className="h-4 w-4" aria-hidden />
            測定対象を判定
          </button>
          {results !== null && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              リセット
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {results !== null && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-800">
            判定結果
          </h2>

          {results.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              <p className="text-sm text-emerald-800">
                入力内容から該当する測定対象作業場は見つかりませんでした。
                業種・工程・物質をさらに詳しく入力するか、作業環境測定機関にご相談ください。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-teal-700">{results.length}件</span>
                の測定対象作業場が該当する可能性があります。
              </p>

              {results.map((r, idx) => (
                <ResultCard
                  key={r.category.id}
                  result={r}
                  rank={idx + 1}
                  expanded={expandedId === r.category.id}
                  onToggle={() =>
                    setExpandedId(expandedId === r.category.id ? null : r.category.id)
                  }
                />
              ))}

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  本判定はキーワードマッチングによる参考情報です。
                  最終的な測定義務の有無は、所轄の労働基準監督署または
                  作業環境測定機関にご確認ください。
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  rank,
  expanded,
  onToggle,
}: {
  result: IdentifiedTarget;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { category, matchedConditions, matchScore } = result;
  const scoreColor =
    matchScore > 0.5 ? "text-teal-700 bg-teal-100" : "text-amber-700 bg-amber-100";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
        aria-expanded={expanded}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{category.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{category.legalBasis}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreColor}`}>
            {matchScore > 0.5 ? "高い一致" : "一部一致"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Matched conditions */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              該当する条件
            </p>
            <ul className="space-y-1.5">
              {matchedConditions.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" aria-hidden />
                  <div>
                    <span className="font-medium text-slate-800">{c.label}</span>
                    <span className="ml-1.5 text-slate-600">— {c.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Measurement info grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCell label="測定方法" value={METHOD_LABEL[category.method] ?? category.method} />
            <InfoCell label="測定頻度" value={FREQUENCY_LABEL[category.frequency] ?? category.frequency} />
            <InfoCell label="管理区分" value={category.hasManagementClass ? "第1〜第3区分" : "なし"} />
            <InfoCell label="測定担当" value={category.measurer} />
          </div>

          {/* Target parameters */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              測定対象パラメータ
            </p>
            <ul className="flex flex-wrap gap-2">
              {category.targetParameters.map((p) => (
                <li key={p} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          {category.notes && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-900">{category.notes}</p>
            </div>
          )}

          {/* Link to management class judge */}
          {category.hasManagementClass && (
            <a
              href="/work-environment-measurement/management-class-judge"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              管理区分を判定する →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-medium text-slate-800">{value}</p>
    </div>
  );
}
