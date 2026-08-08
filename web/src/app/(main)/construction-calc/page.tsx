import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, ShieldAlert } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  ConstructionCalcHub,
  type CalcHubItem,
} from "@/components/construction-calc/calc-hub";
import {
  CONSTRUCTION_CALCULATORS,
  QUARANTINED_CONSTRUCTION_CALCULATORS,
} from "@/lib/construction-calc/registry";
import { resolveCalcCategory } from "@/lib/construction-calc/categories";
import { CALC_DISCLAIMER } from "@/lib/construction-calc/schema";

const DESCRIPTION =
  "土量換算、勾配表記換算、鉄筋質量、コンクリート数量の低リスクな算術を補助します。法令適合、構造安全、電気容量、吊り具の使用可否を判定する機能ではありません。";

export const metadata: Metadata = {
  alternates: { canonical: "/construction-calc" },
  title: "建設数量・表記換算ツール",
  description: DESCRIPTION,
};

const HUB_ITEMS: CalcHubItem[] = CONSTRUCTION_CALCULATORS.map((calculator) => ({
  slug: calculator.slug,
  shortTitle: calculator.shortTitle,
  summary: calculator.summary,
  basisLabel: calculator.basis[0].label.split("（")[0],
  category: resolveCalcCategory(calculator),
  keywords: calculator.keywords,
}));

export default function ConstructionCalcPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-900">
      <PageJsonLd
        name="建設数量・表記換算ツール"
        description={DESCRIPTION}
        path="/construction-calc"
      />
      <PageContainer paddingY="none" className="pt-6 pb-12">
        <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <Calculator
                className="h-5 w-5 text-white"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                建設数量・表記換算ツール
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {DESCRIPTION}
              </p>
            </div>
          </div>
        </header>

        <section
          role="note"
          aria-labelledby="calculator-boundary-title"
          className="mb-5 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <h2
            id="calculator-boundary-title"
            className="flex items-center gap-2 text-base font-bold"
          >
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            安全性・法令適合の判定は行いません
          </h2>
          <p className="mt-2 text-sm leading-6">
            吊り具、電気、仮設構造、アンカー、安全ネットなど
            {QUARANTINED_CONSTRUCTION_CALCULATORS.length}
            件の旧判定ツールは、メーカー証明・一次資料・独立ゴールドテストの再確認が終わるまで公開対象から外しています。
            使用可否は、製品証明書、設計条件、法令原文を確認し、有資格者または責任者が判断してください。
          </p>
          <Link
            href="/about/quality"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-amber-900 underline underline-offset-4 dark:text-amber-100"
          >
            データ品質と公開基準を確認する
          </Link>
        </section>

        <ConstructionCalcHub calcs={HUB_ITEMS} />

        <section
          aria-labelledby="calculator-notes-title"
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
        >
          <h2
            id="calculator-notes-title"
            className="text-sm font-bold text-slate-900 dark:text-white"
          >
            利用時の確認
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600 dark:text-slate-300">
            <li>入力値、単位、丸め方法を利用者が確認してください。</li>
            <li>結果を施工・発注・安全判断へ転記する前に責任者が承認してください。</li>
            <li>
              法令、設計図書、メーカー仕様、現地条件と食い違う場合は、この画面の結果を使用しないでください。
            </li>
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {CALC_DISCLAIMER}
          </p>
        </section>
      </PageContainer>
    </div>
  );
}
