"use client";

import Link from "next/link";
import {
  LazyChemicalRaExtras,
  LazyMixtureRaPanel,
  LazySavedRaList,
  LazySdsUploadPanel,
} from "@/components/chemical/lazy-secondary-panels";
import { PageContainer } from "@/components/layout";
import { TransientChemicalLink } from "@/components/home-safety-cockpit/transient-chemical-link";

const TRADE_EXAMPLES = [
  {
    trade: "塗装・防水・接着",
    subs: ["トルエン", "キシレン", "酢酸エチル", "ジクロロメタン"],
  },
  { trade: "溶接・金属加工", subs: ["一酸化炭素", "マンガン", "アセチレン"] },
  {
    trade: "内装・清掃・洗浄",
    subs: ["メタノール", "ノルマルヘキサン", "次亜塩素酸ナトリウム"],
  },
  {
    trade: "設備・メッキ・薬品",
    subs: ["硫酸", "水酸化ナトリウム", "アンモニア"],
  },
] as const;

export function ChemicalRaSecondaryTools() {
  return (
    <>
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            職種別クイックスタート（例から選ぶ）
          </summary>
          <p className="mt-0.5 text-xs text-portal-muted">
            扱うことが多い化学物質の
            <strong className="font-semibold">例</strong>
            です。クリックすると収録情報を表示します（実際の取扱物質は製品固有の最新SDSでご確認ください）。
          </p>
          <div className="mt-3 space-y-2">
            {TRADE_EXAMPLES.map((group) => (
              <div
                key={group.trade}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="w-32 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {group.trade}
                </span>
                {group.subs.map((substance) => (
                  <TransientChemicalLink
                    key={substance}
                    query={substance}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    {substance}
                  </TransientChemicalLink>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            なぜ評価・記録が重要か：化学物質による健康障害では、予見可能性は「安全性に疑念を抱かせる程度の抽象的な危惧で足りる」と判断され、対策を怠った会社の
            <strong className="font-semibold">安全配慮義務違反</strong>
            が認められています（例: 三星化学工業 職業性膀胱がん事件）。
            <Link
              href="/court-cases/employer-liability"
              className="ml-1 font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900 dark:text-rose-300"
            >
              労災で問われる責任を見る
            </Link>
            <span className="mx-1 text-slate-300">|</span>
            <Link
              href="/court-cases?field=%E8%A3%BD%E9%80%A0%E3%83%BB%E9%80%A0%E8%88%B9"
              className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900 dark:text-emerald-300"
            >
              関連判例
            </Link>
          </p>
        </details>
      </PageContainer>

      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <details
          id="sds-upload"
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            SDS（PDF・写真）を読み取って物質を特定する
          </summary>
          <div className="mt-2">
            <LazySdsUploadPanel />
          </div>
        </details>
      </PageContainer>
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            混合物の収録情報をまとめて確認
          </summary>
          <div className="mt-2">
            <LazyMixtureRaPanel />
          </div>
        </details>
      </PageContainer>
      <PageContainer paddingY="none" className="pt-2 print:hidden">
        <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800 dark:text-slate-100">
            保存したリスクアセスメント一覧
          </summary>
          <div className="mt-2">
            <LazySavedRaList />
          </div>
        </details>
      </PageContainer>
      <div className="print:hidden">
        <details className="mx-auto max-w-7xl px-4 lg:px-8">
          <summary className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            現場の化学物質リスト・AI追加調査などの補助ツール
          </summary>
          <LazyChemicalRaExtras />
        </details>
      </div>
    </>
  );
}
