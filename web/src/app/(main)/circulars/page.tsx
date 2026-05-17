import type { Metadata } from "next";
import Link from "next/link";
import { mhlwNotices } from "@/data/mhlw-notices";
import { PageContainer } from "@/components/layout";
import { LawHubNav } from "@/components/law-hub-nav";
import { ogImageUrl } from "@/lib/og-url";
import { CircularsHeader, CircularsFooter } from "./CircularsI18n";

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

const TYPE_LABEL: Record<string, string> = {
  通達: "📄 通達",
  告示: "🏛 告示",
  指針: "📘 指針",
};

export default function CircularsIndexPage() {
  const sorted = [...mhlwNotices].sort((a, b) =>
    (b.issuedDate ?? "").localeCompare(a.issuedDate ?? "")
  );
  const recent = sorted.slice(0, 100);

  return (
    <>
    <LawHubNav current="circulars" />
    <PageContainer width="wide">
      <PageJsonLd name="厚労省通達・告示・指針 一覧" description="労働安全衛生に関する厚生労働省の通達・告示・指針を全件横断検索。各通達ごとに概要・関連事故事例・推奨保護具をまとめています。" path="/circulars" />
      <CircularsHeader total={mhlwNotices.length} shown={recent.length} />

      <ul className="space-y-2">
        {recent.map((n) => (
          <li
            key={n.id}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                {TYPE_LABEL[n.docType] ?? n.docType}
              </span>
              {n.noticeNumber ? <span>{n.noticeNumber}</span> : null}
              <span>{n.issuedDateRaw ?? n.issuedDate}</span>
            </div>
            <Link
              href={`/circulars/${n.id}`}
              className="mt-1 block text-sm font-semibold text-slate-900 hover:text-emerald-700"
            >
              {n.title}
            </Link>
          </li>
        ))}
      </ul>

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
