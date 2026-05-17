import type { Metadata } from "next";
import { LmsPanel } from "@/components/lms-panel";
import { PageContainer } from "@/components/layout";
import { LmsWaitlistBanner } from "./LmsWaitlistBanner";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "多拠点 学習管理システム（LMS）";
const _desc =
  "複数拠点・部署の安全教育を一元管理。受講進捗・グループ管理・修了証発行・業種別レポートをまとめて確認できます。先行登録受付中。";

export const metadata: Metadata = {
  // Pre-launch feature — keep out of search index and OG previews until release.
  // Audit reference: harsh-third-party-2026-05-16 F-001.
  title: _title,
  description: _desc,
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null as unknown as string },
};

export default function LmsPage() {
  return (
    <>

      <PageJsonLd name="学習管理システム (LMS)" description="事業所単位での教育受講管理・修了証発行・進捗トラッキング。" path="/lms" />
      {/* ウェイティングリスト — 先行登録受付中 */}
      <PageContainer width="wide" paddingY="none" className="mt-4">
        <LmsWaitlistBanner />
      </PageContainer>
      <LmsPanel />
    </>
  );
}
