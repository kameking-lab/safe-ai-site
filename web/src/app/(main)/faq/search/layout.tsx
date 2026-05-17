import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "FAQ検索｜労働安全衛生FAQ 200問";
const _desc =
  "労働安全衛生法・化学物質管理・健康診断・特別教育など全200問からキーワードで絞り込み検索。法令・管理体制・化学物質・健康管理の4カテゴリに対応。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/faq/search" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/faq/search",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function FAQSearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
