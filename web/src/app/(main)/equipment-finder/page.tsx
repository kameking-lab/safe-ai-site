import type { Metadata } from "next";
import { EquipmentFinderClient } from "@/components/equipment-finder-client";
import { ogImageUrl } from "@/lib/og-url";

export const metadata: Metadata = {
  title: "保護具AIファインダー｜業種・危険源・季節から最適な保護具を提案",
  description:
    "建設・製造・医療福祉・運輸・林業の現場別に、危険源と季節・予算から最適な保護具200点をAIが3問でレコメンド。JIS規格・国家検定品も明示。",
  alternates: { canonical: "/equipment-finder" },
  openGraph: {
    title: "保護具AIファインダー｜ANZEN AI",
    description: "業種×危険源×季節+予算の3問で最適保護具をAI提案。",
    images: [{ url: ogImageUrl("保護具AIファインダー", "業種×危険源×季節で200点を絞り込み"), width: 1200, height: 630 }],
  },
};

export default function EquipmentFinderPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          🛡 保護具AIファインダー
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          業種・危険源・季節+予算の3問で、200点の保護具DBから最適な装備をAIがレコメンドします。JIS規格・国家検定品も明示。
        </p>
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          <strong>研究プロジェクト運営費について:</strong>{" "}
          本ページの「Amazon / 楽天で見る」リンクは、もしもアフィリエイト経由で生成しています。発生した報酬は、本サイトの運営費（事故DB拡充・AI推論コスト・法令データ更新）に充てます。
        </div>
      </header>

      <EquipmentFinderClient />
    </main>
  );
}
