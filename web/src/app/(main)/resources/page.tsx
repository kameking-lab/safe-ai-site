import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Library, AlertTriangle } from "lucide-react";
import { ResourcesClient } from "@/components/resources-client";
import { PageContainer } from "@/components/layout";
import { LegalDocBadgeLegend } from "@/components/LegalDocBadge";
import {
  publicMhlwNotices as secondaryNoticeIndex,
  verifiedMhlwNotices as mhlwNotices,
} from "@/data/public-mhlw-notices";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";

import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
const TITLE = "厚労省資料への確認導線（通達・告示・指針・リーフレット）";
const DESCRIPTION =
  `個別原文確認済みの通達等${mhlwNotices.length}件とリーフレット索引${mhlwLeaflets.length}件を確認できます。二次索引候補${secondaryNoticeIndex.length}件は本文確認が終わるまで判断画面から隔離しています。`;

export const metadata: Metadata = {
  alternates: { canonical: "/resources" },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/resources",
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function ResourcesPage() {
  const counts = {
    notice: mhlwNotices.filter((n) => n.docType === "通達").length,
    kokuji: mhlwNotices.filter((n) => n.docType === "告示").length,
    shishin: mhlwNotices.filter((n) => n.docType === "指針").length,
    leaflet: mhlwLeaflets.length,
  };
  const total = counts.notice + counts.kokuji + counts.shishin + counts.leaflet;

  return (
    <PageContainer width="wide">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/resources" />
      <div className="mb-4">
        <Link
          href="/laws"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          法令ハブに戻る
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <Library className="h-4 w-4" aria-hidden="true" />
          厚労省資料への確認導線
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          確認済み通達等・リーフレット索引 {total.toLocaleString()}件
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
          個別原文まで確認できた通達等と、厚生労働省等が公開するリーフレットへの索引を分けて表示します。
          このサイトの索引は正本ではありません。法的位置付け・適用日・後継資料はリンク先の公式資料で確認してください。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat label="通達" value={counts.notice} color="bg-blue-50 text-blue-900 border-blue-200" />
          <Stat label="告示" value={counts.kokuji} color="bg-amber-50 text-amber-900 border-amber-200" />
          <Stat label="指針" value={counts.shishin} color="bg-emerald-50 text-emerald-900 border-emerald-200" />
          <Stat label="リーフレット" value={counts.leaflet} color="bg-rose-50 text-rose-900 border-rose-200" />
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          二次索引候補{secondaryNoticeIndex.length}件は、個別本文・文書番号・発出日・後継関係が未確認のため表示していません。
          リーフレットは資料への索引であり、法的義務の判定には使えません。実務適用前に公式原文を確認してください。
        </div>
        <LegalDocBadgeLegend />
      </header>

      <ResourcesClient notices={mhlwNotices} leaflets={mhlwLeaflets} />

      <section aria-label="関連リソース" className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-base font-bold text-slate-900">関連する公式資料・検索</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <Link
              href="/resources/mlit"
              className="block min-h-[64px] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              国交省（MLIT）安全衛生資料
              <span className="mt-0.5 block text-[11px] font-normal text-emerald-700">
                建設業労働災害防止対策・通達・要綱の建設専門コーナー
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/circulars"
              className="block min-h-[64px] rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-100"
            >
              個別確認済み通達・告示
              <span className="mt-0.5 block text-[11px] font-normal text-sky-700">
                確認済みレコードだけを表示。未確認の二次索引候補は隔離
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/laws"
              className="block min-h-[64px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              法改正情報の確認導線
              <span className="mt-0.5 block text-[11px] font-normal text-amber-700">
                施行日と一次資料を確認してから実務判断
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/law-search"
              className="block min-h-[64px] rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            >
              サイト収録条文検索（安衛法・関係省令）
              <span className="mt-0.5 block text-[11px] font-normal text-violet-700">
                キーワード・条番号からe-Gov正本への確認導線へ
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </PageContainer>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-baseline justify-between rounded-lg border px-3 py-2 ${color}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-lg font-bold">{value.toLocaleString()}</span>
    </div>
  );
}
