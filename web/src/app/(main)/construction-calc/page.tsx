import type { Metadata } from "next";
import { Calculator, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { CalcAiOnebox } from "@/components/construction-calc/calc-ai-onebox";
import { ConstructionCalcHub, type CalcHubItem } from "@/components/construction-calc/calc-hub";
import { CONSTRUCTION_CALCULATORS } from "@/lib/construction-calc/registry";
import { resolveCalcCategory } from "@/lib/construction-calc/categories";
import { CALC_DISCLAIMER } from "@/lib/construction-calc/schema";
import { Mascot } from "@/components/mascot";

const DESCRIPTION =
  "玉掛けワイヤ（モード係数・逆引き）・単管足場・掘削勾配・土量換算・クレーン必要定格・型枠支保工・電線許容電流・安全ネットを、安衛則/クレーン則/告示/内線規程の根拠つきで即計算。分野の束と現場のことばで探せて、自由記述からAIが計算機を案内します。";

export const metadata: Metadata = {
  alternates: { canonical: "/construction-calc" },
  title: "建設計算（法令根拠つき現場計算機）",
  description: DESCRIPTION,
};

/** registry → ハブ表示用のプレーンデータ（compute 関数を除いた serializable 射影）。 */
const HUB_ITEMS: CalcHubItem[] = CONSTRUCTION_CALCULATORS.map((c) => ({
  slug: c.slug,
  shortTitle: c.shortTitle,
  summary: c.summary,
  basisLabel: c.basis[0].label.split("（")[0],
  category: resolveCalcCategory(c),
  keywords: c.keywords,
}));

export default function ConstructionCalcPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-900">
      <PageJsonLd name="建設計算" description={DESCRIPTION} path="/construction-calc" />
      <PageContainer paddingY="none" className="pt-6 pb-12">
        <header className="mb-5 flex items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-transparent p-4 dark:from-emerald-950/25 dark:via-slate-900 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
              <Calculator className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                建設計算
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                法令根拠つきの現場計算機 — 入力すると同時に判定します
              </p>
            </div>
          </div>
          <Mascot variant="tamakake-signal" size="lg" alt="" className="hidden shrink-0 sm:block" />
        </header>

        <CalcAiOnebox />

        <ConstructionCalcHub calcs={HUB_ITEMS} />

        <section
          aria-label="このコーナーの考え方"
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            計算の信頼性について
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600 dark:text-slate-400">
            <li>
              計算はすべて、労働安全衛生規則・クレーン等安全規則等の基準を実装した検証済みの計算式（単体テストで数値固定）が行います。AIは計算をしません。
            </li>
            <li>AIの役割は「自由記述から計算機と入力値を用意する」「結果をやさしく解説する」の2つだけです。読み取れない値は質問でお返しし、勝手に補完しません。</li>
            <li>全計算機に根拠条文（e-Gov原文・法令ナビ）と注意事項を明記しています。</li>
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {CALC_DISCLAIMER}
          </p>
        </section>
      </PageContainer>
    </div>
  );
}
