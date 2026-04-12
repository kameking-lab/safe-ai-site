import type { Metadata } from "next";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";

export const metadata: Metadata = {
  title: "安全グッズ",
  description: "現場で役立つ安全用品を分野別に紹介。Amazon・楽天で購入できます。",
  openGraph: {
    title: "安全グッズ｜ANZEN AI",
    description: "現場で役立つ安全用品を分野別に紹介。Amazon・楽天で購入できます。",
  },
};

export default function GoodsPage() {
  return <SafetyGoodsPanel />;
}
