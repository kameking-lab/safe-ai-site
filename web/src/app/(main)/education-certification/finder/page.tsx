import type { Metadata } from "next";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  parseQualificationFinderQuery,
  type QualificationFinderSearchParams,
} from "@/lib/education/qualification-finder-query";
import { CertFinderClient } from "./CertFinderClient";
import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky";

const TITLE = "業務別の資格・教育候補検索｜不足条件と公式資料を確認";
const DESCRIPTION =
  "業種、作業、機械能力、高さ、電圧、役割から特別教育・技能講習・作業主任者・免許の候補を絞り込みます。条件不足は判定不能とし、公式資料と人間確認へ案内します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education-certification/finder" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

type CertFinderPageProps = {
  searchParams: Promise<QualificationFinderSearchParams>;
};

export default async function CertFinderPage({
  searchParams,
}: CertFinderPageProps) {
  const initialState = parseQualificationFinderQuery(await searchParams);
  const visualKyLinksByQualification: Record<
    string,
    { id: string; label: string; href: string }[]
  > = {};
  for (const scenario of PUBLIC_VISUAL_KY_SCENARIOS) {
    for (const qualification of scenario.relatedQualifications) {
      const links =
        visualKyLinksByQualification[qualification.id] ?? [];
      if (!links.some((link) => link.id === scenario.id)) {
        links.push({
          id: scenario.id,
          label: scenario.shortTitle,
          href: `/training/visual-ky/${scenario.slug}`,
        });
      }
      visualKyLinksByQualification[qualification.id] = links;
    }
  }

  return (
    <>
      <PageJsonLd
        name="業務別の資格・教育候補検索"
        description={DESCRIPTION}
        path="/education-certification/finder"
      />
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
        visualKyLinksByQualification={visualKyLinksByQualification}
      />
    </>
  );
}
