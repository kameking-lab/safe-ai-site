import { Suspense } from "react";
import type { Metadata } from "next";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { ChemicalRaExtras } from "@/components/chemical-ra-extras";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { EnterpriseFunnel } from "@/components/EnterpriseFunnel";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
const _title = "化学物質 リスクアセスメント ツール";
const _desc =
  "化学物質名を入力するとSDS・GHS分類・必要保護具・安全対策チェックリストを表示。安衛法令和4年改正対応。厚労省データ参考。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function ChemicalRaPage() {
  return (
    <>
      
      <PageJsonLd name="化学物質リスクアセスメント" description="安衛法第57条の3に基づく化学物質リスクアセスメントを支援。CREATE-SIMPLE準拠の簡易評価ツール。" path="/chemical-ra" />
      <JsonLd schema={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "化学物質リスクアセスメントツール",
        description: _desc,
        url: "https://safe-ai-site.vercel.app/chemical-ra",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
        publisher: { "@type": "Organization", name: "ANZEN AI", url: "https://safe-ai-site.vercel.app" },
      }} />
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <TranslatedPageHeader
          titleJa="化学物質リスクアセスメント"
          titleEn="Chemical Substance Risk Assessment"
          descriptionJa="化学物質名を入力してSDS・GHS分類・保護具・安全対策を確認。安衛法令和4年改正（自律管理）対応"
          descriptionEn="Enter a substance name to view SDS, GHS classification, required PPE, and safety checklists. Compliant with the 2024 OSH Act chemical management reforms (安衛法令和4年改正)"
          iconName="Search"
          iconColor="blue"
        />
      </div>
      <ChemicalRaExtras />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">読み込み中…</div>}>
        <ChemicalRaPanel />
      </Suspense>
      <EnterpriseFunnel
        service="chemical"
        headline="化学物質の自律管理体制を、まるごと整備"
        subline="SDS収集 → リスクアセスメント → 教育 → 記録保存まで、安衛法令和4年改正に沿った運用フローを貴社向けに設計します。"
      />
    </>
  );
}
