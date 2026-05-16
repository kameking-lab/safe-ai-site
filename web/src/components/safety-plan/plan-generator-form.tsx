"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  INDUSTRY_LABELS,
  MEASURE_LABELS,
  OVERWORK_PRIORITY_LABELS,
  SCALE_LABELS,
  SPECIAL_WORK_LABELS,
  type IndustryId,
  type MeasureCategory,
  type OverworkPriority,
  type ScaleId,
  type SpecialWorkId,
} from "@/types/safety-plan";

const DEFAULT_FY = 2026;

const FOCUS_CHOICES: MeasureCategory[] = [
  "education",
  "ky",
  "health-check",
  "inspection",
  "ra",
  "drill",
  "equipment-check",
  "industry-specific",
];

const SPECIAL_WORK_CHOICES: SpecialWorkId[] = [
  "high-place",
  "organic-solvent",
  "specified-chemical",
  "dust",
  "noise",
  "vibration",
  "ionizing-radiation",
  "lead",
  "asbestos",
  "lone-work",
  "shift-work",
  "heavy-load",
];

const OVERWORK_CHOICES: OverworkPriority[] = ["high", "normal", "low"];

export function PlanGeneratorForm() {
  const router = useRouter();
  const [industry, setIndustry] = useState<IndustryId>("construction");
  const [scale, setScale] = useState<ScaleId>("medium");
  const [fiscalYear, setFiscalYear] = useState<number>(DEFAULT_FY);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [focusAreas, setFocusAreas] = useState<MeasureCategory[]>([]);
  const [specialWork, setSpecialWork] = useState<SpecialWorkId[]>([]);
  const [hasOverseas, setHasOverseas] = useState<boolean>(false);
  const [overworkPriority, setOverworkPriority] =
    useState<OverworkPriority>("normal");
  const [notes, setNotes] = useState<string>("");

  const templateId = useMemo(() => `${industry}-${scale}`, [industry, scale]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (organizationName) params.set("org", organizationName);
    params.set("year", String(fiscalYear));
    if (focusAreas.length > 0) params.set("focus", focusAreas.join(","));
    if (specialWork.length > 0) params.set("special", specialWork.join(","));
    if (hasOverseas) params.set("overseas", "1");
    if (overworkPriority !== "normal") params.set("overwork", overworkPriority);
    if (notes) params.set("notes", notes);
    const qs = params.toString();
    router.push(
      `/strategy/plan-generator/preview/${templateId}${qs ? `?${qs}` : ""}`,
    );
  };

  const toggleFocus = (c: MeasureCategory) => {
    setFocusAreas((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const toggleSpecialWork = (c: SpecialWorkId) => {
    setSpecialWork((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold text-slate-700">業種 <span className="text-red-600">*</span></span>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as IndustryId)}
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
          <span className="block text-sm font-semibold text-slate-700">事業場規模 <span className="text-red-600">*</span></span>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as ScaleId)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
          >
            {(Object.keys(SCALE_LABELS) as ScaleId[]).map((id) => (
              <option key={id} value={id}>
                {SCALE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold text-slate-700">事業者名（任意）</span>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="例: 株式会社 安全工業"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            maxLength={64}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-slate-700">計画年度 <span className="text-red-600">*</span></span>
          <input
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            min={2025}
            max={2040}
            step={1}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">
          重点取組み（任意・複数選択可）
        </legend>
        <p className="mt-1 text-xs text-slate-500">
          選択した分類が実施事項表の上部に並びます。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FOCUS_CHOICES.map((c) => {
            const active = focusAreas.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleFocus(c)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                }`}
                aria-pressed={active}
              >
                {MEASURE_LABELS[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">
          自社に存在する特殊作業（任意・複数選択可）
        </legend>
        <p className="mt-1 text-xs text-slate-500">
          該当する作業に対応する目標・実施事項が自動的に追加されます（特別教育・特殊健診・作業主任者選任など）。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPECIAL_WORK_CHOICES.map((c) => {
            const active = specialWork.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleSpecialWork(c)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                }`}
                aria-pressed={active}
              >
                {SPECIAL_WORK_LABELS[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            海外派遣労働者
          </legend>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasOverseas}
              onChange={(e) => setHasOverseas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>6か月以上の海外派遣あり（派遣前・帰国時健診を追加）</span>
          </label>
        </fieldset>

        <fieldset className="rounded border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            過重労働対策の優先度
          </legend>
          <div className="mt-1 space-y-1 text-sm">
            {OVERWORK_CHOICES.map((p) => (
              <label key={p} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="overwork"
                  value={p}
                  checked={overworkPriority === p}
                  onChange={() => setOverworkPriority(p)}
                  className="mt-1 h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{OVERWORK_PRIORITY_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-slate-700">備考・自社特記事項（任意）</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="例: 当社固有の取組（5S大会、KYT道場など）を記入してください。"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          maxLength={2000}
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="submit"
          className="rounded bg-emerald-600 px-6 py-2.5 text-base font-semibold text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          計画を生成してプレビュー
        </button>
      </div>
    </form>
  );
}
