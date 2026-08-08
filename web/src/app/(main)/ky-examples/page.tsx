import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { KyExamplesBrowser } from "@/components/ky-examples-browser";
import { CrossToolLinks } from "@/components/cross-tool-links";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";

const TITLE = "KYモデルケース｜業種・作業別の危険予知例（未監修）";
const DESC =
  "5業種×10作業別に整理したサイト独自の架空の学習例。現場条件に合わせて編集できます。";

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
        name="KYモデルケース（架空の学習例）"
        description={DESC}
        path="/ky-examples"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "実務ツール",
            url: "https://www.anzen-ai-portal.jp/features",
          },
          {
            name: "KY事例DB",
            url: "https://www.anzen-ai-portal.jp/ky-examples",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "KYモデルケース（架空の学習例）",
          description: DESC,
          url: "https://www.anzen-ai-portal.jp/ky-examples",
          inLanguage: "ja",
          license: "https://www.anzen-ai-portal.jp/terms",
          creator: {
            "@type": "Organization",
            name: "Anzen AI Portal",
            url: "https://www.anzen-ai-portal.jp",
          },
          keywords: [
            "危険予知",
            "KY活動",
            "リスクアセスメント",
            "労働安全",
            "架空の学習例",
          ],
        }}
      />
      <Suspense
        fallback={<PageSkeleton label="KY事例データベースを読み込み中" />}
      >
        <KyExamplesBrowser />
      </Suspense>
      <aside
        aria-labelledby="ky-worker-register-heading"
        className="mx-auto mt-6 max-w-7xl rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <h2 id="ky-worker-register-heading" className="text-lg font-bold">
          KY活動の参加者を管理する
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          作業者台帳で参加者を登録しておくと、KY用紙への入力を簡単にできます。
        </p>
        <Link
          href="/ky/workers"
          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-primary px-4 py-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          KY作業者台帳を開く
        </Link>
      </aside>
      <CrossToolLinks exclude="ky-examples" />
    </>
  );
}
