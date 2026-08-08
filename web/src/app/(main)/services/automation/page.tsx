import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SITE_URL,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import {
  getAutomationConsultAvailability,
} from "@/lib/automation-consult/availability";
import AutomationServiceContent from "./AutomationServiceContent";
import {
  AUTOMATION_PAGE_DESCRIPTION as PAGE_DESCRIPTION,
  AUTOMATION_PAGE_PATH as PAGE_PATH,
  AUTOMATION_PAGE_TITLE as PAGE_TITLE,
  AUTOMATION_PAGE_URL as PAGE_URL,
  buildAutomationServiceSchema,
} from "./automation-service-schema";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "業務自動化 相談",
    "業務自動化 費用",
    "業務効率化 相談",
    "Excel 自動化 依頼",
    "スプレッドシート 自動化",
    "中小企業 業務自動化",
    "建設業 DX 相談",
    "AI活用 相談",
    "社内AI研修",
    "安全衛生 講習",
    "講習会 資料作成",
    "マニュアル 作成代行",
  ],
  alternates: {
    canonical: PAGE_PATH,
  },
  openGraph: withSiteOpenGraph(PAGE_PATH, {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: "website",
    images: [
      {
        url: ogImageUrl(PAGE_TITLE, "小さな業務から相談・税込料金目安を公開"),
        width: 1200,
        height: 630,
        alt: "業務自動化・講習・資料作成の相談",
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [ogImageUrl(PAGE_TITLE, "小さな業務から相談・税込料金目安を公開")],
  }),
  robots: {
    index: true,
    follow: true,
  },
};

export default function AutomationServicePage() {
  const availability = getAutomationConsultAvailability();
  const serviceSchema = buildAutomationServiceSchema(availability);

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: PAGE_TITLE,
            description: PAGE_DESCRIPTION,
            url: PAGE_URL,
            datePublished: "2026-07-23",
            dateModified: "2026-08-01",
            keywords: [
              "業務自動化",
              "AI活用",
              "安全衛生講習",
              "講習資料作成",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "業務自動化・講習の相談", url: PAGE_URL },
          ]),
          serviceSchema,
        ]}
      />
      <AutomationServiceContent availability={availability} />
    </>
  );
}
