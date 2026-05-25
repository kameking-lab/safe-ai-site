import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkersMasterClient } from "@/components/ky/workers-master-client";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";

const TITLE = "作業員マスター｜KY用紙の署名を選ぶだけに";
const DESC =
  "現場の作業員を一度登録すれば、KY用紙の参加者をチェックで選べます。氏名・所属・必要資格を端末に保存。毎朝の手入力をなくし、朝礼を速くします。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/ky/workers" },
  openGraph: {
    title: TITLE,
    description: DESC,
    images: [{ url: ogImageUrl(TITLE, DESC), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESC)],
  },
};

export default function KyWorkersPage() {
  return (
    <>
      <PageJsonLd name="作業員マスター" description={DESC} path="/ky/workers" />
      <Suspense fallback={<PageSkeleton label="作業員マスターを読み込み中" />}>
        <WorkersMasterClient />
      </Suspense>
    </>
  );
}
