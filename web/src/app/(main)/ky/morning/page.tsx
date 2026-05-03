import type { Metadata } from "next";
import { KyMorningSignage } from "@/components/ky-morning-signage";

export const metadata: Metadata = {
  title: "KY 朝礼サイネージ表示｜ANZEN AI",
  description:
    "KY用紙の内容を全画面・大型フォントで表示し、朝礼での唱和に使うためのサイネージモード。",
  alternates: { canonical: "/ky/morning" },
};

export default function KyMorningPage() {
  return <KyMorningSignage />;
}
