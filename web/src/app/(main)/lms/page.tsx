import type { Metadata } from "next";
import { LmsPanel } from "@/components/lms-panel";
import { PageContainer } from "@/components/layout";
import { ogImageUrl } from "@/lib/og-url";
import { LmsWaitlistBanner } from "./LmsWaitlistBanner";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "多拠点 学習管理システム（LMS）β";
const _desc =
  "複数拠点・部署の安全教育を一元管理。受講進捗・グループ管理・修了証発行・業種別レポートをまとめて確認できます。2026年秋β公開予定、現在ウェイティングリスト先行受付中。";

export const metadata: Metadata = {
  alternates: { canonical: "/lms" },
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function LmsPage() {
  return (
    <>
      
      <PageJsonLd name="学習管理システム (LMS)" description="事業所単位での教育受講管理・修了証発行・進捗トラッキング。" path="/lms" />
      {/* βウェイティングリスト — 2026年秋公開予定 */}
      <PageContainer width="wide" paddingY="none" className="mt-4">
        <LmsWaitlistBanner />
      </PageContainer>
      <LmsPanel />
    </>
  );
}
