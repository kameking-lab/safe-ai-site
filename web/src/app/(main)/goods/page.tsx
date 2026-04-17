import type { Metadata } from "next";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安全用品・保護具 おすすめ一覧";
const _desc =
  "安全ヘルメット・安全帯・保護手袋・安全靴など現場で役立つ保護具を分野別に紹介。Amazon・楽天で購入できます。";

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

export default function GoodsPage() {
  return <SafetyGoodsPanel />;
}
