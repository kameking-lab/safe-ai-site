import type { Metadata } from "next";
import { Suspense } from "react";
import { PageJsonLd } from "@/components/page-json-ld";
import { SearchResults } from "./SearchResults";
import { SearchFallback, SearchPageHeader } from "./search-page-components";

const _title = "安全情報を横断検索";
const _desc =
  "法令、事故、化学物質、資格、教育、KYT、実務ツール、自動化サンプルを横断検索。主力機能・公式情報・サンプルを区別して表示します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/search" },
  // サイト内検索の結果ページはクエリ毎の薄い重複ページを生むため noindex。
  // ただし follow にしてヒット先（判例/通達/物質詳細）へのクロールは通す。
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <>
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/search"
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <SearchPageHeader />
        <Suspense fallback={<SearchFallback />}>
          <SearchResults />
        </Suspense>
      </div>
    </>
  );
}
