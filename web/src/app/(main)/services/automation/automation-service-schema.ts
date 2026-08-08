import {
  type AutomationConsultAvailability,
} from "@/lib/automation-consult/availability";
import { SITE_URL } from "@/lib/seo-metadata";

export const AUTOMATION_PAGE_PATH = "/services/automation";
export const AUTOMATION_PAGE_TITLE =
  "業務自動化・AI活用・講習・資料作成の相談";
export const AUTOMATION_PAGE_DESCRIPTION =
  "中小企業・建設業・安全衛生担当者向けに、Excelや定型業務の自動化、AI活用、安全衛生講習、研修資料・マニュアル作成を提供します。初回30分無料、税込33,000円から。現在の受付方法も確認できます。";
export const AUTOMATION_PAGE_URL = `${SITE_URL}${AUTOMATION_PAGE_PATH}`;

export function buildAutomationServiceSchema(
  availability: AutomationConsultAvailability,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${AUTOMATION_PAGE_URL}#service`,
    name: AUTOMATION_PAGE_TITLE,
    description: AUTOMATION_PAGE_DESCRIPTION,
    url: AUTOMATION_PAGE_URL,
    serviceType: [
      "業務自動化支援",
      "AI活用支援",
      "社内講習・研修",
      "講習資料・マニュアル作成",
    ],
    provider: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "安全AIポータル",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "日本",
    },
    audience: [
      {
        "@type": "BusinessAudience",
        audienceType: "中小企業・個人事業者",
      },
      {
        "@type": "BusinessAudience",
        audienceType: "建設業・安全衛生担当者",
      },
    ],
    ...(availability.webFormEnabled === true
      ? {
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: `${AUTOMATION_PAGE_URL}#consult-form`,
            availableLanguage: "ja",
          },
        }
      : {}),
  };
}
