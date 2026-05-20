import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安全衛生用語集";
const _desc =
  "労働安全衛生 用語集・用語解説 — KYT・リスクアセスメント・特別教育・作業主任者・安全管理者・衛生管理者・保護具など職場巡視から安全委員会まで現場用語を五十音順に網羅。根拠条文リンク付き。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: `${_title}`,
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
