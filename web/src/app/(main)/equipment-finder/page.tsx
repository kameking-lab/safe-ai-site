import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FlaskConical,
  ShoppingBag,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { EQUIPMENT_CATALOG_QUARANTINE } from "@/lib/equipment-catalog-quarantine";

export const metadata: Metadata = {
  title: "保護具商品検索（一次資料確認中）",
  description:
    "商品名、メーカー、規格適合、価格等の一次資料確認が完了していないため、商品単位の検索・推薦を停止しています。",
  alternates: { canonical: "/equipment-finder" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function EquipmentFinderPage() {
  return (
    <PageContainer width="prose">
      <div className="py-6 sm:py-10">
        <div
          className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950 sm:p-7"
          role="status"
          aria-labelledby="equipment-quarantine-title"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-6 w-6 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-bold">データ状態: 隔離・公開停止</p>
              <h1
                id="equipment-quarantine-title"
                className="mt-1 text-2xl font-black tracking-tight sm:text-3xl"
              >
                商品単位の検索・推薦は利用できません
              </h1>
              <p className="mt-3 text-sm leading-7">
                {EQUIPMENT_CATALOG_QUARANTINE.note}
                商品の適合性は、対象作業・有害要因・使用条件に応じて、メーカーの最新資料、
                SDS、法令・公的資料と、保護具に詳しい担当者による確認が必要です。
              </p>
              <p className="mt-2 text-xs leading-6">
                隔離日: {EQUIPMENT_CATALOG_QUARANTINE.quarantinedAt} /
                公開商品件数: {EQUIPMENT_CATALOG_QUARANTINE.publicItemCount}件
              </p>
            </div>
          </div>
        </div>

        <section className="mt-6" aria-labelledby="equipment-safe-next">
          <h2
            id="equipment-safe-next"
            className="text-lg font-bold text-slate-950"
          >
            代わりに確認できること
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              href="/chemical-ra"
              className="group min-h-11 rounded-xl border border-emerald-300 bg-white p-4 text-slate-900 shadow-sm hover:border-emerald-500"
            >
              <span className="flex items-center gap-2 font-bold">
                <FlaskConical
                  className="h-5 w-5 text-emerald-700"
                  aria-hidden="true"
                />
                化学物質リスクを整理する
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                SDS、作業条件、換気、皮膚接触等を確認し、必要な対策項目を整理します。
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-emerald-800">
                化学物質RAへ
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
            <Link
              href="/goods"
              className="group min-h-11 rounded-xl border border-sky-300 bg-white p-4 text-slate-900 shadow-sm hover:border-sky-500"
            >
              <span className="flex items-center gap-2 font-bold">
                <ShoppingBag
                  className="h-5 w-5 text-sky-700"
                  aria-hidden="true"
                />
                安全用品のカテゴリを見る
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                商品適合を断定しないカテゴリ案内です。購入前に最新仕様を確認してください。
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-sky-800">
                安全グッズへ
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>

        <p className="mt-6 text-sm leading-7 text-slate-600">
          データ品質、隔離、訂正の考え方は
          <Link
            href="/about/quality"
            className="mx-1 font-bold text-sky-800 underline"
          >
            品質と出典の方針
          </Link>
          で確認できます。
        </p>
      </div>
    </PageContainer>
  );
}
