"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  CalendarClock,
  FileCheck2,
  Phone,
  ArrowRight,
} from "lucide-react";
import {
  identifyTargetWorkplaces,
  INDUSTRY_GROUPS,
  COMMON_PROCESSES,
} from "@/lib/measurement-engine";
import {
  summarizeMeasurementFrequencies,
  hasManagementClassTarget,
  hasSpecialControlSubstance,
  hasMeaningfulInput,
} from "@/lib/work-env-next-actions";
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
  const [lastInput, setLastInput] = useState<TargetFinderInput | null>(null);
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
    setLastInput(input);
    setExpandedId(null);
  }

  function handleReset() {
    setForm(INITIAL_FORM_INPUT);
    setResults(null);
    setLastInput(null);
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
            <NoMatchMessage meaningful={lastInput ? hasMeaningfulInput(lastInput) : false} />
          ) : (
            <div className="space-y-3">
              {/* ファースト・アンサー：対象になり得るか／何種類か */}
              <div className="rounded-xl border border-teal-300 bg-teal-50 p-4">
                <p className="text-sm font-bold text-teal-900 sm:text-base">
                  あなたの事業場は、次の
                  <span className="mx-1 text-lg text-teal-700">{results.length}</span>
                  種類の作業環境測定の対象になる可能性があります。
                </p>
                <p className="mt-1.5 text-xs text-teal-800">
                  作業環境測定は事業者の義務です（安衛法第65条）。下の
                  <span className="font-semibold">「次にやること」</span>
                  の手順で進めてください。
                </p>
              </div>

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

              {/* バッジの意味（凡例） */}
              <p className="text-xs text-slate-500">
                ※ <span className="font-medium text-teal-700">高い一致</span>／
                <span className="font-medium text-amber-700">一部一致</span>
                は入力語と判定条件の合致の強さです。一致が弱くても対象になる場合があるため、
                判断に迷うときは測定機関にご確認ください。
              </p>

              <NextActionsPanel results={results} />

              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
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

function NoMatchMessage({ meaningful }: { meaningful: boolean }) {
  if (!meaningful) {
    // 入力不足：業種だけ等。対象外と断定させない。
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">判定するには作業内容の入力が必要です。</p>
          <p className="mt-1 text-xs">
            業種だけでは判定できません。
            <span className="font-medium">作業工程</span>（溶接・研磨・洗浄など）や
            <span className="font-medium">取扱物質</span>を選択・入力してから、もう一度お試しください。
            「該当なし＝測定不要」ではありません。
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      <div className="text-sm text-emerald-800">
        <p className="font-semibold">
          入力内容からは、義務対象の作業場は見つかりませんでした。
        </p>
        <p className="mt-1 text-xs">
          ただし入力語に依存する参考判定のため、
          <span className="font-medium">対象外と断定はできません</span>。
          取扱物質を具体名で追加するか、判断に迷う場合は所轄の労働基準監督署・
          作業環境測定機関にご確認ください。
        </p>
      </div>
    </div>
  );
}

function NextActionsPanel({ results }: { results: IdentifiedTarget[] }) {
  const freqGroups = summarizeMeasurementFrequencies(results);
  const needsClass = hasManagementClassTarget(results);
  const isSpecialControl = hasSpecialControlSubstance(results);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
        <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
        次にやること（測定の進め方）
      </h3>
      <ol className="mt-3 space-y-3">
        <StepItem
          n={1}
          icon={<Phone className="h-4 w-4" aria-hidden />}
          title="作業環境測定機関（測定士）に測定を依頼する"
        >
          作業環境測定は<span className="font-medium">国家資格を持つ作業環境測定士</span>
          が行う必要があり、自社では実施できません。登録を受けた作業環境測定機関に
          測定を依頼してください。
        </StepItem>

        <StepItem
          n={2}
          icon={<CalendarClock className="h-4 w-4" aria-hidden />}
          title="測定の時期・頻度を確認する"
        >
          対象設備の使用を始めるとき、および以後は次の頻度で定期測定が必要です。
          <ul className="mt-2 space-y-1.5">
            {freqGroups.map((g) => (
              <li
                key={g.label}
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-xs"
              >
                <span className="font-semibold text-blue-800">{g.label}</span>
                <span className="ml-1.5 text-slate-600">— {g.categories.join("・")}</span>
              </li>
            ))}
          </ul>
        </StepItem>

        {needsClass && (
          <StepItem
            n={3}
            icon={<ArrowRight className="h-4 w-4" aria-hidden />}
            title="測定値を受け取ったら管理区分を判定する"
          >
            測定機関から受け取ったA測定・B測定の値で、第1〜第3管理区分を判定できます。
            <Link
              href="/work-environment-measurement/management-class-judge"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              管理区分 判定ツールを開く
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </StepItem>
        )}

        <StepItem
          n={needsClass ? 4 : 3}
          icon={<FileCheck2 className="h-4 w-4" aria-hidden />}
          title="測定記録を保存・周知する"
        >
          測定結果の記録は<span className="font-medium">3年間</span>の保存義務があります
          {isSpecialControl && (
            <>
              （特別管理物質に該当する場合は
              <span className="font-medium">30年間</span>）
            </>
          )}
          。第3管理区分となった作業場は、結果を労働者へ周知する必要があります。
        </StepItem>
      </ol>

      <p className="mt-4 border-t border-blue-100 pt-3 text-xs text-blue-800">
        測定を実施しない場合、安衛法第65条違反として罰則（第120条・50万円以下の罰金）の
        対象となることがあります。
      </p>
    </div>
  );
}

function StepItem({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-blue-900">
          <span className="text-blue-500">{icon}</span>
          {title}
        </p>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-700">{children}</div>
      </div>
    </li>
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
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-600">
            <CalendarClock className="h-3 w-3 text-slate-400" aria-hidden />
            測定頻度：{FREQUENCY_LABEL[category.frequency] ?? category.frequency}
          </p>
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
