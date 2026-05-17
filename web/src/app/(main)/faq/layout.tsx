import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "労働安全衛生FAQ 200問";
const _desc =
  "労働安全衛生法・化学物質管理・健康診断・特別教育などよくある質問200問を法令根拠付きで解説。法令・管理体制・化学物質・健康管理の4カテゴリ別に検索可能。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/faq" },
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
