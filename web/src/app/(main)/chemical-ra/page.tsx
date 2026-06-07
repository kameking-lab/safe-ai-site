import { Suspense } from "react";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import type { Metadata } from "next";
import Link from "next/link";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { SdsUploadPanel } from "@/components/chemical/sds-upload-panel";
import { SavedRaList } from "@/components/chemical/chemical-ra-save";
import { MixtureRaPanel } from "@/components/chemical/mixture-ra-panel";
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
      <PageContainer paddingY="none" className="pt-6 print:hidden">
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
      {/* 職種別クイックスタート: 物質名のクリックでRA入力を即プリフィル（exp: 入力の手間を削減） */}
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">職種別クイックスタート</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            扱うことが多い化学物質の<strong className="font-semibold">例</strong>です。クリックするとその物質でリスクアセスメントを開始できます（実際の取扱物質はSDSでご確認ください）。
          </p>
          <div className="mt-3 space-y-2">
            {[
              { trade: "塗装・防水・接着", subs: ["トルエン", "キシレン", "酢酸エチル", "ジクロロメタン"] },
              { trade: "溶接・金属加工", subs: ["一酸化炭素", "マンガン", "アセチレン"] },
              { trade: "内装・清掃・洗浄", subs: ["メタノール", "ノルマルヘキサン", "次亜塩素酸ナトリウム"] },
              { trade: "設備・メッキ・薬品", subs: ["硫酸", "水酸化ナトリウム", "アンモニア"] },
            ].map((g) => (
              <div key={g.trade} className="flex flex-wrap items-center gap-1.5">
                <span className="w-32 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">{g.trade}</span>
                {g.subs.map((s) => (
                  <Link
                    key={s}
                    href={`/chemical-ra?name=${encodeURIComponent(s)}`}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            なぜ評価・記録が重要か：化学物質による健康障害では、予見可能性は「安全性に疑念を抱かせる程度の抽象的な危惧で足りる」と判断され、対策を怠った会社の
            <strong className="font-semibold">安全配慮義務違反</strong>が認められています（例: 三星化学工業 職業性膀胱がん事件）。
            <Link href="/court-cases/employer-liability" className="ml-1 font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900 dark:text-rose-300">労災で問われる責任を見る</Link>
            <span className="mx-1 text-slate-300">|</span>
            <Link href="/court-cases?field=%E8%A3%BD%E9%80%A0%E3%83%BB%E9%80%A0%E8%88%B9" className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900 dark:text-emerald-300">関連判例</Link>
          </p>
        </div>
      </PageContainer>

      {/* P1-G: メイン入力（RAパネル）をファーストビューに、現場リストは下部へ。
          初見ユーザーが「何のページか」を即理解できるよう順序を入れ替えた。 */}
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        {/* P2-1: SDS PDF/画像をAIが読み取り、RA・全法律規制へ誘導 */}
        <SdsUploadPanel />
      </PageContainer>
      <Suspense fallback={<PageSkeleton label="化学物質リスクアセスメントを読み込み中" />}>
        <ChemicalRaPanel />
      </Suspense>
      {/* P2-4: 混合物RA（複数成分の合成リスク集約） — 印刷=単一物質のA4記録には不要 */}
      <PageContainer paddingY="none" className="pt-3 print:hidden">
        <MixtureRaPanel />
      </PageContainer>
      {/* P1-5: 保存したRA一覧（クラウド＋ローカル） */}
      <PageContainer paddingY="none" className="pt-2 print:hidden">
        <SavedRaList />
      </PageContainer>
      <div className="print:hidden">
        <ChemicalRaExtras />
      </div>
      <div className="print:hidden">
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
            description: `厚労省統合DB ${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()}物質（MHLW告示・NITE GHS・PRTR・化審/毒劇/化学兵器禁止/廃掃法をCAS統合）。CAS番号・物質名から濃度基準値・GHS分類を確認できます。`,
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
      </div>
    </>
  );
}
