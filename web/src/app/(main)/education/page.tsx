import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import { EducationContent } from "./EducationContent";

const TITLE = "特別教育・安全衛生教育｜12種 対応教育＋要相談多数";
const DESCRIPTION =
  "労働安全衛生法に基づく特別教育・法定教育・労働衛生教育12種に対応。フルハーネス・足場・低圧電気・職長教育など。オンデマンド配信・カスタマイズ研修・講師派遣。¥50,000〜の明朗会計、修了証発行まで一括対応。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education" },
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

export default function EducationPage() {
  return <EducationContent />;
}
