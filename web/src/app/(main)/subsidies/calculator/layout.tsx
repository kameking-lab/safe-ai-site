import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "助成金 支給額試算ツール｜中小企業の安全投資ROI";
const _desc =
  "業種・従業員数・安全衛生施策（機械設備改善・教育訓練・健康管理・腰痛対策）を選択するだけで、エイジフレンドリー補助金・働き方改革推進支援助成金など主要助成金の概算支給額を即時試算。中小企業の安全投資意思決定を支援します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/subsidies/calculator" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/subsidies/calculator",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function SubsidiesCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
