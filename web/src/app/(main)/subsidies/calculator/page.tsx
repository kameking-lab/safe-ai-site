"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Users,
  Banknote,
  FileText,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  calculateSubsidies,
  formatYen,
  MEASURE_OPTIONS,
  INDUSTRY_OPTIONS,
  type CalculatorInput,
  type IndustryType,
  type MeasureType,
  type SubsidyEstimate,
} from "@/lib/subsidy-calculator";

const DEFAULT_INPUT: CalculatorInput = {
  industry: "construction",
  employees: 30,
  annualRevenueManten: 5000,
  measures: [],
  investmentManten: 100,
};

function ResultCard({ est, investment }: { est: SubsidyEstimate; investment: number }) {
  const [open, setOpen] = useState(false);
  const investmentYen = investment * 10000;

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
        est.eligible
          ? "border-emerald-300 ring-1 ring-emerald-100"
          : "border-slate-200 opacity-70"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {est.eligible ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          )}
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">{est.name}</h3>
          {est.eligible && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              申請対象
            </span>
          )}
        </div>
        <a
          href={est.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          公式ページ <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <p className="mt-1 text-[11px] text-slate-500">{est.operator}</p>

      {est.eligible ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-[10px] font-semibold text-emerald-700">支給見込み額（概算）</p>
            <p className="mt-1 text-lg font-bold text-emerald-800">
              {formatYen(est.estimatedAmount)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold text-slate-600">自社負担額（概算）</p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {formatYen(Math.max(0, investmentYen - est.estimatedAmount))}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-[10px] font-semibold text-amber-700">補助上限額</p>
            <p className="mt-1 text-lg font-bold text-amber-800">{formatYen(est.maxAmount)}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">非該当の理由</p>
          <ul className="mt-1.5 space-y-1">
            {est.ineligibleReasons.map((r) => (
              <li key={r} className="flex items-start gap-1.5 text-xs text-slate-600">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {est.eligible && (
        <>
          <p className="mt-2 text-[11px] text-slate-500">{est.rateNote}</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            申請期限・必要書類を見る
            {open ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          {open && (
            <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              <div>
                <p className="font-semibold text-slate-600">申請期限</p>
                <p className="mt-0.5">{est.deadline}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">主な必要書類</p>
                <ul className="mt-1.5 space-y-1">
                  {est.requiredDocs.map((doc) => (
                    <li key={doc} className="flex items-start gap-1.5">
                      <FileText className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-600">申請ポイント</p>
                <p className="mt-0.5 leading-5">{est.applicationNote}</p>
              </div>
              <p className="text-[10px] text-slate-400">出典: {est.sourceNote}</p>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default function SubsidyCalculatorPage() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT);
  const [results, setResults] = useState<SubsidyEstimate[] | null>(null);

  function toggleMeasure(key: MeasureType) {
    setInput((prev) => ({
      ...prev,
      measures: prev.measures.includes(key)
        ? prev.measures.filter((m) => m !== key)
        : [...prev.measures, key],
    }));
  }

  function handleCalculate() {
    if (input.measures.length === 0 || input.investmentManten <= 0) return;
    const res = calculateSubsidies(input);
    res.sort((a, b) => b.estimatedAmount - a.estimatedAmount);
    setResults(res);
  }

  const eligibleCount = results?.filter((r) => r.eligible).length ?? 0;
  const topAmount = results
    ? Math.max(0, ...results.filter((r) => r.eligible).map((r) => r.estimatedAmount))
    : 0;

  const canCalculate = input.measures.length > 0 && input.investmentManten > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <PageHeader
        title="助成金 支給額試算ツール"
        description="業種・人数・施策を入力して、申請できる助成金と概算支給額を確認"
        icon={Calculator}
        iconColor="emerald"
        badge="無料試算"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        {/* 入力フォーム */}
        <section className="space-y-5">
          {/* 事業者情報 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <Building2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              事業者情報
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="industry">
                  業種
                </label>
                <select
                  id="industry"
                  value={input.industry}
                  onChange={(e) =>
                    setInput((p) => ({ ...p, industry: e.target.value as IndustryType }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="employees">
                  従業員数（人）
                </label>
                <input
                  id="employees"
                  type="number"
                  min={1}
                  max={9999}
                  value={input.employees}
                  onChange={(e) =>
                    setInput((p) => ({ ...p, employees: Math.max(1, parseInt(e.target.value) || 1) }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="revenue">
                  年商（万円）
                </label>
                <input
                  id="revenue"
                  type="number"
                  min={0}
                  step={100}
                  value={input.annualRevenueManten}
                  onChange={(e) =>
                    setInput((p) => ({ ...p, annualRevenueManten: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  参考値として使用します。助成金の条件確認には使用しません。
                </p>
              </div>
            </div>
          </div>

          {/* 実施したい施策 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <Users className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              実施したい施策
              <span className="text-[11px] font-normal text-slate-500">（複数選択可）</span>
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MEASURE_OPTIONS.map((opt) => {
                const selected = input.measures.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleMeasure(opt.key)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300"
                        : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{opt.description}</p>
                    {selected && (
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            {input.measures.length === 0 && (
              <p className="mt-2 text-[11px] text-amber-600">1つ以上選択してください</p>
            )}
          </div>

          {/* 投資予定額 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <Banknote className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              投資予定額
            </h2>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="investment">
                設備・教育・システム等への投資予定額（万円）
              </label>
              <input
                id="investment"
                type="number"
                min={1}
                step={10}
                value={input.investmentManten}
                onChange={(e) =>
                  setInput((p) => ({ ...p, investmentManten: Math.max(1, parseInt(e.target.value) || 1) }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                助成対象経費の概算を入力してください（税抜き）
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow transition ${
              canCalculate
                ? "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            <Calculator className="h-4 w-4" aria-hidden="true" />
            申請可能な助成金を試算する
          </button>
        </section>

        {/* 試算結果 */}
        <aside className="space-y-4">
          {results === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Calculator className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                左フォームを入力して
                <br />「試算する」ボタンを押してください
              </p>
            </div>
          ) : (
            <>
              {/* サマリー */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-800">試算結果サマリー</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                    <p className="text-[10px] text-slate-500">該当助成金数</p>
                    <p className="text-2xl font-bold text-emerald-700">{eligibleCount}</p>
                    <p className="text-[10px] text-slate-400">件</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                    <p className="text-[10px] text-slate-500">最大支給見込み額</p>
                    <p className="text-xl font-bold text-emerald-700">{formatYen(topAmount)}</p>
                    <p className="text-[10px] text-slate-400">（最高額の制度1件）</p>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-emerald-700">
                  ※ 複数の助成金に同一経費を重複申請できない場合があります
                </p>
              </div>

              {/* 免責事項 */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-[11px] leading-5 text-amber-800">
                  <span className="font-bold">免責事項：</span>
                  本試算は概算であり、実際の支給額・採択を保証するものではありません。
                  各省庁の公式ページ・所管窓口で最新条件をご確認ください。
                </p>
              </div>

              {/* 助成金カード一覧 */}
              <div className="space-y-3">
                {results.map((est) => (
                  <ResultCard key={est.id} est={est} investment={input.investmentManten} />
                ))}
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Phone className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  申請代行・専門家相談
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  助成金の申請手続きは複雑で、書類不備による不採択リスクがあります。
                  社会保険労務士（SR士）や中小企業診断士への相談をお勧めします。
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/contact"
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    無料相談を申し込む
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/subsidies"
                    className="flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    助成金ガイドに戻る
                  </Link>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <p className="mt-10 text-center text-xs text-slate-400">
        ※ 本ページの試算は公式発表の補助率・上限額をもとにした概算です。制度は頻繁に改正されます。
        申請前に必ず各所管庁の最新公募要領をご確認ください。
        出典：厚生労働省「事業主の方へ」各助成金公式ページ・独立行政法人労働者健康安全機構（2026年4月確認）
      </p>
    </main>
  );
}
