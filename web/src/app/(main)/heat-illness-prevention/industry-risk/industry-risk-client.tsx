"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  Building2,
  FileText,
  ShieldAlert,
  ListChecks,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { INDUSTRY_HEAT_RULES } from "@/data/heat-illness-rules";

export function IndustryRiskClient() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("industry") ?? INDUSTRY_HEAT_RULES[0].id;

  const rule = useMemo(
    () => INDUSTRY_HEAT_RULES.find((r) => r.id === selected) ?? INDUSTRY_HEAT_RULES[0],
    [selected],
  );

  function handleChange(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("industry", id);
    router.replace(`/heat-illness-prevention/industry-risk?${next.toString()}`);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-amber-600" aria-hidden="true" />
          業種を選択
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          MHLW統計で熱中症発生が多い10業種から、現場の業種を選択してください。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INDUSTRY_HEAT_RULES.map((r) => {
            const active = r.id === rule.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleChange(r.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                }`}
                aria-pressed={active}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-amber-900">{rule.label}</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">{rule.riskProfile}</p>
      </section>

      {/* 結論：今すぐやる標準対策を先頭に */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-bold text-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          まずやること（標準対策）
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm leading-6 text-emerald-950">
          {rule.standardCountermeasures.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-bold text-rose-900">
          <FileText className="h-5 w-5 text-rose-700" aria-hidden="true" />
          R7改正での重点対応
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm leading-6 text-rose-900">
          {rule.r7ComplianceFocus.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-rose-800">
          詳細は{" "}
          <Link
            href="/heat-illness-prevention/r7-compliance"
            className="font-semibold underline hover:text-rose-700"
          >
            R7コンプライアンスチェックリスト
          </Link>
          を参照してください。
        </p>
      </section>

      {/* 背景・根拠は折りたたみ（結論を見たあとに必要な人だけ開く） */}
      <div className="space-y-3">
        <p className="px-1 text-xs font-semibold text-slate-500">
          背景・根拠（必要なときに開く）
        </p>

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-base font-bold text-slate-900 hover:text-amber-700">
            <ListChecks className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            主な暴露作業
            <ChevronDown
              className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-800">
            {rule.exposureTasks.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {t}
              </li>
            ))}
          </ul>
        </details>

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-base font-bold text-slate-900 hover:text-rose-700">
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
            リスク要因
            <ChevronDown
              className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-800">
            {rule.riskFactors.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                {t}
              </li>
            ))}
          </ul>
        </details>

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-base font-bold text-slate-900 hover:text-slate-600">
            <FileText className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            関連法令・指針
            <ChevronDown
              className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-slate-100 px-5 py-4">
            <ul className="space-y-1 text-sm leading-6 text-slate-800">
              {rule.lawReferences.map((t) => (
                <li key={t}>・{t}</li>
              ))}
            </ul>
            {rule.accidentReportSlug && (
              <p className="mt-3 text-xs text-slate-600">
                <Link
                  href={`/accidents-reports/${rule.accidentReportSlug}`}
                  className="inline-flex items-center gap-1 font-semibold text-amber-700 underline hover:text-amber-800"
                >
                  関連業種の事故分析レポートを見る
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </p>
            )}
          </div>
        </details>
      </div>

      <p className="text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本コンテンツは現場運用ガイドであり、個別作業の安全判断は事業者・産業医・職長が行ってください。
      </p>
    </div>
  );
}
