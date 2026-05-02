import type { Metadata } from "next";
import { SafetyDiaryPanel } from "@/components/safety-diary-panel";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生日誌 電子記録ツール";
const _desc =
  "現場の安全活動を記録する安全衛生日誌。行・列・項目を自由に編集でき、ブラウザに保存。建設・製造現場の安全管理記録に。";

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

export default function SafetyDiaryPage() {
  return (
    <>
      <PageJsonLd name="安全日報" description="日次の安全活動・KY項目・ヒヤリハットを記録。事業所単位で集計・PDF出力。" path="/safety-diary" />
      <SafetyDiaryPanel />
    </>
  );
}
