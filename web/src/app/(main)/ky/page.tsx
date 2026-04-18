import type { Metadata } from "next";
import { KyPageContent } from "@/components/ky-page-content";
import { ogImageUrl } from "@/lib/og-url";

const _title = "KY用紙 作成ツール｜危険予知活動";
const _desc =
  "危険予知活動表（KY用紙）をオンラインで作成・記録。音声入力対応で現場から入力。建設・製造・土木の安全朝礼KY活動に。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
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

export default function KyPage() {
  return <KyPageContent />;
}
