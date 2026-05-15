import type { Metadata } from "next";
import { Suspense } from "react";
import { EquipmentFinderClient } from "@/components/equipment-finder-client";
import { EquipmentFinderHeader } from "@/components/equipment-finder-header";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "保護具AIファインダー｜種類選択→絞り込みで最適保護具を提案",
  description:
    "フルハーネス・防毒/防塵マスク・ヘルメット・安全靴・保護メガネ・防音・手袋・保護衣・救命胴衣・視認性ベストなど12カテゴリから、種類別の絞り込み質問で最適な保護具をレコメンド。JIS規格・国家検定品も明示。",
  alternates: { canonical: "/equipment-finder" },
  openGraph: {
    title: "保護具AIファインダー",
    description: "保護具の種類を選んで、種類別の絞り込み質問でおすすめ商品を表示。",
    images: [{ url: ogImageUrl("保護具AIファインダー", "12カテゴリから種類別に絞り込み"), width: 1200, height: 630 }],
  },
};

export default function EquipmentFinderPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="保護具AIファインダー｜種類選択→絞り込みで最適保護具を提案" description="12カテゴリから保護具の種類を選び、種類別の絞り込み質問で最適な装備をレコメンド。JIS規格・国家検定品も明示。" path="/equipment-finder" />
      <EquipmentFinderHeader />

      <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
        <EquipmentFinderClient />
      </Suspense>
    </main>
  );
}
