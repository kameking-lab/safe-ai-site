import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安全衛生用語集｜ANZEN AI";
const _desc =
  "労働安全衛生の重要用語を五十音順に解説。KY・リスクアセスメント・特別教育・作業主任者・保護具など現場で使う用語を網羅。法令の根拠条文リンク付き。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/glossary" },
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

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
