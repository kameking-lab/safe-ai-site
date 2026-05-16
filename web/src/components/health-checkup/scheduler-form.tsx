"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHECKUP_TYPE_LABELS,
  INDUSTRY_LABELS,
  SUBSTANCE_LABELS,
  WORK_CONDITION_LABELS,
  type IndustryId,
  type SubstanceId,
  type WorkConditionId,
} from "@/types/health-checkup";
import { ALL_JOB_PROFILES, getJobsByIndustry } from "@/data/health-checkup-rules";

const TODAY = new Date().toISOString().slice(0, 10);

const SUBSTANCE_IDS = Object.keys(SUBSTANCE_LABELS) as SubstanceId[];
const WORK_CONDITION_IDS = Object.keys(WORK_CONDITION_LABELS) as WorkConditionId[];

export function SchedulerForm() {
  const router = useRouter();
  const [industry, setIndustry] = useState<IndustryId>("construction");
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [substances, setSubstances] = useState<SubstanceId[]>([]);
  const [workConditions, setWorkConditions] = useState<WorkConditionId[]>([]);
  const [hireDate, setHireDate] = useState<string>(TODAY);

  const jobs = useMemo(() => getJobsByIndustry(industry), [industry]);

  const handleIndustryChange = (next: IndustryId) => {
    setIndustry(next);
    // Drop jobs from the previous industry (they would otherwise leak through).
    setJobIds((prev) => {
      const allowed = new Set(getJobsByIndustry(next).map((j) => j.id));
      return prev.filter((id) => allowed.has(id));
    });
  };

  const toggle = <T extends string>(
    list: T[],
    value: T,
    setter: (v: T[]) => void,
  ) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("industry", industry);
    if (jobIds.length) params.set("jobs", jobIds.join(","));
    if (substances.length) params.set("substances", substances.join(","));
    if (workConditions.length) params.set("conditions", workConditions.join(","));
    params.set("hire", hireDate);
    router.push(`/health-checkup-scheduler/result?${params.toString()}`);
  };

  const handleReset = () => {
    setJobIds([]);
    setSubstances([]);
    setWorkConditions([]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold text-slate-700">
            業種 <span className="text-red-600">*</span>
          </span>
          <select
            value={industry}
            onChange={(e) => handleIndustryChange(e.target.value as IndustryId)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
          >
            {(Object.keys(INDUSTRY_LABELS) as IndustryId[]).map((id) => (
              <option key={id} value={id}>
                {INDUSTRY_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-slate-700">
            雇入日 / 起算日 <span className="text-red-600">*</span>
          </span>
          <input
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            この日付を起点に「雇入時健診」と6か月以内ごとの繰返しを配置します。
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">
          職種 / 担当業務（{INDUSTRY_LABELS[industry]}・複数選択可）
        </legend>
        <p className="mt-1 text-xs text-slate-500">
          選択した職種に紐づく有害物・作業条件が自動的に反映されます。
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => {
            const active = jobIds.includes(j.id);
            return (
              <button
                type="button"
                key={j.id}
                onClick={() => toggle(jobIds, j.id, setJobIds)}
                aria-pressed={active}
                className={`rounded border px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                }`}
              >
                <span className="block font-semibold">{j.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {j.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">
          取扱化学物質（任意・追加で個別選択）
        </legend>
        <p className="mt-1 text-xs text-slate-500">
          職種で自動付与されない物質や、複合的に取扱う物質を追加できます。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUBSTANCE_IDS.map((s) => {
            const active = substances.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => toggle(substances, s, setSubstances)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                }`}
              >
                {SUBSTANCE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">
          作業条件（任意・追加で個別選択）
        </legend>
        <p className="mt-1 text-xs text-slate-500">
          深夜業・暑熱・寒冷・粉じん・電離放射線・高圧業務などをチェックすると、
          {CHECKUP_TYPE_LABELS["specific-job"]}や該当する特殊健診が自動で適用されます。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORK_CONDITION_IDS.map((c) => {
            const active = workConditions.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggle(workConditions, c, setWorkConditions)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                }`}
              >
                {WORK_CONDITION_LABELS[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          選択をリセット
        </button>
        <button
          type="submit"
          className="rounded bg-emerald-600 px-6 py-2.5 text-base font-semibold text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          必要な健診を判定する
        </button>
      </div>

      <p className="text-xs text-slate-500">
        判定対象: 一般健診・特定業務従事者健診・特殊健診（有機則・特化則・鉛則・四アルキル鉛則・高気圧則・石綿則）・じん肺健診・歯科特殊健診・電離放射線健診。
        登録済み職種は {ALL_JOB_PROFILES.length} 件。
      </p>
    </form>
  );
}
