import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import { PricingContent } from "./PricingContent";

const _title = "料金プラン｜無料・月額・受託までの5プラン";
const _desc =
  "ANZEN AI の料金プラン。無料¥0／スタンダード¥980／プロ¥2,980／ビジネス¥29,800／受託（個別見積）の5層。個人から500名規模まで、段階的に導入できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
