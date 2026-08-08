import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "労働安全衛生FAQの検証状況";
const _desc =
  "旧FAQは法令番号・資格・制度境界の誤対応が確認されたため公開停止中です。検証済みの検索と公式一次資料をご利用ください。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/faq" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
