import type { Metadata } from "next";
import { Suspense } from "react";
import { EquipmentFinderClient } from "@/components/equipment-finder-client";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "保護具AIファインダー｜種類選択→絞り込みで最適保護具を提案",
  description:
    "フルハーネス・防毒/防塵マスク・ヘルメット・安全靴・保護メガネ・防音・手袋・保護衣・救命胴衣・視認性ベストなど12カテゴリから、種類別の絞り込み質問で最適な保護具をレコメンド。JIS規格・国家検定品も明示。",
  alternates: { canonical: "/equipment-finder" },
  openGraph: {
    title: "保護具AIファインダー｜ANZEN AI",
    description: "保護具の種類を選んで、種類別の絞り込み質問でおすすめ商品を表示。",
    images: [{ url: ogImageUrl("保護具AIファインダー", "12カテゴリから種類別に絞り込み"), width: 1200, height: 630 }],
  },
};

export default function EquipmentFinderPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="保護具AIファインダー｜種類選択→絞り込みで最適保護具を提案" description="12カテゴリから保護具の種類を選び、種類別の絞り込み質問で最適な装備をレコメンド。JIS規格・国家検定品も明示。" path="/equipment-finder" />
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          🛡 保護具AIファインダー
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          まず保護具の種類を選び、種類別の絞り込み質問に答えると、1,000点超の保護具DBからおすすめ商品を表示します。JIS規格・国家検定品も明示。
        </p>
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          <strong>研究プロジェクト運営費について:</strong>{" "}
          本ページの「Amazon / 楽天で見る」リンクは、もしもアフィリエイト経由で生成しています。発生した報酬は、本サイトの運営費（事故DB拡充・AI推論コスト・法令データ更新）に充てます。
        </div>
      </header>

      <Suspense fallback={<div className="text-sm text-slate-500">読み込み中…</div>}>
        <EquipmentFinderClient />
      </Suspense>
    </main>
  );
}
