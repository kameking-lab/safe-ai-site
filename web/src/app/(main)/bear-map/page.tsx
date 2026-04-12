import type { Metadata } from "next";
import { BearMapPanel } from "@/components/bear-map-panel";

export const metadata: Metadata = {
  title: "クママップ",
  description:
    "富山・秋田・石川・長野・新潟の各都道府県公開情報をもとにしたクマ出没マップ。目撃・被害・捕獲・痕跡情報を地図で確認できます。",
  openGraph: {
    title: "クママップ｜ANZEN AI",
    description: "各都道府県公開情報をもとにしたクマ出没マップ。目撃・被害・捕獲・痕跡情報を地図で確認。",
  },
};

export default function BearMapPage() {
  return <BearMapPanel />;
}
