import type { Metadata } from "next";
import Link from "next/link";
import {
  publicMhlwNotices as secondaryNoticeIndex,
  verifiedMhlwNotices as mhlwNotices,
} from "@/data/public-mhlw-notices";
import { PageContainer } from "@/components/layout";
import { LawHubNav } from "@/components/law-hub-nav";
import { ogImageUrl } from "@/lib/og-url";
import { CircularsHeader, CircularsFooter } from "./CircularsI18n";
import { CircularsFilterableList } from "./CircularsFilterableList";
import { CourtPrecedentsList } from "@/components/circulars/court-precedents-list";
import { SITE_STATS } from "@/data/site-stats";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "厚労省通達・告示・指針 一覧",
  description:
    `労働安全衛生に関する通達・告示・指針の個別原文確認済みレコード (${mhlwNotices.length}件)。二次索引候補${secondaryNoticeIndex.length}件と未確認判例は判断画面から隔離しています。`,
  alternates: { canonical: "/circulars" },
  openGraph: {
    title: "厚労省通達・告示・指針 一覧",
    description:
      `労働安全衛生に関する個別原文確認済みの通達等 ${mhlwNotices.length}件。未確認の二次索引と判例は隔離中です。`,
    images: [{ url: ogImageUrl("厚労省通達・判例 一覧"), width: 1200, height: 630 }],
  },
};

export default function CircularsIndexPage() {
  // P1-I: 全件をクライアントへ渡し、キーワード+期間+種別フィルタで絞り込み。
  // 並び順は新→旧。
  const sorted = [...mhlwNotices].sort((a, b) =>
    (b.issuedDate ?? "").localeCompare(a.issuedDate ?? "")
  );

  return (
    <>
    <LawHubNav current="circulars" />
    <PageContainer width="wide">
      <PageJsonLd name="厚労省通達・告示・指針 一覧" description={`個別原文・文書番号・発出日の確認済みレコード${mhlwNotices.length}件を表示。二次索引候補${secondaryNoticeIndex.length}件と未確認判例は隔離しています。`} path="/circulars" />
      <CircularsHeader total={mhlwNotices.length} shown={sorted.length} />

      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        現在、個別原文まで確認済みの公開レコードは{mhlwNotices.length}件です。
        二次索引候補{secondaryNoticeIndex.length}件は、本文・文書番号・発出日・後継文書の確認が終わるまで検索結果へ出しません。
        通達等は
        <a
          href="https://www.mhlw.go.jp/hourei/"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-1 font-semibold underline underline-offset-2"
        >
          厚生労働省 法令等データベースサービス
        </a>
        で確認してください。
      </div>

      <CircularsFilterableList all={sorted} />

      <CourtPrecedentsList precedents={[]} />

      <CircularsFooter />

      <section aria-label="補助ハブ" className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-base font-bold text-slate-900">補助ハブ</h2>
        <div className="grid gap-3 sm:grid-cols-1">
          <Link href="/resources" className="block min-h-[64px] rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-100">
            厚労省資料への確認導線
            <span className="mt-0.5 block text-[11px] font-normal text-violet-700">個別確認済み通達等とリーフレット索引を確認（計 {SITE_STATS.mhlwResourcesTotalCount}件）</span>
          </Link>
        </div>
      </section>
    </PageContainer>
    </>
  );
}
