"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Scale, Search, ExternalLink } from "lucide-react";
import {
  COURT_CASES,
  COURT_CASE_ISSUES,
  COURT_CASE_FIELDS,
  type CourtCaseIssue,
  type CourtCaseField,
} from "@/data/court-cases";

const issueColor: Record<CourtCaseIssue, string> = {
  安全配慮義務: "bg-emerald-100 text-emerald-800 border-emerald-200",
  過失相殺: "bg-amber-100 text-amber-800 border-amber-200",
  "元請・下請責任": "bg-sky-100 text-sky-800 border-sky-200",
  "国・行政責任": "bg-violet-100 text-violet-800 border-violet-200",
  業務起因性: "bg-teal-100 text-teal-800 border-teal-200",
  労働者性: "bg-rose-100 text-rose-800 border-rose-200",
};

export function CourtCasesBrowser() {
  const [issue, setIssue] = useState<CourtCaseIssue | "">("");
  const [field, setField] = useState<CourtCaseField | "">("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const kw = q.trim();
    return COURT_CASES.filter((c) => {
      if (issue && !c.issues.includes(issue)) return false;
      if (field && c.field !== field) return false;
      if (kw) {
        const hay = `${c.name} ${c.oneLine} ${c.summary} ${c.holding} ${c.court}`;
        if (!hay.includes(kw)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [issue, field, q]);

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">キーワード（事件名・内容）</span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="例: 安全配慮義務、墜落、過労、石綿"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                aria-label="判例をキーワードで絞り込む"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">争点</span>
            <select
              value={issue}
              onChange={(e) => setIssue(e.target.value as CourtCaseIssue | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:w-48"
            >
              <option value="">すべての争点</option>
              {COURT_CASE_ISSUES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">分野</span>
            <select
              value={field}
              onChange={(e) => setField(e.target.value as CourtCaseField | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:w-44"
            >
              <option value="">すべての分野</option>
              {COURT_CASE_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {filtered.length} 件を表示（全 {COURT_CASES.length} 件・すべて実在する確定判例）
          {(issue || field || q) && (
            <button
              type="button"
              onClick={() => { setIssue(""); setField(""); setQ(""); }}
              className="ml-2 font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              絞り込みを解除
            </button>
          )}
        </p>
      </div>

      {/* 一覧 */}
      <ul className="space-y-3">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link
              href={`/court-cases/${c.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {c.issues.map((i) => (
                  <span key={i} className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${issueColor[i]}`}>{i}</span>
                ))}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.field}</span>
              </div>
              <h2 className="mt-2 flex items-start gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {c.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {c.court}　{c.dateLabelJa}（{c.date.replace(/-/g, "/")}）{c.citation ? `　${c.citation}` : ""}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{c.oneLine}</p>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
          条件に合う判例がありません。絞り込みを解除してください。
        </p>
      )}

      {/* 出典・免責 */}
      <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        <p className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> 出典・ご利用にあたって
        </p>
        <p className="mt-1">
          各判例の要旨は、裁判所「裁判例検索」・厚生労働省・法務省・判例集等の公表情報をもとにした
          <strong className="font-semibold">当サイトによる要約</strong>です。正確な内容は各判例の出典（判決原文）をご確認ください。
          事件名は実務・学術で定着した通称を用い、当事者の特定情報は掲載していません。
          掲載は実在を確認できた確定判例に限っています。
        </p>
        <p className="mt-1">
          本コーナーは一般的な情報提供であり、個別の事案に対する法的助言ではありません。
          具体的な対応は、弁護士・社会保険労務士・労働安全/衛生コンサルタント等の専門家にご相談ください。
        </p>
      </footer>
    </div>
  );
}
