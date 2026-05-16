import type { Metadata } from "next";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { CertFinderClient } from "./CertFinderClient";

const TITLE = "業務別 必要資格判定ツール｜特別教育・技能講習・職長教育";
const DESCRIPTION =
  "業種と作業内容を選ぶだけで、必要な特別教育・技能講習・職長教育を自動判定。根拠条文・講習時間・注意事項を一覧表示。安衛則第36条・安衛法第61条対応。";

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

export default function CertFinderPage() {
  return (
    <>
      <PageJsonLd
        name="業務別 必要資格判定ツール"
        description={DESCRIPTION}
        path="/education-certification/finder"
      />
      <CertFinderClient />
    </>
  );
}
