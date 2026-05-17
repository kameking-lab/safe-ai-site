"use client";

import { useMemo, useState } from "react";
import {
  ASBESTOS_WORK_LEVEL_LABELS_JA,
  BUILDING_CATEGORY_LABELS_JA,
  PROJECT_CATEGORY_LABELS_JA,
  REPORTING_REQUIREMENT_LABELS_JA,
  type AsbestosWorkLevel,
  type BuildingCategory,
  type ProjectCategory,
  type ProjectScope,
} from "@/types/asbestos";
import { buildPreWorkSummary } from "@/lib/asbestos-engine";

const FILED_WITH_LABELS: Record<string, string> = {
  "labour-standards-office": "労働基準監督署",
  "prefecture-or-city": "自治体（大気汚染防止法担当課）",
  "on-site-display": "現場掲示",
  "internal-record": "社内記録（保存義務）",
};

const FILED_WITH_BADGE: Record<string, string> = {
  "labour-standards-office": "bg-rose-100 text-rose-800",
  "prefecture-or-city": "bg-sky-100 text-sky-800",
  "on-site-display": "bg-amber-100 text-amber-800",
  "internal-record": "bg-slate-100 text-slate-800",
};

export function NotificationBuilder() {
  const [buildingCategory, setBuildingCategory] =
    useState<BuildingCategory>("non-residential");
  const [projectCategory, setProjectCategory] =
    useState<ProjectCategory>("demolition");
  const [contractValueJpyMan, setContractValueJpyMan] = useState<number>(500);
  const [workAreaSqm, setWorkAreaSqm] = useState<number>(150);
  const [constructionStartYear, setConstructionStartYear] = useState<number>(1995);
  const [workLevel, setWorkLevel] = useState<AsbestosWorkLevel | "">("level-2");

  const scope: ProjectScope = useMemo(
    () => ({
      buildingCategory,
      projectCategory,
      constructionStartYear,
      contractValueJpy: contractValueJpyMan * 10_000,
      workAreaSqm,
    }),
    [
      buildingCategory,
      projectCategory,
      constructionStartYear,
      contractValueJpyMan,
      workAreaSqm,
    ],
  );

  const summary = useMemo(
    () => buildPreWorkSummary(scope, workLevel === "" ? null : workLevel),
    [scope, workLevel],
  );

  return (
    <div>
      <section className="rounded-xl border border-amber-200 bg-white p-5 print:hidden md:p-6">
        <h2 className="text-base font-semibold text-slate-900">プロジェクト条件</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">建物用途</span>
            <select
              value={buildingCategory}
              onChange={(e) => setBuildingCategory(e.target.value as BuildingCategory)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(BUILDING_CATEGORY_LABELS_JA) as BuildingCategory[]).map(
                (b) => (
                  <option key={b} value={b}>
                    {BUILDING_CATEGORY_LABELS_JA[b]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">工事種別</span>
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value as ProjectCategory)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(PROJECT_CATEGORY_LABELS_JA) as ProjectCategory[]).map(
                (p) => (
                  <option key={p} value={p}>
                    {PROJECT_CATEGORY_LABELS_JA[p]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">着工年</span>
            <input
              type="number"
              min={1900}
              max={2030}
              value={constructionStartYear}
              onChange={(e) => setConstructionStartYear(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">請負金額（万円）</span>
            <input
              type="number"
              min={0}
              step={10}
              value={contractValueJpyMan}
              onChange={(e) => setContractValueJpyMan(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">対象床面積（m²）</span>
            <input
              type="number"
              min={0}
              step={1}
              value={workAreaSqm}
              onChange={(e) => setWorkAreaSqm(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">石綿レベル</span>
            <select
              value={workLevel}
              onChange={(e) => setWorkLevel(e.target.value as AsbestosWorkLevel | "")}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">未確定（事前調査前）</option>
              {(Object.keys(ASBESTOS_WORK_LEVEL_LABELS_JA) as AsbestosWorkLevel[]).map(
                (l) => (
                  <option key={l} value={l}>
                    {ASBESTOS_WORK_LEVEL_LABELS_JA[l]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            印刷する
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-900">届出書類チェックリスト</h2>
        <p className="mt-1 text-sm text-slate-600">
          報告区分：{REPORTING_REQUIREMENT_LABELS_JA[summary.reporting.requirement]}
        </p>
        {summary.forms.length === 0 ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            該当する届出書類はありません。事前調査自体の対象外の可能性があります。事前調査・報告判定ツールで前提を再確認してください。
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {summary.forms.map((f, idx) => (
              <li
                key={f.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:break-inside-avoid"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {idx + 1}. {f.name}
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${FILED_WITH_BADGE[f.filedWith]}`}
                  >
                    {FILED_WITH_LABELS[f.filedWith]}
                  </span>
                </div>
                <dl className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-600">根拠</dt>
                    <dd>{f.trigger}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">期限</dt>
                    <dd>{f.deadline}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-sm text-slate-800">{f.contents}</p>
                {f.note && (
                  <p className="mt-1 text-xs text-slate-500">補足：{f.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
