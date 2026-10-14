import type { Metadata } from "next";
import Link from "next/link";
import { BusinessFundingGuide } from "@/components/automation/business-funding-guide";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { ogImageUrl } from "@/lib/og-url";

const title = "企業向け補助金・助成金｜AI研修・安全教育・業務自動化";
const description =
  "AI研修、安全教育、業務自動化の目的別に、対象企業・費用・率・上限・事前手続き・期限を公式情報から確認。申請準備の相談にもつなげます。";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/subsidies" },
  openGraph: {
    title,
    description,
    images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
  },
};

export default function SubsidiesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-black text-slate-950">企業向け補助金・助成金</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        研修と設備導入は、対象費用も手続きも異なります。目的に合う制度から確認しましょう。
      </p>
      <BusinessFundingGuide availability={getAutomationConsultAvailability()} standalone />
      <div className="mt-6 flex flex-wrap gap-x-5">
        <Link
          href="/subsidies/calculator"
          className="inline-flex min-h-[44px] items-center font-bold text-emerald-900 underline"
        >
          研修の経費助成を参考試算する
        </Link>
        <Link
          href="/services/automation"
          className="inline-flex min-h-[44px] items-center font-bold text-emerald-900 underline"
        >
          自動化・講習の料金と相談を見る
        </Link>
      </div>
    </div>
  );
}
