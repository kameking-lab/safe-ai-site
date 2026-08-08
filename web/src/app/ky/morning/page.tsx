import type { Metadata } from "next";
import { KyMorningSignage } from "@/components/ky-morning-signage";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "KY 朝礼サイネージ表示";
const DESC =
  "この端末に保存したKY用紙の内容を全画面・大型フォントで表示し、朝礼での唱和に使うためのサイネージモードです。別端末共有は安全性の再検証中です。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  robots: { index: false, follow: true },
  alternates: { canonical: "/ky/morning" },
  // 兄弟ページ（/ky/paper・/ky/workers）と揃え、LINE等で共有した際のプレビューを整える。
  openGraph: {
    title: TITLE,
    description: DESC,
    images: [{ url: ogImageUrl(TITLE, DESC), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESC)],
  },
};

export default function KyMorningPage() {
  return <KyMorningSignage />;
}
