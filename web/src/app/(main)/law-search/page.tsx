import type { Metadata } from "next";
import { LawSearchPanel } from "@/components/law-search-panel";
import { ogImageUrl } from "@/lib/og-url";
import Link from "next/link";

import { PageJsonLd } from "@/components/page-json-ld";
import { PageContainer } from "@/components/layout/page-container";
import {
  NoScriptLawSearch,
  safeArticleParam,
  safeLawParam,
} from "./law-search-noscript";
const _title = "安全衛生法令 条文検索（e-Gov正本確認付き）";
const _desc =
  "収録済みの安全衛生法令索引を、条番号・キーワード・法令名で検索できます。結果ごとの検証状態を確認し、判断前にe-Gov法令検索で現行条文と施行日を確認します。";

export const metadata: Metadata = {
  alternates: { canonical: "/law-search" },
  referrer: "no-referrer",
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

type LawSearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LawSearchPage({
  searchParams,
}: LawSearchPageProps) {
  const params = await searchParams;
  // 自由質問や現場情報をURLから入力欄へ復元しない。構造化値だけを扱う。
  const initialQuery = "";
  const initialArticleNumQuery = safeArticleParam(params.art);
  const initialSelectedLaw = safeLawParam(params.law);

  return (
    <>
      <PageJsonLd name="法令収録条文検索" description="サイトに収録した労働安全衛生法・関連政令・省令の条文索引を検索し、e-Gov正本へ案内します。" path="/law-search" />
      <PageContainer>
        <header className="pb-4 pt-6 sm:pt-9">
          <p className="text-xs font-black tracking-[.14em] text-emerald-800">法令・資格</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">法令・条文を検索</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">キーワード、条番号、法令名で検索できます。</p>
        </header>
      </PageContainer>
      <noscript>
        <style>{`#law-search-js { display: none !important; }`}</style>
        <NoScriptLawSearch
          selectedLaw={initialSelectedLaw}
          articleNumber={initialArticleNumQuery}
        />
      </noscript>
      <div id="law-search-js">
        <LawSearchPanel
          initialQuery={initialQuery}
          initialArticleNumQuery={initialArticleNumQuery}
          initialSelectedLaw={initialSelectedLaw}
        />
      </div>
      <PageContainer>
        <nav aria-label="法令検索の関連操作" className="mt-20 flex flex-wrap gap-x-5 gap-y-1">
          <a href="https://laws.e-gov.go.jp/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">e-Govで原文を開く</a>
          <Link href="/chatbot" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">条件を含めて質問する</Link>
          <Link href="/about/usage-notes" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">注意事項</Link>
        </nav>
      </PageContainer>
    </>
  );
}
