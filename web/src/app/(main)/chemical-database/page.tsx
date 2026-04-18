import type { Metadata } from "next";
import { ChemicalDatabaseClient } from "@/components/chemical-database-client";

const TITLE = "化学物質検索DB（MHLW 1,389物質 + 専門解説50物質）";
const DESCRIPTION =
  "厚生労働省の皮膚等障害化学物質リスト・SDS交付義務物質一覧・がん原性物質一覧・濃度基準値設定物質を CAS 番号でマージした 1,389 物質と、労働安全コンサルタントによる専門解説 50 物質を横断検索。規制区分・関連法令・濃度基準値を 1 画面で確認。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
  },
};

export default function ChemicalDatabasePage() {
  return <ChemicalDatabaseClient />;
}
