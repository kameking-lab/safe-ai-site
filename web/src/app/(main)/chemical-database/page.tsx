import type { Metadata } from "next";
import { ChemicalDatabaseClient } from "@/components/chemical-database-client";

const TITLE = "化学物質検索DB（リスクアセスメント対象物 50物質）";
const DESCRIPTION =
  "労安衛法第57条の3リスクアセスメント対象物質、特化則、有機則、皮膚等障害化学物質等を横断で検索。物質名・CAS番号・用途・健康影響・関連法令・管理濃度を1画面で確認。化学物質管理者向けのβ版（50物質→674物質へ拡大予定）。";

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
