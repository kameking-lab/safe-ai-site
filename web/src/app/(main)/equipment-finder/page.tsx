import type { Metadata } from "next";
import { Suspense } from "react";
import { EquipmentFinderClient } from "@/components/equipment-finder-client";
import { EquipmentFinderHeader } from "@/components/equipment-finder-header";
import { PageContainer } from "@/components/layout";
import { PanelSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL } from "@/lib/seo-metadata";
import { getAllEquipment } from "@/lib/equipment-recommendation";
import { JsonLd, webPageSchema, breadcrumbSchema, productCollectionSchema } from "@/components/json-ld";
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
  const url = `${SITE_URL}/equipment-finder`;
  const title = "保護具AIファインダー｜種類選択→絞り込みで最適保護具を提案";
  const description = "12カテゴリから保護具の種類を選び、種類別の絞り込み質問で最適な装備をレコメンド。JIS規格・国家検定品も明示。";
  return (
    <PageContainer as="main" width="prose">
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "保護具AIファインダー", url },
          ]),
          productCollectionSchema({
            name: title,
            url,
            products: getAllEquipment().slice(0, 20).map((item) => ({
              name: item.name,
              url: `${SITE_URL}/equipment/${item.id}`,
              description: item.spec,
              brand: item.maker,
            })),
          }),
        ]}
      />
      <EquipmentFinderHeader />

      <Suspense fallback={<PanelSkeleton rows={4} label="保護具レコメンドを読み込み中" />}>
        <EquipmentFinderClient />
      </Suspense>
    </PageContainer>
  );
}
