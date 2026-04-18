import type { Metadata } from "next";
import { LmsPanel } from "@/components/lms-panel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "多拠点 学習管理システム（LMS）";
const _desc =
  "複数拠点・部署の安全教育を一元管理。受講進捗・グループ管理・修了証発行・業種別レポートをまとめて確認できます。2026年秋リリース予定。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function LmsPage() {
  return <LmsPanel />;
}
