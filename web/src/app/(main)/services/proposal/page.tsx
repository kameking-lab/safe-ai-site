import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import { ProposalContent } from "./ProposalContent";

const TITLE = "法人向け 提案書テンプレート（3プラン）";
const DESCRIPTION =
  "ANZEN AI 法人導入プラン3種（中小50名以下¥80,000・中規模50-300名¥150,000・大手300名以上¥250,000）の提案書テンプレート。PDF出力対応・Stripe決済リンク付き。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/services/proposal" },
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

export default function ProposalPage() {
  return <ProposalContent />;
}
