import type { Metadata } from "next";
import { FeaturesIndexClient } from "./features-index-client";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { FEATURE_PORTFOLIO } from "@/config/feature-portfolio";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { PageJsonLd } from "@/components/page-json-ld";

const VISIBLE_FEATURE_COUNT = FEATURE_PORTFOLIO.filter(
  (feature) => feature.tier !== 4 && feature.searchable,
).length;
const FEATURES_DESCRIPTION = `利用できる${VISIBLE_FEATURE_COUNT}件の入口を、主力機能・実務支援・自動化サンプルに分けて表示します。再検証中・非公開の機能は主力導線から除外しています。`;

export const metadata: Metadata = {
  alternates: { canonical: "/features" },
  title: "全機能｜主力・実務支援・自動化サンプル",
  description: FEATURES_DESCRIPTION,
  openGraph: withSiteOpenGraph("/features", {
    title: "全機能｜主力・実務支援・自動化サンプル",
    description: FEATURES_DESCRIPTION,
  }),
};

export default function FeaturesPage() {
  return (
    <>
      <PageJsonLd
        name="全機能｜主力・実務支援・自動化サンプル"
        description={FEATURES_DESCRIPTION}
        path="/features"
      />
      <FeaturesIndexClient />
      <AutomationServicePromo
        position="features"
        availability={getAutomationConsultAvailability()}
        title="現場の安全業務に合わせた自動化・講習・資料作成も相談できます"
        cta="業務自動化について相談する"
      />
    </>
  );
}
