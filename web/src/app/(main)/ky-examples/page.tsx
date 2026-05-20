import type { Metadata } from "next";
import { Suspense } from "react";
import { KyExamplesBrowser } from "@/components/ky-examples-browser";
import { CrossToolLinks } from "@/components/cross-tool-links";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";

const TITLE = "KY事例データベース｜業種・作業別の危険予知例150件";
const DESC =
  "建設業 KY 例・製造業 KY 例など5業種×10作業別に整理した危険予知例 150件。危険要因・リスク・対策・KY 例文を PDF 形式で確認でき、KY用紙作成の出発点として活用できます。";

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
    <>
      <PageJsonLd
        name="KY事例データベース"
        description={DESC}
        path="/ky-examples"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "実務ツール", url: "https://www.anzen-ai-portal.jp/features" },
          { name: "KY事例DB", url: "https://www.anzen-ai-portal.jp/ky-examples" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "KY事例データベース",
          description: DESC,
          url: "https://www.anzen-ai-portal.jp/ky-examples",
          inLanguage: "ja",
          license: "https://www.anzen-ai-portal.jp/terms",
          creator: {
            "@type": "Organization",
            name: "Anzen AI Portal",
            url: "https://www.anzen-ai-portal.jp",
          },
          keywords: ["危険予知", "KY活動", "リスクアセスメント", "労働安全", "建設業 KY 例文", "製造業 KY 例 PDF", "KYT 4ラウンド法", "足場 危険予知", "墜落防止 KY"],
        }}
      />
      <Suspense fallback={<PageSkeleton label="KY事例データベースを読み込み中" />}>
        <KyExamplesBrowser />
      </Suspense>
      <CrossToolLinks exclude="ky-examples" />
    </>
  );
}
