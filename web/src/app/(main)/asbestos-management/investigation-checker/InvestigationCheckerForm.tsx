"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BUILDING_CATEGORY_LABELS_JA,
  PROJECT_CATEGORY_LABELS_JA,
  REPORTING_REQUIREMENT_LABELS_JA,
  type BuildingCategory,
  type ProjectCategory,
  type ProjectScope,
} from "@/types/asbestos";
import { buildPreWorkSummary } from "@/lib/asbestos-engine";
import { asbestosScopeToQuery } from "@/lib/asbestos-scope-query";

const BUILDING_OPTIONS: BuildingCategory[] = [
  "non-residential",
  "residential-multi",
  "residential-detached",
  "civil-engineering",
];

const PROJECT_OPTIONS: ProjectCategory[] = [
  "demolition",
  "renovation",
  "maintenance",
  "new-build",
];

const CURRENT_YEAR = new Date().getFullYear();

export function InvestigationCheckerForm() {
  const [buildingCategory, setBuildingCategory] =
    useState<BuildingCategory>("non-residential");
  const [projectCategory, setProjectCategory] =
    useState<ProjectCategory>("demolition");
  const [constructionStartYear, setConstructionStartYear] = useState<number>(1995);
  const [contractValueJpyMan, setContractValueJpyMan] = useState<number>(300);
  const [workAreaSqm, setWorkAreaSqm] = useState<number>(120);
  const [asbestosKnownPresent, setAsbestosKnownPresent] = useState<boolean>(false);

  const scope: ProjectScope = useMemo(
    () => ({
      buildingCategory,
      projectCategory,
      constructionStartYear,
      contractValueJpy: contractValueJpyMan * 10_000,
      workAreaSqm,
      asbestosKnownPresent,
    }),
    [
      buildingCategory,
      projectCategory,
      constructionStartYear,
      contractValueJpyMan,
      workAreaSqm,
      asbestosKnownPresent,
    ],
  );

  const summary = useMemo(() => buildPreWorkSummary(scope, null), [scope]);

  // Step 1 → Step 2 へ入力条件を引き継ぐためのクエリ。石綿レベルは事前調査前で
  // 未確定のため付けない（届出書類リスト側で選択する）。
  const carryQuery = useMemo(
    () =>
      asbestosScopeToQuery({
        buildingCategory,
        projectCategory,
        constructionStartYear,
        contractValueJpyMan,
        workAreaSqm,
        asbestosKnownPresent,
      }),
    [
      buildingCategory,
      projectCategory,
      constructionStartYear,
      contractValueJpyMan,
      workAreaSqm,
      asbestosKnownPresent,
    ],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-stone-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold text-slate-900">プロジェクト情報</h2>
        <p className="mt-1 text-xs text-slate-500">
          現場入力データ — リアルタイムで右の判定結果が更新されます。
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">建物用途</span>
            <select
              value={buildingCategory}
              onChange={(e) => setBuildingCategory(e.target.value as BuildingCategory)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            >
              {BUILDING_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {BUILDING_CATEGORY_LABELS_JA[b]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">工事種別</span>
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value as ProjectCategory)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            >
              {PROJECT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PROJECT_CATEGORY_LABELS_JA[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">着工年（西暦）</span>
            <input
              type="number"
              min={1900}
              max={CURRENT_YEAR}
              value={constructionStartYear}
              onChange={(e) => setConstructionStartYear(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-slate-500">
              2006年9月以前は石綿含有建材使用の可能性が高い（参考）。
            </span>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">請負金額（万円・税込）</span>
            <input
              type="number"
              min={0}
              step={10}
              value={contractValueJpyMan}
              onChange={(e) => setContractValueJpyMan(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-slate-500">100 万円以上で労基署報告対象。</span>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">対象床面積（m²）</span>
            <input
              type="number"
              min={0}
              step={1}
              value={workAreaSqm}
              onChange={(e) => setWorkAreaSqm(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-slate-500">解体は 80 m² 以上で大防法対象。</span>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={asbestosKnownPresent}
              onChange={(e) => setAsbestosKnownPresent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-stone-600 focus:ring-stone-400"
            />
            <span className="text-sm text-slate-800">
              事前情報や過去調査から、石綿含有建材の存在が判明している
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold text-slate-900">判定結果</h2>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            事前調査
          </p>
          <p className="mt-1 text-sm font-bold text-amber-900">
            {summary.investigation.investigationRequired
              ? "事前調査義務あり"
              : "事前調査義務なし（新築のみ）"}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            <li>
              建築物石綿含有建材調査者：
              {summary.investigation.qualifiedInvestigatorRequired ? "必須" : "不要（工作物等）"}
            </li>
            <li>
              石綿含有の推定：
              {summary.investigation.presumedContaining
                ? "含有とみなして調査"
                : "禁止後建築のため低リスク"}
            </li>
          </ul>
          <p className="mt-2 text-xs text-amber-900">{summary.investigation.rationale}</p>
        </div>

        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
            報告義務
          </p>
          <p className="mt-1 text-sm font-bold text-rose-900">
            {REPORTING_REQUIREMENT_LABELS_JA[summary.reporting.requirement]}
          </p>
          <p className="mt-2 text-xs text-rose-900">{summary.reporting.rationale}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            判定根拠条文
          </p>
          <ul className="mt-2 space-y-2 text-xs text-slate-700">
            {[
              ...summary.investigation.lawReferences,
              ...summary.reporting.lawReferences,
            ].map((lr, idx) => (
              <li key={`${lr.name}-${idx}`} className="rounded border border-slate-200 bg-slate-50 p-2">
                <p className="font-semibold text-slate-900">{lr.name}</p>
                {lr.articles && lr.articles.length > 0 && (
                  <p className="text-slate-600">{lr.articles.join("・")}</p>
                )}
                <p className="mt-1 text-slate-700">{lr.summary}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/asbestos-management/notification-builder?${carryQuery}`}
            className="inline-flex items-center gap-1 rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          >
            この条件で届出書類リストを作成 →
          </Link>
          <Link
            href="/asbestos-management/work-plan-template"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            作業計画テンプレートを見る →
          </Link>
        </div>
      </section>
    </div>
  );
}
