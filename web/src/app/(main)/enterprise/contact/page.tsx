import { Suspense } from "react";
import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import EnterpriseContactForm from "./EnterpriseContactForm";

const TITLE = "法人向け 無料相談・お問い合わせ（30分）";
const DESCRIPTION =
  "ANZEN AI 法人導入の無料相談（30分）。業種・規模・課題のヒアリングから、貴社専用の安全管理プラットフォーム提案・概算見積を24時間以内にお送りします。Cal.com で即時予約も可能。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/enterprise/contact" },
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function EnterpriseContactPage() {
  return (
    <Suspense fallback={null}>
      <EnterpriseContactForm />
    </Suspense>
  );
}
