"use client";

import Link from "next/link";
import type { AccidentCase, AccidentType, AccidentWorkCategory } from "@/lib/types/domain";

const ACCIDENT_TYPE_ORDER: AccidentType[] = [
  "墜落",
  "転倒",
  "挟まれ",
  "飛来落下",
  "感電",
];

type AccidentDatabasePanelProps = {
  cases: AccidentCase[];
  allCases: AccidentCase[];
  selectedType: AccidentType | "すべて";
  selectedCategory: AccidentWorkCategory | "すべて";
  onSelectType: (type: AccidentType | "すべて") => void;
  onSelectCategory: (category: AccidentWorkCategory | "すべて") => void;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string | null;
};

const CATEGORY_ORDER: AccidentWorkCategory[] = ["高所", "電気", "足場", "重機", "一般"];

function filterOptions(cases: AccidentCase[]) {
  const set = new Set<AccidentType>();
  for (const item of cases) {
    set.add(item.type);
  }
  const ordered = ACCIDENT_TYPE_ORDER.filter((type) => set.has(type));
  return ["すべて", ...ordered] as const;
}

export function AccidentDatabasePanel({
  cases,
  allCases,
  selectedType,
  selectedCategory,
  onSelectType,
  onSelectCategory,
  status,
  errorMessage,
}: AccidentDatabasePanelProps) {
  const options = filterOptions(allCases);
  const categoryOptions = ["すべて", ...CATEGORY_ORDER] as const;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">事故データベース</h2>
          <p className="mt-1 text-xs text-slate-600">
            カテゴリ・事故種別で絞り込み、要因と再発防止を朝礼・学習・KYに接続できます。
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
          mock
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">カテゴリ</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryOptions.map((option) => {
              const isActive = option === selectedCategory;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectCategory(option)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label htmlFor="accident-type-filter" className="block text-xs font-semibold text-slate-700">
            事故種別
          </label>
          <select
            id="accident-type-filter"
            value={selectedType}
            onChange={(event) => onSelectType(event.target.value as AccidentType | "すべて")}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {status === "loading" ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            事故データを読み込み中です...
          </p>
        ) : status === "error" ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage ?? "事故データを取得できませんでした。"}
          </p>
        ) : cases.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            条件に一致する事故データがありません。
          </p>
        ) : (
          cases.map((accident) => (
            <article
              key={accident.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              aria-label={`事故データ ${accident.title}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                  {accident.type}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                  {accident.workCategory}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  {accident.severity}
                </span>
                <span className="text-xs text-slate-500">{accident.occurredOn}</span>
              </div>

              <h3 className="mt-2 text-sm font-semibold text-slate-900">{accident.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{accident.summary}</p>

              <dl className="mt-2 space-y-1 text-xs text-slate-700">
                <div>
                  <dt className="inline font-semibold text-slate-900">主な原因:</dt>
                  <dd className="inline"> {accident.mainCauses.join(" / ")}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-900">再発防止の要点:</dt>
                  <dd className="inline"> {accident.preventionPoints.join(" / ")}</dd>
                </div>
              </dl>

              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href="/e-learning"
                  className="text-xs font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2"
                >
                  この事例で学習する
                </Link>
                <Link
                  href="/ky"
                  className="text-xs font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2"
                >
                  KY用紙へ反映する
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
