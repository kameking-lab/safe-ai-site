"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  KY_INDUSTRY_IDS,
  KY_INDUSTRY_LABELS,
  KY_WORK_TYPE_IDS,
  KY_WORK_TYPE_LABELS,
  type KyIndustryId,
  type KyWorkTypeId,
} from "@/types/ky-example";
import { KY_EXAMPLES, filterKyExamples } from "@/data/ky-examples";
import { ConclusionCard } from "@/components/ui/conclusion-card";

export function KyExamplesBrowser() {
  const [industry, setIndustry] = useState<KyIndustryId | "">("");
  const [workType, setWorkType] = useState<KyWorkTypeId | "">("");

  const filtered = useMemo(
    () =>
      filterKyExamples({
        industry: industry || undefined,
        workType: workType || undefined,
      }),
    [industry, workType]
  );

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">KY事例データベース</h1>
          <p className="mt-1 text-sm text-slate-600">
            建設・製造・運輸・医療福祉・サービスの5業種×10作業別に整理した {KY_EXAMPLES.length} 件の参考KY事例。
            出典は厚労省・中災防・建災防の公開教材を独自要約しています。
          </p>
          <p className="mt-2">
            <Link
              href="/ky"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              KY用紙の作成へ進む →
            </Link>
          </p>
        </header>

        <Filters
          industry={industry}
          workType={workType}
          onIndustry={setIndustry}
          onWorkType={setWorkType}
        />

        {/* 結論カード（柱0）: 該当事例の件数を3秒で。0件は絞り込み変更へ誘導。 */}
        <div className="mt-4">
          {filtered.length === 0 ? (
            <ConclusionCard
              tone="warning"
              value={0}
              unit="件"
              title="該当なし"
              description="いまの絞り込み条件に合致する事例がありません。業種・作業種別の絞り込みを変えてください。"
            />
          ) : (
            <ConclusionCard
              tone="info"
              value={filtered.length}
              unit="件"
              title="該当事例"
              description={
                industry || workType
                  ? `全${KY_EXAMPLES.length}件のうち、いまの絞り込みに一致する事例です。`
                  : "業種・作業種別で絞り込むと、現場に近い事例だけを表示できます。"
              }
            />
          )}
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <li
              key={ex.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                  {KY_INDUSTRY_LABELS[ex.industry]}
                </span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                  {KY_WORK_TYPE_LABELS[ex.workType]}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900">{ex.title}</h2>
              <section className="text-[11px] text-slate-700">
                <p className="font-semibold text-rose-700">危険要因</p>
                <ul className="ml-4 list-disc space-y-0.5">
                  {ex.hazards.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </section>
              <section className="text-[11px] text-slate-700">
                <p className="font-semibold text-amber-700">リスク</p>
                <ul className="ml-4 list-disc space-y-0.5">
                  {ex.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>
              <section className="text-[11px] text-slate-700">
                <p className="font-semibold text-emerald-700">対策</p>
                <ul className="ml-4 list-disc space-y-0.5">
                  {ex.countermeasures.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </section>
              <footer className="mt-auto pt-2 text-[10px] text-slate-500">
                出典: {ex.source.label}
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Filters(props: {
  industry: KyIndustryId | "";
  workType: KyWorkTypeId | "";
  onIndustry: (v: KyIndustryId | "") => void;
  onWorkType: (v: KyWorkTypeId | "") => void;
}) {
  const { industry, workType, onIndustry, onWorkType } = props;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="mb-1.5 text-[11px] font-bold text-slate-700">業種で絞り込む</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip selected={industry === ""} onClick={() => onIndustry("")}>
            すべて
          </Chip>
          {KY_INDUSTRY_IDS.map((id) => (
            <Chip
              key={id}
              selected={industry === id}
              onClick={() => onIndustry(id)}
            >
              {KY_INDUSTRY_LABELS[id]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold text-slate-700">作業種別で絞り込む</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip selected={workType === ""} onClick={() => onWorkType("")}>
            すべて
          </Chip>
          {KY_WORK_TYPE_IDS.map((id) => (
            <Chip
              key={id}
              selected={workType === id}
              onClick={() => onWorkType(id)}
            >
              {KY_WORK_TYPE_LABELS[id]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip(props: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  const { children, selected, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-semibold transition ${
        selected
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
      }`}
    >
      {children}
    </button>
  );
}
