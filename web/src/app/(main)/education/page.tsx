import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo-metadata";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { UsageNotesLink } from "@/components/usage-notes-link";

const TITLE = "安全衛生教育";
const DESCRIPTION = "5分KYT、資格検索、厚生労働省の教育情報を利用できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function EducationPage() {
  const url = `${SITE_URL}/education`;
  return (
    <>
      <PageContainer width="wide">
        <JsonLd
          schema={[
            webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
            breadcrumbSchema([
              { name: "ホーム", url: SITE_URL },
              { name: TITLE, url },
            ]),
          ]}
        />
        <header>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">安全衛生教育</h1>
          <p data-page-description className="mt-2 text-sm leading-6 text-slate-700">5分KYT、資格検索、厚生労働省の教育情報を利用できます。</p>
        </header>
        <nav aria-label="教育コンテンツ" className="mt-5 flex flex-wrap gap-3">
          <Link href="/training/visual-ky" prefetch={false} data-primary-action="true" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white">5分KYTを始める</Link>
          <Link href="/education-certification/finder" prefetch={false} data-secondary-action="true" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">必要な資格・教育を探す</Link>
          <a
            href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei05.html"
            target="_blank"
            rel="noopener noreferrer"
            data-secondary-action="true"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-primary underline underline-offset-4"
          >
            厚生労働省の安全衛生教育情報
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </nav>
        <UsageNotesLink className="mt-2 text-brand-primary" />
      </PageContainer>
      <AutomationServicePromo
        position="education"
        availability={getAutomationConsultAvailability()}
        title="社内教育の資料作成を相談"
        description="作業内容と対象者を伺い、講習・資料作成の対応可否をご案内します。"
        cta="講習・資料作成を相談する"
        href="/services/automation#training"
      />
    </>
  );
}
