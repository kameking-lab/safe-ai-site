import type { Metadata } from "next";
import { BearMapPanel } from "@/components/bear-map-panel";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "クマ出没マップ｜野生動物 安全対策";
const _desc =
  "富山・秋田・石川・長野・新潟の熊出没情報をマップ表示。林業・建設・屋外作業現場での野生動物リスク対策に活用。";

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

export default function BearMapPage() {
  return (
    <>
      <PageJsonLd name="クマ出没マップ" description="全国のクマ出没情報を地図上で確認。林業・建設・配送業の現場リスク管理に。" path="/bear-map" />
      <BearMapPanel />
    </>
  );
}
