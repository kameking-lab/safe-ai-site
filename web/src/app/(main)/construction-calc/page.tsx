import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  Cable,
  Mountain,
  Construction,
  ChevronRight,
  BookOpenCheck,
  ShieldCheck,
  Truck,
  HardHat,
  Layers,
  Zap,
  Droplets,
  Boxes,
  ClipboardCheck,
  Ruler,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { CalcAiOnebox } from "@/components/construction-calc/calc-ai-onebox";
import { CONSTRUCTION_CALCULATORS } from "@/lib/construction-calc/registry";
import { CALC_DISCLAIMER } from "@/lib/construction-calc/schema";
import { Mascot } from "@/components/mascot";

const DESCRIPTION =
  "玉掛けワイヤ（モード係数・逆引き）・単管足場・掘削勾配・土量換算・クレーン必要定格・型枠支保工・電線許容電流を、安衛則/クレーン則/内線規程の根拠つきで即計算。プルダウンと数値入力ですぐ使え、自由記述からAIが計算機を案内します。";

export const metadata: Metadata = {
  alternates: { canonical: "/construction-calc" },
  title: "建設計算（法令根拠つき現場計算機）",
  description: DESCRIPTION,
};

const CALC_ICONS: Record<string, LucideIcon> = {
  "sling-wire-load": Cable,
  "scaffold-tankan-check": Construction,
  "excavation-slope": Mountain,
  "soil-volume-conversion": Truck,
  "crane-rated-load": HardHat,
  "formwork-shoring-check": Layers,
  "cable-ampacity": Zap,
  "water-pressure": Droplets,
  "formwork-lateral-pressure": Boxes,
  "shoring-member-check": ClipboardCheck,
  "rebar-mass": Ruler,
};

/** 量産キュー（BACKLOG-construction-calc.md）の先頭から。空約束にしない範囲で予告 */
const UPCOMING = [
  "つりチェーン・繊維スリングの安全係数（クレーン則213条の2）",
  "昇降設備・はしご/脚立の基準（安衛則526〜528条）",
  "酸素欠乏危険場所の換気量（酸欠則）",
];

export default function ConstructionCalcPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-900">
      <PageJsonLd name="建設計算" description={DESCRIPTION} path="/construction-calc" />
      <PageContainer paddingY="none" className="pt-6 pb-12">
        <header className="mb-5 flex items-start justify-between gap-4">
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

        <section aria-label="計算機一覧" className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">計算機を選ぶ</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONSTRUCTION_CALCULATORS.map((calc) => {
              const Icon = CALC_ICONS[calc.slug] ?? Calculator;
              return (
                <Link
                  key={calc.slug}
                  href={`/construction-calc/${calc.slug}`}
                  className="group flex min-h-[44px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                      <Icon className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {calc.shortTitle}
                    </h3>
                  </div>
                  <p className="mt-2 flex-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    {calc.summary}
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    根拠: {calc.basis[0].label.split("（")[0]}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 group-hover:underline dark:text-amber-400">
                    計算する
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-label="今後追加予定" className="mt-8">
          <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">今後追加予定の計算機</h2>
          <ul className="flex flex-wrap gap-2">
            {UPCOMING.map((u) => (
              <li
                key={u}
                className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                {u}
              </li>
            ))}
          </ul>
        </section>

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
