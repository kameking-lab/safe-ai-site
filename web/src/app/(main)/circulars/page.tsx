import type { Metadata } from "next";
import Link from "next/link";
import { mhlwNotices } from "@/data/mhlw-notices";
import { PageContainer } from "@/components/layout";
import { LawHubNav } from "@/components/law-hub-nav";
import { ogImageUrl } from "@/lib/og-url";
import { CircularsHeader, CircularsFooter } from "./CircularsI18n";
import { CircularsFilterableList } from "./CircularsFilterableList";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "厚労省通達・告示・指針 一覧",
  description:
    "労働安全衛生に関する厚生労働省の通達・告示・指針を全件横断検索。各通達ごとに概要・関連事故事例・推奨保護具をまとめています。",
  alternates: { canonical: "/circulars" },
  openGraph: {
    title: "厚労省通達・告示・指針 一覧",
    description:
      "労働安全衛生に関する通達を網羅。法的拘束力バッジ・最終確認日付き。",
    images: [{ url: ogImageUrl("厚労省通達 一覧"), width: 1200, height: 630 }],
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
      <PageJsonLd name="厚労省通達・告示・指針 一覧" description="労働安全衛生に関する厚生労働省の通達・告示・指針を全件横断検索。各通達ごとに概要・関連事故事例・推奨保護具をまとめています。" path="/circulars" />
      <CircularsHeader total={mhlwNotices.length} shown={sorted.length} />

      <CircularsFilterableList all={sorted} />

      <CircularsFooter />

      <section aria-label="補助ハブ" className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-base font-bold text-slate-900">補助ハブ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/laws/notices-precedents" className="block min-h-[64px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100">
            通達・判例 解説
            <span className="mt-0.5 block text-[11px] font-normal text-amber-700">行政解釈と最高裁判例の整理（実務出典）</span>
          </Link>
          <Link href="/resources" className="block min-h-[64px] rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-100">
            厚労省一次資料DB
            <span className="mt-0.5 block text-[11px] font-normal text-violet-700">告示・指針・リーフレットを含む 1,158件</span>
          </Link>
        </div>
      </section>
    </PageContainer>
    </>
  );
}
