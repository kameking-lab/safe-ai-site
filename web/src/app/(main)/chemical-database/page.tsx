import type { Metadata } from "next";
import { ChemicalDatabaseClient } from "@/components/chemical-database-client";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema, datasetSchema } from "@/components/json-ld";
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
            keywords: ["化学物質", "SDS", "CAS番号", "OEL", "皮膚等障害化学物質", "がん原性物質", "労働安全衛生法"],
            license: "https://creativecommons.org/licenses/by/4.0/",
            variableMeasured: [`収録物質数: ${MHLW_MERGED_CHEMICAL_COUNT}物質`, "規制区分", "濃度基準値", "CAS番号"],
            isBasedOn: [
              { name: "厚生労働省 皮膚等障害化学物質リスト", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121.html" },
              { name: "厚生労働省 SDS交付義務物質一覧", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121.html" },
            ],
          }),
        ]}
      />
      <ChemicalDatabaseClient />
    </>
  );
}
