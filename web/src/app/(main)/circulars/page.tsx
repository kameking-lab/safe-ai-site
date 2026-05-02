import type { Metadata } from "next";
import Link from "next/link";
import { mhlwNotices } from "@/data/mhlw-notices";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "厚労省通達・告示・指針 一覧",
  description:
    "労働安全衛生に関する厚生労働省の通達・告示・指針を全件横断検索。各通達ごとに概要・関連事故事例・推奨保護具をまとめています。",
  alternates: { canonical: "/circulars" },
  openGraph: {
    title: "厚労省通達・告示・指針 一覧｜ANZEN AI",
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
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="厚労省通達・告示・指針 一覧" description="労働安全衛生に関する厚生労働省の通達・告示・指針を全件横断検索。各通達ごとに概要・関連事故事例・推奨保護具をまとめています。" path="/circulars" />
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          厚労省通達・告示・指針 一覧
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          収録件数: <strong>{mhlwNotices.length.toLocaleString("ja-JP")}件</strong>
          （直近{recent.length}件を表示）
        </p>
      </header>

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

      <p className="mt-6 text-xs text-slate-500">
        ※ 出典: 中央労働災害防止協会 安全衛生情報センター（jaish.gr.jp）。本一覧は ANZEN AI が公開情報を整理し、最終確認日を付与したものです。
      </p>
    </main>
  );
}
