import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "研修の経費助成・参考試算｜事業展開等リスキリング支援";
const _desc =
  "公式窓口で対象条件を確認した研修について、訓練方法・企業区分・時間・対象経費から1人分の経費助成を参考試算します。申請資格や支給の判定ではありません。";

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
