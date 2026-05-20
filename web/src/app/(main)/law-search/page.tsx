import type { Metadata } from "next";
import { Suspense } from "react";
import { LawSearchPanel } from "@/components/law-search-panel";
import { RelatedPageCards } from "@/components/related-page-cards";
import { LawHubNav } from "@/components/law-hub-nav";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生法令 条文全文検索（厚労省公式PDF対応）";
const _desc =
  "安衛則・特化則・有機則など全33法令の条文を全文検索 — 熱中症対策（安衛則612条の2）・フルハーネス義務化・化学物質 自律的管理の改正条文も含む。条番号・キーワード・法令名で絞り込み可能。厚労省公式PDF対応。";

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
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/laws/notices-precedents",
            label: "通達・判例 解説",
            description: "条文を補完する行政解釈と最高裁判例 30 件の整理。",
            color: "amber",
            cta: "通達と判例",
          },
          {
            href: "/laws/glossary",
            label: "法令用語集",
            description: "公布／施行／告示／通達／指針の違いと拘束力を一次出典付きで解説。",
            color: "purple",
            cta: "用語を確認",
          },
          {
            href: "/resources",
            label: "厚労省一次資料DB",
            description: "条文を補強する告示・指針・リーフレットを 1,158件横断検索。",
            color: "emerald",
            cta: "一次資料を開く",
          },
        ]}
      />
    </>
  );
}
