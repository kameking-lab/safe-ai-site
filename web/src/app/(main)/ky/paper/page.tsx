import type { Metadata } from "next";
import { Suspense } from "react";
import { KyPaperView } from "@/components/ky-paper/ky-paper-view";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";

const TITLE = "KY用紙ビュー（用紙ファースト）｜危険予知活動表";
const DESC =
  "完成形のKY用紙を見ながら、ズームで確認し、音声またはキーボードで入力。日付・天気は自動取得、参加者は作業員マスターから選ぶだけ。朝礼サイネージにそのまま映せます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/ky/paper" },
  robots: { index: false, follow: true },
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

export default function KyPaperPage() {
  return (
    <>
      <PageJsonLd name={TITLE} description={DESC} path="/ky/paper" />
      <Suspense fallback={<PageSkeleton label="KY用紙ビューを読み込み中" />}>
        <KyPaperView />
      </Suspense>
    </>
  );
}
