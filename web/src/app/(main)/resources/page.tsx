import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Library, AlertTriangle } from "lucide-react";
import { ResourcesClient } from "@/components/resources-client";
import { PageContainer } from "@/components/layout";
import { LegalDocBadgeLegend } from "@/components/LegalDocBadge";
import { mhlwNotices } from "@/data/mhlw-notices";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";

import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
const TITLE = "厚労省一次資料DB（通達・告示・指針・リーフレット）";
const DESCRIPTION =
  `厚生労働省・安全衛生情報センターが公開している労働安全衛生関係の通達・告示・指針・リーフレット計${(mhlwNotices.length + mhlwLeaflets.length).toLocaleString()}件を分類・検索できる一次資料データベース。各エントリは原文ページへ直リンクで一次ソースを担保。`;

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
          厚労省一次資料DB
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          通達・告示・指針・リーフレット {total.toLocaleString()}件
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
          厚生労働省と中央労働災害防止協会（安全衛生情報センター）が公開する労働安全衛生関係の
          一次資料を網羅収集。各レコードは原文ページへの直リンクを含み、AI 生成・要約は一切行っていません。
          法的拘束力（告示・通達・参考）の区分も付しています。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat label="通達" value={counts.notice} color="bg-blue-50 text-blue-900 border-blue-200" />
          <Stat label="告示" value={counts.kokuji} color="bg-amber-50 text-amber-900 border-amber-200" />
          <Stat label="指針" value={counts.shishin} color="bg-emerald-50 text-emerald-900 border-emerald-200" />
          <Stat label="リーフレット" value={counts.leaflet} color="bg-rose-50 text-rose-900 border-rose-200" />
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          本ページの全エントリは一次ソース（厚労省／安全衛生情報センター）からの自動収集です。
          実務適用前に必ず原文を確認してください。
        </div>
        <LegalDocBadgeLegend />
      </header>

      <ResourcesClient notices={mhlwNotices} leaflets={mhlwLeaflets} />

      <section aria-label="関連リソース" className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-base font-bold text-slate-900">関連の一次資料ハブ</h2>
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
              通達・告示の本文閲覧
              <span className="mt-0.5 block text-[11px] font-normal text-sky-700">
                重要通達の本文を縦長スクロールで読める閲覧モード
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/laws"
              className="block min-h-[64px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              法改正一覧（年表＋AI要約）
              <span className="mt-0.5 block text-[11px] font-normal text-amber-700">
                100件超の改正を時系列で。施行日カウントダウン付き
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/law-search"
              className="block min-h-[64px] rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            >
              条文検索（安衛法・関係省令）
              <span className="mt-0.5 block text-[11px] font-normal text-violet-700">
                キーワード・条番号から原文へ。e-Gov 直リンク
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
