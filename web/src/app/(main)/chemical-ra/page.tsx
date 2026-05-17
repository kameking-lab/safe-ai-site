import { Suspense } from "react";
import type { Metadata } from "next";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { ChemicalRaExtras } from "@/components/chemical-ra-extras";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { LocalStorageWarningBanner } from "@/components/local-storage-warning-banner";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
const _title = "化学物質 リスクアセスメント ツール";
const _desc =
  "化学物質名を入力するとSDS・GHS分類・必要保護具・安全対策チェックリストを表示。安衛法令和4年改正対応。厚労省データ参考。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/chemical-ra" },
  openGraph: {
    title: `${_title}`,
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
        url: "https://www.anzen-ai-portal.jp/chemical-ra",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
        publisher: { "@type": "Organization", name: "安全AIポータル", url: "https://www.anzen-ai-portal.jp" },
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
        <LocalStorageWarningBanner />
      </div>
      <ChemicalRaExtras />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">読み込み中…</div>}>
        <ChemicalRaPanel />
      </Suspense>
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/chemical-database",
            label: "化学物質検索",
            description: "厚労省統合DB 8,400物質超。CAS番号・物質名から濃度基準値・GHS分類を確認できます。",
            color: "blue",
            cta: "物質を検索する",
          },
          {
            href: "/chemical-ra/product-search",
            label: "製品名 → 成分検索",
            description: "市販の塗料・洗剤・接着剤などの製品名から含有化学物質を遡って確認。",
            color: "sky",
            cta: "製品名で調べる",
          },
          {
            href: "/equipment-finder",
            label: "保護具AIファインダー",
            description: "化学物質と作業内容から、必要な手袋・保護メガネ・マスクをAIが提案。",
            color: "emerald",
            cta: "保護具を探す",
          },
          {
            href: "/education/hoteikyoiku/chemical-ra",
            label: "化学物質RA 実務教育",
            description: "安衛法第57条の3に基づく実務教育。2026年4月の自律管理制度に対応。",
            color: "amber",
            cta: "教育プログラム",
          },
        ]}
      />
    </>
  );
}
