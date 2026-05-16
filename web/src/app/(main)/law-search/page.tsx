import type { Metadata } from "next";
import { Suspense } from "react";
import { LawSearchPanel } from "@/components/law-search-panel";
import { LawHubNav } from "@/components/law-hub-nav";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生法令 条文全文検索（厚労省公式PDF対応）";
const _desc =
  "労働安全衛生法・安衛則・クレーン則・有機則・特化則・石綿則・じん肺法など全33法令の条文を全文検索。厚労省の令和4年・5年の省令改正・施行通達 PDF から抽出した条文も含む。条番号・キーワード・法令名で絞り込み可能。";

export const metadata: Metadata = {
  alternates: { canonical: "/law-search" },
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function LawSearchPage() {
  return (
    <>
      <PageJsonLd name="法令条文検索" description="労働安全衛生法・関連政令・省令の条文を全文検索。条文間の参照リンクも追跡。" path="/law-search" />
      <LawHubNav current="law-search" />
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-6">
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          </div>
        }
      >
        <LawSearchPanel />
      </Suspense>
    </>
  );
}
