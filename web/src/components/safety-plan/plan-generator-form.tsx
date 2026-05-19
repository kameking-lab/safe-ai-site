"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import type { IndustrySlug } from "@/lib/industry-slugs";
import { detectFocusAreas } from "@/lib/copilot/keyword-routing";

// Canonical accidents-reports IndustrySlug → plan-generator IndustryId
const SLUG_TO_INDUSTRY: Record<IndustrySlug, IndustryId> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transportation",
  healthcare: "medical",
  service: "service",
};

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
  const searchParams = useSearchParams();
  const copilot = useOptionalCopilot();
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
  // Surface what was auto-prefilled so the user knows their context carried over.
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null);
  const prefillAppliedRef = useRef(false);

  const templateId = useMemo(() => `${industry}-${scale}`, [industry, scale]);

  // Copilot-aware prefill: URL params win, then SafetyContext, then defaults.
  // Runs once after mount to avoid stomping on user edits later.
  // Lint rule (react-hooks/set-state-in-effect) discourages naked setState in
  // effects, so we compute the entire prefill payload first and batch the
  // commit via a single rAF (which React groups into one re-render).
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (!copilot?.hydrated && copilot != null) return; // wait for hydration
    // useSearchParams returns null mid-suspense in Next.js 16; only mark the
    // prefill as applied once we have a real ReadonlyURLSearchParams handle.
    if (searchParams == null) return;
    prefillAppliedRef.current = true;

    type Prefill = {
      industry?: IndustryId;
      scale?: ScaleId;
      focusAreas?: MeasureCategory[];
      message?: string;
    };
    const next: Prefill = {};
    const messages: string[] = [];

    const urlIndustry = searchParams?.get("industry");
    const urlFocus = searchParams?.get("focus");
    const urlScale = searchParams?.get("scale");

    if (urlIndustry && urlIndustry in SLUG_TO_INDUSTRY) {
      next.industry = SLUG_TO_INDUSTRY[urlIndustry as IndustrySlug];
      messages.push(`業種「${INDUSTRY_LABELS[next.industry]}」を引き継ぎ`);
    } else if (copilot?.state.industry && copilot.state.industry in SLUG_TO_INDUSTRY) {
      next.industry = SLUG_TO_INDUSTRY[copilot.state.industry];
      messages.push(`業種「${INDUSTRY_LABELS[next.industry]}」を引き継ぎ`);
    }

    if (urlScale === "small" || urlScale === "medium" || urlScale === "large") {
      next.scale = urlScale;
    } else if (copilot?.state.scale) {
      next.scale = copilot.state.scale;
    }

    if (urlFocus) {
      const detected = detectFocusAreas(urlFocus);
      if (detected.length > 0) {
        next.focusAreas = detected;
        messages.push(`重点取組み「${urlFocus}」`);
      }
    } else if ((copilot?.state.keyConcerns?.length ?? 0) > 0) {
      const detected = detectFocusAreas(copilot!.state.keyConcerns.join(" "));
      if (detected.length > 0) {
        next.focusAreas = detected;
        messages.push(`重点取組み「${copilot!.state.keyConcerns.slice(0, 2).join("・")}」`);
      }
    }

    if (messages.length > 0) next.message = messages.join(" / ");

    // A one-shot prefill is a legitimate React 19 pattern (the alternative
    // is to thread query-string parsing through a parent server component),
    // so we silence the cascading-render lint rule for this single commit.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (next.industry) setIndustry(next.industry);
    if (next.scale) setScale(next.scale);
    if (next.focusAreas) setFocusAreas(next.focusAreas);
    if (next.message) setPrefillMessage(next.message);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, copilot]);

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
    const href = `/strategy/plan-generator/preview/${templateId}${qs ? `?${qs}` : ""}`;

    // Record the about-to-be-generated plan in the Copilot SafetyContext.
    // The preview page also records on mount, but doing it here lets the
    // chatbot / accidents-reports nav reflect the plan immediately after
    // the user clicks "計画書を生成".
    const planIndustrySlug = (Object.entries(SLUG_TO_INDUSTRY) as [
      IndustrySlug,
      IndustryId,
    ][]).find(([, id]) => id === industry)?.[0];
    copilot?.recordPlan({
      industry: planIndustrySlug,
      scale,
      fiscalYear,
      templateId,
      href,
      organizationName: organizationName || undefined,
    });

    router.push(href);
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

  // Map current plan-generator IndustryId back to the canonical accidents-reports slug
  const reportSlug = (Object.entries(SLUG_TO_INDUSTRY) as [IndustrySlug, IndustryId][])
    .find(([, id]) => id === industry)?.[0];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      {prefillMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
        >
          <span aria-hidden="true">✓</span>
          <span>
            安全Copilotから引き継ぎました：
            <span className="font-semibold">{prefillMessage}</span>
          </span>
        </div>
      )}
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

      {reportSlug && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs text-rose-900">
          <p className="font-semibold">
            事故傾向を参考にしてから計画を作成できます
          </p>
          <p className="mt-1 leading-relaxed">
            {INDUSTRY_LABELS[industry]}で多発する事故型・原因・推奨対策チェックリストを
            <a
              href={`/accidents-reports/${reportSlug}`}
              className="ml-1 font-semibold underline hover:text-rose-700"
            >
              業種別レポートで確認
            </a>
            してから本フォームに戻ると、関心事項が自動で引き継がれます。
          </p>
          <p className="mt-1 leading-relaxed">
            個別の法令確認は
            <a
              href={`/chatbot?q=${encodeURIComponent(`${INDUSTRY_LABELS[industry]}で必要な安全衛生管理の根拠法令`)}`}
              className="ml-1 font-semibold underline hover:text-rose-700"
            >
              安衛法AIで深掘り
            </a>
            できます。
          </p>
        </div>
      )}

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
