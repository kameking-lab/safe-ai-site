"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer, RefreshCw, FileSignature, CheckCircle2 } from "lucide-react";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { planBuilderConclusion } from "@/lib/treatment-balance/plan-builder-conclusion";
import {
  ALL_ILLNESS_CONDITIONS,
  ILLNESS_CATEGORIES,
} from "@/data/illness-considerations";
import {
  ARRANGEMENT_OPTIONS,
  SEVERITY_OPTIONS,
  WORK_TYPE_OPTIONS,
  describeArrangement,
  describeSeverity,
  describeWorkType,
  generateSupportPlan,
  type DesiredArrangement,
} from "@/lib/treatment-balance-engine";
import type {
  IllnessCategory,
  SeverityLevel,
  WorkType,
} from "@/types/illness-consideration";

interface FormState {
  category: IllnessCategory;
  conditionId: string;
  workType: WorkType;
  severity: SeverityLevel;
  arrangement: DesiredArrangement;
  employeeNote: string;
}

const DEFAULT_STATE: FormState = {
  category: "cancer",
  conditionId: ALL_ILLNESS_CONDITIONS[0].id,
  workType: "desk",
  severity: "moderate",
  arrangement: "phased-return",
  employeeNote: "",
};

export function PlanBuilderClient() {
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [submitted, setSubmitted] = useState(false);

  const filteredConditions = useMemo(
    () => ALL_ILLNESS_CONDITIONS.filter((c) => c.category === form.category),
    [form.category],
  );

  const plan = useMemo(() => {
    if (!submitted) return null;
    try {
      return generateSupportPlan({
        conditionId: form.conditionId,
        workType: form.workType,
        severity: form.severity,
        arrangement: form.arrangement,
        employeeNote: form.employeeNote,
      });
    } catch {
      return null;
    }
  }, [submitted, form]);

  const onCategoryChange = (next: IllnessCategory) => {
    const firstId =
      ALL_ILLNESS_CONDITIONS.find((c) => c.category === next)?.id ??
      DEFAULT_STATE.conditionId;
    setForm((s) => ({ ...s, category: next, conditionId: firstId }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const onReset = () => {
    setSubmitted(false);
    setForm(DEFAULT_STATE);
  };

  const conclusion = planBuilderConclusion({
    submitted,
    conditionName: plan?.conditionName ?? null,
  });

  return (
    <div className="space-y-6">
      {/* 結論ファースト: 未生成（青の案内）→ 生成済（緑の完了） */}
      <ConclusionCard
        tone={conclusion.tone}
        title={conclusion.title}
        description={conclusion.description}
        icon={conclusion.settled ? CheckCircle2 : FileSignature}
        action={conclusion.action}
        className="print:hidden"
      />

      {/* Form */}
      <form
        id="plan-form"
        onSubmit={onSubmit}
        className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
      >
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block font-semibold text-slate-800">疾患カテゴリ</span>
            <select
              value={form.category}
              onChange={(e) => onCategoryChange(e.target.value as IllnessCategory)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {ILLNESS_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-semibold text-slate-800">具体的な病態</span>
            <select
              value={form.conditionId}
              onChange={(e) => setForm((s) => ({ ...s, conditionId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {filteredConditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-semibold text-slate-800">職務の種類</span>
            <select
              value={form.workType}
              onChange={(e) =>
                setForm((s) => ({ ...s, workType: e.target.value as WorkType }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {WORK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-semibold text-slate-800">症状・配慮の重さ</span>
            <select
              value={form.severity}
              onChange={(e) =>
                setForm((s) => ({ ...s, severity: e.target.value as SeverityLevel }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="block font-semibold text-slate-800">希望する勤務形態</span>
            <select
              value={form.arrangement}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  arrangement: e.target.value as DesiredArrangement,
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {ARRANGEMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="block font-semibold text-slate-800">
              本人の希望・職場の事情（任意）
            </span>
            <textarea
              value={form.employeeNote}
              onChange={(e) =>
                setForm((s) => ({ ...s, employeeNote: e.target.value }))
              }
              rows={3}
              placeholder="例：通院は毎週金曜午後、配置転換可、繁忙期は7月〜9月"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:flex-none"
          >
            <FileSignature className="h-5 w-5" aria-hidden="true" />
            両立支援プランを生成
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[48px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            リセット
          </button>
        </div>
      </form>

      {/* Plan output */}
      {plan && (
        <article
          id="plan-output"
          aria-label="生成された両立支援プラン"
          className="scroll-mt-4 space-y-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
                両立支援プラン（労務管理ガイド）
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {plan.conditionName}
                <span className="ml-2 text-xs font-medium text-slate-500">
                  ／ {plan.categoryLabel}
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                職務：{describeWorkType(form.workType)} ／
                症状：{describeSeverity(form.severity)} ／
                希望形態：{describeArrangement(form.arrangement)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 print:hidden"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              印刷／PDF
            </button>
          </header>

          {/* Prominent medical disclaimer (top): per audit G-006 — must be reviewed before reading the plan. */}
          <aside
            role="note"
            aria-label="医学的判断ではないことに関する重要なお知らせ"
            className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3"
          >
            <p className="text-sm font-bold text-amber-900">
              ※ 本プランは医学的判断ではありません
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              本ツールが生成する内容は、産業医・主治医および衛生管理者・人事労務担当者が
              個別ケースを協議する際の<span className="font-semibold">雛形（たたき台）</span>
              に過ぎません。実際の就業可否判断・配慮事項の決定は、必ず主治医の意見書、
              産業医面談、本人の同意を踏まえてご判断ください。本ツールの出力は医療助言・診断・
              治療方針の提示ではなく、これらの代替とすることはできません。
            </p>
          </aside>

          {form.employeeNote && (
            <section className="rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">
              <span className="font-semibold">本人の希望・職場の事情：</span>
              {form.employeeNote}
            </section>
          )}

          {/* Sections */}
          <section className="space-y-4">
            {plan.sections.map((sec) => (
              <div key={sec.heading}>
                <h3 className="text-sm font-bold text-emerald-800">
                  {sec.heading}
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-6 text-sm leading-6 text-slate-800">
                  {sec.bullets.map((b, i) => (
                    <li key={`${sec.heading}-${i}`}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* Return steps */}
          <section>
            <h3 className="text-sm font-bold text-emerald-800">
              段階的復職プラン（業務量段階引上げ）
            </h3>
            <ol className="mt-2 space-y-2">
              {plan.returnSteps.map((step) => (
                <li
                  key={step.stepNo}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      {step.stepNo}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {step.title}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      （{step.durationLabel}・負荷{step.workloadPercent}%）
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Doctor opinion template */}
          <section>
            <h3 className="flex items-center gap-1 text-sm font-bold text-emerald-800">
              <FileSignature className="h-4 w-4" aria-hidden="true" />
              主治医意見書テンプレート
            </h3>
            <div className="mt-2 space-y-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-xs leading-6 text-slate-800">
              <p className="font-semibold">{plan.doctorOpinionTemplate.recipient}</p>
              <div>
                <p className="font-semibold">1. 患者基本情報</p>
                <ul className="mt-1 list-disc pl-5">
                  {plan.doctorOpinionTemplate.patientFields.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. 現在の就業可否</p>
                <ul className="mt-1 list-disc pl-5">
                  {plan.doctorOpinionTemplate.fitnessQuestions.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">3. 就業上の制限事項</p>
                <ul className="mt-1 list-disc pl-5">
                  {plan.doctorOpinionTemplate.workConstraints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">4. 職場でのモニタリング項目</p>
                <ul className="mt-1 list-disc pl-5">
                  {plan.doctorOpinionTemplate.observationItems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <p>
                <span className="font-semibold">5. 次回見直し：</span>
                {plan.doctorOpinionTemplate.reviewSchedule}
              </p>
              <p className="text-right text-[11px] text-slate-500">
                医療機関名・主治医氏名・記入日：__________________________________
              </p>
            </div>
          </section>

          {/* Follow up + legal */}
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            <p>
              <span className="font-semibold">プラン見直しの目安：</span>
              {plan.followUpCadence}
            </p>
            <p className="mt-1">
              <span className="font-semibold">関連法令・指針：</span>
              {plan.highlightedLaws.join(" ／ ")}
            </p>
          </section>

          {/* Footer disclaimer (PDF/print): per audit G-006 — visible on printed output. */}
          <footer className="border-t-2 border-amber-300 pt-3">
            <p className="text-xs font-bold text-amber-900">
              ※ 本書は医学的判断ではありません — 産業医・主治医による確認が必須です
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-600">
              本書は、産業医・主治医の判断を補助する雛形であり、医学的診断・治療方針・就業可否判断の
              代替とはなりません。実際の運用にあたっては、必ず主治医意見書および産業医面談の結果に基づき、
              本人・人事労務担当者・産業医・主治医の合意形成のうえで最終決定してください。
              出典法令・指針は厚生労働省「事業場における治療と仕事の両立支援のためのガイドライン」
              （2016年策定、令和3年改訂版を参照）に基づきます。
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {plan.disclaimer}
            </p>
          </footer>
        </article>
      )}

      {/* Related */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm print:hidden">
        <p className="font-semibold text-slate-800">関連ツール</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-700">
          <li>
            <Link href="/treatment-work-balance" className="underline">
              ← 両立支援ハブに戻る
            </Link>
          </li>
          <li>
            <Link
              href="/treatment-work-balance/illness-guide/cancer"
              className="underline"
            >
              病類別 配慮事項ガイド（がん）
            </Link>
          </li>
          <li>
            <Link href="/health-checkup-scheduler" className="underline">
              健康診断スケジューラ（合併症管理）
            </Link>
          </li>
          <li>
            <Link href="/mental-health" className="underline">
              メンタルヘルス・ハラスメント・VDT作業
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
