import type { Metadata } from "next";
import { ChemicalDatabaseClient } from "@/components/chemical-database-client";
import { EnterpriseFunnel } from "@/components/EnterpriseFunnel";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";

const TITLE = "化学物質検索DB（MHLW規制物質 + 専門解説50物質）";
const DESCRIPTION = `厚生労働省の皮膚等障害化学物質リスト・SDS交付義務物質一覧・がん原性物質一覧・濃度基準値設定物質を CAS 番号でマージした ${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()} 物質と、労働安全コンサルタントによる専門解説 50 物質を横断検索。規制区分・関連法令・濃度基準値を 1 画面で確認。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/chemical-database" },
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
  },
};

export default function ChemicalDatabasePage() {
  return (
    <>
      <ChemicalDatabaseClient />
      <EnterpriseFunnel
        service="chemical"
        headline="貴社の取扱物質に絞った社内データベースへ"
        subline="社内SDS統合・濃度基準値の自動アラート・改正影響レポートまで、貴社専用の化学物質管理基盤として運用できます。"
      />
    </>
  );
}
