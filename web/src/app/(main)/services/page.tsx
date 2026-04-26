import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import { ServicesContent } from "./ServicesContent";

const TITLE = "受託業務｜KYデジタル化・安全管理自動化・法改正通知・Claude Code 開発";
const DESCRIPTION =
  "労働安全コンサルタント監修の受託業務。KYデジタル化¥500k〜、安全管理自動化¥300k〜、法改正通知¥200k〜、教育コンテンツ¥500k〜、化学物質管理¥500k〜、特別教育¥150k〜、Claude Code自動化¥200k〜。無料相談30分実施中。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/services" },
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

export default function ServicesPage() {
  return <ServicesContent />;
}
