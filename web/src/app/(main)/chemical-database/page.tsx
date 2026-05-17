import type { Metadata } from "next";
import { ChemicalDatabaseClient } from "@/components/chemical-database-client";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { RelatedPageCards } from "@/components/related-page-cards";

import { PageJsonLd } from "@/components/page-json-ld";
const TITLE = "化学物質検索DB（MHLW規制物質 + 専門解説50物質）";
const DESCRIPTION = `厚生労働省の皮膚等障害化学物質リスト・SDS交付義務物質一覧・がん原性物質一覧・濃度基準値設定物質を CAS 番号でマージした ${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()} 物質と、労働安全コンサルタントによる専門解説 50 物質を横断検索。規制区分・関連法令・濃度基準値を 1 画面で確認。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/chemical-database" },
  openGraph: {
    title: `${TITLE}`,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE}`,
    description: DESCRIPTION,
  },
};

export default function ChemicalDatabasePage() {
  return (
    <>
      
      <PageJsonLd name="化学物質データベース" description="労働安全衛生法・化学物質規制法に基づく化学物質情報を検索。SDS・規制情報・代替物質を一覧表示。" path="/chemical-database" />
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
