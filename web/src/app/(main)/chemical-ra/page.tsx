import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { ChemicalRaExtras } from "@/components/chemical-ra-extras";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { LocalStorageWarningBanner } from "@/components/local-storage-warning-banner";
import { RelatedPageCards } from "@/components/related-page-cards";
import { PageContainer } from "@/components/layout";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
const _title = "化学物質 リスクアセスメント CREATE-SIMPLE 無料｜安衛法57条の3対応";
const _desc =
  "化学物質 リスクアセスメント CREATE-SIMPLE 使い方ガイド＆無料ツール — 物質名・GHS分類・取扱量・換気状況からばく露リスク区分（I〜IV）を簡易評価し、皮膚障害防止の保護具選定・改善対策を提示。安衛法第57条の3・2024年 自律的管理対応。解説は /guides/chemical-ra-create-simple を参照。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/chemical-ra" },
  openGraph: withSiteOpenGraph("/chemical-ra", {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(_title, _desc)],
  }),
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
      <PageContainer paddingY="none" className="pt-6">
        <TranslatedPageHeader
          titleJa="化学物質リスクアセスメント"
          titleEn="Chemical Substance Risk Assessment"
          descriptionJa="化学物質名を入力してSDS・GHS分類・保護具・安全対策を確認。安衛法令和4年改正（自律管理）対応"
          descriptionEn="Enter a substance name to view SDS, GHS classification, required PPE, and safety checklists. Compliant with the 2024 OSH Act chemical management reforms (安衛法令和4年改正)"
          iconName="Search"
          iconColor="blue"
        />
        <LocalStorageWarningBanner />
        {/* P1-E: 化学物質RA と 化学物質検索DB の使い分けをファーストビューで明示 */}
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-2.5 text-xs text-sky-900 dark:border-sky-700/60 dark:bg-sky-900/20 dark:text-sky-200">
          <strong className="font-semibold">このページの使い分け：</strong>
          このページは物質と作業内容から<strong className="font-semibold">リスクを判定</strong>するツールです。
          物質の濃度基準値・GHS分類など<em className="font-medium">詳細情報の閲覧</em>だけが目的なら
          <Link href="/chemical-database" className="ml-1 underline decoration-sky-400 underline-offset-2 hover:text-sky-700 dark:hover:text-sky-100">化学物質検索DB</Link>
          をご覧ください。
        </div>
      </PageContainer>
      {/* P1-G: メイン入力（RAパネル）をファーストビューに、現場リストは下部へ。
          初見ユーザーが「何のページか」を即理解できるよう順序を入れ替えた。 */}
      <Suspense fallback={<PageSkeleton label="化学物質リスクアセスメントを読み込み中" />}>
        <ChemicalRaPanel />
      </Suspense>
      <ChemicalRaExtras />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/guides/chemical-ra-create-simple",
            label: "ガイド：化学物質RA（CREATE-SIMPLE 無料）",
            description: "安衛法第57条の3・2024年改正・リスク区分I〜IV・必要な保護具・記録保存まで、化学物質RAの検索意図を網羅した解説。",
            color: "amber",
            cta: "ガイドを読む",
          },
          {
            href: "/chemical-database",
            label: "化学物質検索",
            description: "厚労省統合DB 約3,700物質（MHLW告示251 + NITE GHS 2,729 + PRTR 398 + 化審/毒劇/CWC/廃掃 255）。CAS番号・物質名から濃度基準値・GHS分類を確認できます。",
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
