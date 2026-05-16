import type { Metadata } from "next";
import { Suspense } from "react";
import { KyExamplesBrowser } from "@/components/ky-examples-browser";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "KY事例データベース｜業種・作業別の危険予知例150件";
const DESC =
  "建設・製造・運輸・医療福祉・サービスの5業種×10作業別に整理した、危険要因・リスク・対策の参考例。KY用紙作成の出発点として活用できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/ky-examples" },
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

export default function KyExamplesPage() {
  return (
    <Suspense fallback={<PageSkeleton label="KY事例データベースを読み込み中" />}>
      <KyExamplesBrowser />
    </Suspense>
  );
}
