"use client";

import Link from "next/link";
import { useState } from "react";
import { FUNDING_SCHEMES, FUNDING_VERIFIED_ON } from "@/data/business-funding";
import {
  estimateReskillingCost,
  formatYen,
  type TrainingEstimateInput,
} from "@/lib/subsidy-calculator";

const fieldClass =
  "mt-1 min-h-[44px] w-full rounded-xl border border-slate-400 bg-white px-3 py-2 text-slate-950 focus-visible:ring-4 focus-visible:ring-emerald-700/30";
const INITIAL: TrainingEstimateInput = {
  companySize: "small",
  method: "classroom",
  hours: 10,
  eligibleCostPerPerson: 100_000,
  conditionsConfirmed: false,
};

export default function SubsidiesCalculatorPage() {
  const [input, setInput] = useState(INITIAL);
  const [result, setResult] = useState<ReturnType<typeof estimateReskillingCost>>(null);
  const scheme = FUNDING_SCHEMES.find((item) => item.id === "reskilling");
  function update<K extends keyof TrainingEstimateInput>(key: K, value: TrainingEstimateInput[K]) {
    setInput((previous) => ({ ...previous, [key]: value }));
    setResult(null);
  }
  const valid = estimateReskillingCost(input) !== null;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-black text-slate-950">研修の経費助成・参考試算</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        事業展開等リスキリング支援コースの、対象条件を確認済みの研修について1人分を試算します。申請資格や支給額の判定ではありません。
      </p>
      <p className="mt-2 text-sm text-slate-700">
        公式情報の確認日：<time dateTime={FUNDING_VERIFIED_ON}>2026年10月14日</time>
        。令和9年度の継続は未確認です。
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        建設労働者の法定教育は別コースです。設備補助やほかの研修制度は、人数・投資額だけでは試算できません。
      </p>
      <Link
        href="/subsidies"
        className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-900 underline"
      >
        目的別の制度・必要条件を見る
      </Link>
      <form
        className="mt-4 space-y-4 rounded-2xl border border-slate-300 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setResult(estimateReskillingCost(input));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-900">
            企業区分（要領で確認）
            <select
              className={fieldClass}
              value={input.companySize}
              onChange={(event) =>
                update("companySize", event.target.value as TrainingEstimateInput["companySize"])
              }
            >
              <option value="small">中小企業</option>
              <option value="large">大企業</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-900">
            訓練方法
            <select
              className={fieldClass}
              value={input.method}
              onChange={(event) =>
                update("method", event.target.value as TrainingEstimateInput["method"])
              }
            >
              <option value="classroom">対面・同時双方向</option>
              <option value="elearning">eラーニング</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-900">
            対象訓練時間（eラーニングは標準学習時間）
            <input
              className={fieldClass}
              type="number"
              min={10}
              step="any"
              required
              value={input.hours}
              onChange={(event) => update("hours", event.target.valueAsNumber)}
            />
          </label>
          <label className="text-sm font-bold text-slate-900">
            対象経費・1人分（円）
            <input
              className={fieldClass}
              type="number"
              min={1}
              step={1}
              required
              value={input.eligibleCostPerPerson}
              onChange={(event) => update("eligibleCostPerPerson", event.target.valueAsNumber)}
            />
          </label>
        </div>
        <p className="text-sm leading-6 text-slate-700">
          設備費・対象外の講座費用・値引き等を除いた、労働局で確認した対象経費を入力してください。掲載の60分・90分講習だけでは10時間要件を満たしません。
        </p>
        <label className="flex min-h-[44px] items-start gap-3 text-sm leading-6 text-slate-900">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={input.conditionsConfirmed}
            onChange={(event) => update("conditionsConfirmed", event.target.checked)}
          />
          <span>
            雇用保険・DX等の事業計画・職務に直結する内容・事前の計画届・受講記録などの対象条件を公式窓口で確認済みです。eラーニングの場合は年度1回の制限も確認済みです。
          </span>
        </label>
        <button
          type="submit"
          disabled={!valid}
          className="min-h-[44px] rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-600 focus-visible:ring-4 focus-visible:ring-emerald-700/30"
        >
          1人分の参考額を計算する
        </button>
      </form>
      <div aria-live="polite" aria-atomic="true" className="mt-5">
        {result ? (
          <section className="rounded-2xl border border-emerald-800 bg-emerald-50 p-5">
            <h2 className="font-black text-slate-950">条件を満たす場合の参考額（1人分）</h2>
            <p className="mt-2 text-2xl font-black text-emerald-900">
              経費助成 {formatYen(result.amount)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-800">
              率 {result.rate * 100}%・助成上限 {formatYen(result.cap)}
              。対象経費から経費助成を引いた参考差額 {formatYen(result.remainingCost)}。
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-800">
              賃金助成は含みません。事業所の年度上限・他の訓練・端数処理等により実際の支給額は変わります。全額の立替が必要で、採択・支給を保証しません。
            </p>
          </section>
        ) : (
          <p className="text-sm text-slate-700">対象条件の確認後に参考額を計算できます。</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5">
        {scheme?.sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-900 underline"
          >
            {source.label}（別タブ）
          </a>
        ))}
        <Link
          href="/services/automation#funding"
          className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-900 underline"
        >
          研修・申請準備の相談を見る
        </Link>
      </div>
    </div>
  );
}
