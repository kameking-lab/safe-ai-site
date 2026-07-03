import type { Metadata } from "next";
import { Suspense } from "react";
import { PageJsonLd } from "@/components/page-json-ld";
import { SearchResults } from "./SearchResults";

const _title = "サイト内 横断検索";
const _desc =
  "法令条文・法改正記事・労災判例・厚労省通達・化学物質・特別教育・事故事例をまとめて横断検索。キーワード1つで安全衛生の必要情報へ最短到達。";

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
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-4xl space-y-3 px-4 py-6 sm:px-6">
            <div className="h-8 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </>
  );
}
