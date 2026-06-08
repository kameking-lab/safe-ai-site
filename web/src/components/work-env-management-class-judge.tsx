"use client";

import { useState } from "react";
import { ClipboardList, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { determineManagementClass } from "@/lib/measurement-engine";
import { MEASUREMENT_CATEGORIES } from "@/data/measurement-rules";
import type { ManagementClassInput, ManagementClassResult, ManagementClass } from "@/types/work-environment";
import type { MeasurementCategoryId } from "@/types/work-environment";
import {
  ClassJudgeRecordHeader,
  ClassJudgeInputTable,
  ClassJudgeSignoff,
  type ClassJudgeRecordMeta,
} from "@/components/work-env/class-judge-record-print";

const INITIAL_FORM = {
  category: "" as MeasurementCategoryId | "",
  /** A-measurement value (measured concentration) */
  aValue: "",
  /** Management concentration (管理濃度) */
  managementConc: "",
  /** A-measurement geometric standard deviation */
  aGsd: "",
  useBMeasurement: false,
  /** B-measurement value */
  bValue: "",
  /** 記録用（任意）: 単位作業場所の名称 */
  workplace: "",
  /** 記録用（任意）: 測定対象物質名 */
  substance: "",
  /** 記録用（任意）: 測定実施年月日 "YYYY-MM-DD" */
  measuredOn: "",
};

export function WorkEnvManagementClassJudge() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState<ManagementClassResult | null>(null);
  const [recordMeta, setRecordMeta] = useState<ClassJudgeRecordMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoriesWithClass = MEASUREMENT_CATEGORIES.filter((c) => c.hasManagementClass);

  const selectedCategory = MEASUREMENT_CATEGORIES.find((c) => c.id === form.category);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setRecordMeta(null);

    if (!form.category) {
      setError("測定対象を選択してください。");
      return;
    }

    const aVal = parseFloat(form.aValue);
    const mgmtConc = parseFloat(form.managementConc);

    if (isNaN(aVal) || aVal < 0) {
      setError("A測定値（測定濃度）を正しく入力してください。");
      return;
    }
    if (isNaN(mgmtConc) || mgmtConc <= 0) {
      setError("管理濃度を正しく入力してください（正の数値）。");
      return;
    }

    const aMeasurementRatio = aVal / mgmtConc;
    const aGsd = form.aGsd ? parseFloat(form.aGsd) : undefined;

    let bMeasurementRatio: number | undefined;
    if (form.useBMeasurement) {
      const bVal = parseFloat(form.bValue);
      if (isNaN(bVal) || bVal < 0) {
        setError("B測定値を正しく入力してください。");
        return;
      }
      bMeasurementRatio = bVal / mgmtConc;
    }

    const effectiveGsd = aGsd && aGsd > 1 ? aGsd : undefined;
    const input: ManagementClassInput = {
      category: form.category as MeasurementCategoryId,
      aMeasurementRatio,
      aGsd: effectiveGsd,
      useBMeasurement: form.useBMeasurement,
      bMeasurementRatio,
    };

    setResult(determineManagementClass(input));
    setRecordMeta({
      workplace: form.workplace.trim(),
      substance: form.substance.trim(),
      measuredOn: form.measuredOn,
      categoryName: selectedCategory?.name ?? "",
      unit: selectedCategory?.unit ?? "",
      managementConc: mgmtConc,
      aValue: aVal,
      aGsd: effectiveGsd,
      useBMeasurement: form.useBMeasurement,
      bValue: form.useBMeasurement ? parseFloat(form.bValue) : undefined,
    });
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setResult(null);
    setRecordMeta(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 print:hidden"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          測定値を入力
        </h2>

        {/* Category select */}
        <div className="mb-4">
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
            測定対象（有害因子の種類）
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as MeasurementCategoryId | "" }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">-- 測定対象を選択 --</option>
            {categoriesWithClass.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <p className="mt-1 text-xs text-slate-500">
              標準値の参照: {selectedCategory.standardLabel}（{selectedCategory.unit}）
            </p>
          )}
        </div>

        {/* Management concentration */}
        <div className="mb-4">
          <label htmlFor="managementConc" className="mb-1 block text-sm font-medium text-slate-700">
            管理濃度（厚労省告示の数値）
            {selectedCategory && (
              <span className="ml-2 text-xs text-slate-500">
                単位: {selectedCategory.unit}
              </span>
            )}
          </label>
          <input
            id="managementConc"
            type="number"
            step="any"
            min="0"
            value={form.managementConc}
            onChange={(e) => setForm((f) => ({ ...f, managementConc: e.target.value }))}
            placeholder="例: 25（トルエンの管理濃度: 25ppm）"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* A measurement */}
        <fieldset className="mb-4 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            A測定（全域平均測定）
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="aValue" className="mb-1 block text-xs font-medium text-slate-600">
                測定値（幾何平均）
              </label>
              <input
                id="aValue"
                type="number"
                step="any"
                min="0"
                value={form.aValue}
                onChange={(e) => setForm((f) => ({ ...f, aValue: e.target.value }))}
                placeholder="例: 12.5"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="aGsd" className="mb-1 block text-xs font-medium text-slate-600">
                幾何標準偏差（GSD）※任意
              </label>
              <input
                id="aGsd"
                type="number"
                step="any"
                min="1"
                value={form.aGsd}
                onChange={(e) => setForm((f) => ({ ...f, aGsd: e.target.value }))}
                placeholder="例: 2.0（省略時は平均値のみで判定）"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </fieldset>

        {/* B measurement toggle */}
        <div className="mb-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={form.useBMeasurement}
              onChange={(e) => setForm((f) => ({ ...f, useBMeasurement: e.target.checked }))}
            />
            <span className="font-medium text-slate-700">B測定も入力する（最高濃度点測定）</span>
          </label>
        </div>

        {/* B measurement */}
        {form.useBMeasurement && (
          <fieldset className="mb-4 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-700">
              B測定（最高濃度点）
            </legend>
            <div className="mt-2">
              <label htmlFor="bValue" className="mb-1 block text-xs font-medium text-slate-600">
                測定値
              </label>
              <input
                id="bValue"
                type="number"
                step="any"
                min="0"
                value={form.bValue}
                onChange={(e) => setForm((f) => ({ ...f, bValue: e.target.value }))}
                placeholder="例: 30.0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </fieldset>
        )}

        {/* 記録用の任意情報（印刷時の評価記録に反映。判定そのものには不要） */}
        <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            記録用の情報（任意・印刷時の評価記録に反映）
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            入力すると印刷／PDFの評価記録に反映されます。空欄でも判定・印刷はできます（手書き欄として出力）。
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="workplace" className="mb-1 block text-xs font-medium text-slate-600">
                単位作業場所の名称
              </label>
              <input
                id="workplace"
                type="text"
                value={form.workplace}
                onChange={(e) => setForm((f) => ({ ...f, workplace: e.target.value }))}
                placeholder="例: 第2塗装ブース"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="substance" className="mb-1 block text-xs font-medium text-slate-600">
                測定対象物質名
              </label>
              <input
                id="substance"
                type="text"
                value={form.substance}
                onChange={(e) => setForm((f) => ({ ...f, substance: e.target.value }))}
                placeholder="例: トルエン"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="measuredOn" className="mb-1 block text-xs font-medium text-slate-600">
                測定実施年月日
              </label>
              <input
                id="measuredOn"
                type="date"
                value={form.measuredOn}
                onChange={(e) => setForm((f) => ({ ...f, measuredOn: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </details>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            管理区分を判定
          </button>
          {result !== null && (
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

      {/* Result */}
      {result && (
        <ManagementClassResultCard result={result} recordMeta={recordMeta} />
      )}

      {/* Explanation panel */}
      <ManagementClassExplanation />
    </div>
  );
}

function ManagementClassResultCard({
  result,
  recordMeta,
}: {
  result: ManagementClassResult;
  recordMeta: ClassJudgeRecordMeta | null;
}) {
  const classConfig: Record<
    ManagementClass,
    { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
  > = {
    1: {
      label: "第1管理区分",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      Icon: CheckCircle2,
    },
    2: {
      label: "第2管理区分",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-300",
      Icon: AlertTriangle,
    },
    3: {
      label: "第3管理区分",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-400",
      Icon: XCircle,
    },
  };

  const cfg = classConfig[result.managementClass];
  const { Icon } = cfg;

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-6 print:border print:bg-white print:p-0`}>
      {/* 記録ツールバー（印刷時は隠す） */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs font-semibold text-slate-600">
          評価記録として保存できます（A4・確認欄付き）
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          🖨 評価記録を印刷 / PDF保存
        </button>
      </div>

      {/* 印刷専用：A4評価記録ヘッダ＋測定値の内訳 */}
      {recordMeta && <ClassJudgeRecordHeader meta={recordMeta} />}
      {recordMeta && <ClassJudgeInputTable meta={recordMeta} />}

      <div className="mb-4 flex items-center gap-3 print:mt-3">
        <Icon className={`h-8 w-8 ${cfg.color}`} aria-hidden />
        <div>
          <p className={`text-2xl font-extrabold ${cfg.color}`}>{cfg.label}</p>
          {result.deadline && (
            <p className="text-sm font-semibold text-slate-600">
              改善期限: {result.deadline}
            </p>
          )}
        </div>
      </div>

      {/* A/B class breakdown */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
          A測定 → 第{result.aClass}管理区分
        </span>
        {result.bClass !== undefined && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            B測定 → 第{result.bClass}管理区分
          </span>
        )}
      </div>

      {/* Explanation */}
      <div className="mb-5 whitespace-pre-line text-sm text-slate-700">
        {result.explanation.split("\n").map((line, i) => (
          <p key={i} className={i === 0 ? "font-medium" : "mt-1"}>
            {line}
          </p>
        ))}
      </div>

      {/* Improvement measures */}
      {result.improvementMeasures.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">必要な改善措置</p>
          <ul className="space-y-2">
            {result.improvementMeasures.map((m, i) => (
              <li key={i} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <PriorityBadge priority={m.priority} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{m.detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        ※ 本判定は参考情報です。法令上の最終判定は作業環境測定機関または労働衛生コンサルタントにご確認ください。
        出典: 作業環境測定基準（昭和51年労働省告示第46号）
      </p>

      {/* 印刷専用：確認欄＋保存・周知の注記 */}
      <ClassJudgeSignoff />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "immediate" | "within-3months" | "maintain" }) {
  const config = {
    immediate: { label: "直ちに", className: "bg-red-100 text-red-700" },
    "within-3months": { label: "3ヶ月以内", className: "bg-amber-100 text-amber-700" },
    maintain: { label: "維持", className: "bg-emerald-100 text-emerald-700" },
  };
  const { label, className } = config[priority];
  return (
    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function ManagementClassExplanation() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 print:hidden">
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-5 w-5 text-slate-400" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-800">
          管理区分の判定基準（作業環境測定基準告示より）
        </h2>
      </div>

      <div className="space-y-3 text-sm text-slate-700">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="font-bold text-emerald-700 mb-1">第1管理区分</p>
            <p className="text-xs">
              作業環境が良好。A測定の上側信頼限界値（幾何平均×exp(1.645×ln(GSD))）が管理濃度未満、
              かつB測定が管理濃度の1/2未満。現状の維持管理を継続。
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="font-bold text-amber-700 mb-1">第2管理区分</p>
            <p className="text-xs">
              改善の余地あり。第1・第3のいずれにも該当しない場合。
              3ヶ月以内に施設・設備・作業方法を改善し、再測定が必要。
            </p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="font-bold text-red-700 mb-1">第3管理区分</p>
            <p className="text-xs">
              著しく不良。A測定の幾何平均が管理濃度以上、またはB測定が管理濃度以上。
              直ちに改善措置を講じ、改善完了まで呼吸用保護具着用が義務。
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          GSD（幾何標準偏差）を省略した場合は簡易判定（A測定平均値のみ）を行います。
          精確な判定には作業環境測定士が実施した測定値とGSDの使用を推奨します。
          出典: 作業環境測定基準（昭和51年労働省告示第46号）/ JISHA「作業環境測定ガイドブック」
        </p>
      </div>
    </div>
  );
}
