import type { Metadata } from "next";
import Link from "next/link";
import { ChemicalDatabaseClient } from "@/components/chemical-database-client";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { RelatedPageCards } from "@/components/related-page-cards";
import { SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema, datasetSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
const TITLE = "化学物質検索DB（MHLW規制物質 + 専門解説50物質）";
const DESCRIPTION = `化学物質 GHS分類・SDS 2024年義務物質を CAS番号で検索 — 厚生労働省の皮膚等障害化学物質リスト・SDS交付義務物質一覧・がん原性物質一覧・濃度基準値設定物質を ${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()} 物質統合。専門解説 50 物質付き。規制区分・関連法令・濃度基準値を 1 画面で確認。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/chemical-database" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/chemical-database",
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function ChemicalDatabasePage() {
  const url = `${SITE_URL}/chemical-database`;
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "化学物質データベース", url },
          ]),
          datasetSchema({
            name: "労働安全衛生 化学物質規制データベース",
            description: DESCRIPTION,
            url,
            keywords: ["化学物質", "SDS", "CAS番号", "OEL", "皮膚等障害化学物質", "がん原性物質", "労働安全衛生法", "化学物質 GHS分類", "SDS 2024年 義務物質", "化学物質 自律的管理"],
            license: "https://creativecommons.org/licenses/by/4.0/",
            variableMeasured: [`収録物質数: ${MHLW_MERGED_CHEMICAL_COUNT}物質`, "規制区分", "濃度基準値", "CAS番号"],
            isBasedOn: [
              { name: "厚生労働省 皮膚等障害化学物質リスト", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121.html" },
              { name: "厚生労働省 SDS交付義務物質一覧", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121.html" },
            ],
          }),
        ]}
      />
      {/* P1-E: 化学物質RA との使い分けをファーストビューで明示 */}
      <div className="mx-auto mt-3 max-w-7xl px-4 lg:px-8">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-200">
          <strong className="font-semibold">このページの使い分け：</strong>
          このページは物質の<strong className="font-semibold">詳細情報（CAS番号・GHS分類・濃度基準値）を閲覧</strong>するDBです。
          物質と作業内容から<em className="font-medium">リスク区分を判定</em>したい場合は
          <Link href="/chemical-ra" className="ml-1 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-100">化学物質RA</Link>
          をご利用ください。
        </div>
      </div>
      <ChemicalDatabaseClient />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/chemical-ra",
            label: "化学物質RA ツール",
            description: "検索した物質をそのままリスクアセスメントへ。CREATE-SIMPLE準拠の評価フォーム。",
            color: "emerald",
            cta: "リスクアセスを開始",
          },
          {
            href: "/equipment-finder",
            label: "保護具AIファインダー",
            description: "化学物質に必要な保護手袋・保護メガネ・呼吸器の型式選定をAIが補助。",
            color: "amber",
            cta: "保護具を選ぶ",
          },
          {
            href: "/laws",
            label: "化学物質規制 法改正",
            description: "安衛則・化学物質規則・指針の最新改正を時系列で確認。",
            color: "purple",
            cta: "法改正を確認",
          },
        ]}
      />
    </>
  );
}
