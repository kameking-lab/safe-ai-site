import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ExternalLink, Table2 } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { LawHubNav } from "@/components/law-hub-nav";
import { BEPPYO_ENTRIES } from "@/data/law-navi/beppyo";
import { findEntryByShort } from "@/lib/law-navi/permalink";
import { LAW_METADATA } from "@/data/law-metadata";
import { ogImageUrl } from "@/lib/og-url";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

const _title = "別表インデックス（何の表かで引く）｜法令ナビ";
const _desc =
  "安衛令の別表を通し番号ではなく意味で引ける索引。別表第3=特定化学物質、別表第6の2=有機溶剤など、各表の中身と根拠条文・e-Gov原文への導線をまとめました。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/law-navi/beppyo" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl(_title)] },
};

export default function LawNaviBeppyoPage() {
  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "ホーム", url: `${SITE_BASE}/` },
          { name: "法令ナビ", url: `${SITE_BASE}/law-navi` },
          { name: "別表インデックス", url: `${SITE_BASE}/law-navi/beppyo` },
        ])}
      />
      <LawHubNav current="law-navi" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="パンくず" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link href="/law-navi" className="inline-flex min-h-[44px] items-center gap-1 hover:text-emerald-700">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            法令ナビ
          </Link>
          <span aria-hidden>›</span>
          <span className="font-semibold text-slate-700">別表インデックス</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">別表インデックス — 「何の表か」で引く</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            安衛令の別表は e-Gov では番号でしか辿れませんが、現場で知りたいのは「特化物の表はどれか」。
            ここでは主要別表を意味から逆引きできます。表の本文（物質・業務の一覧）は e-Gov の原文でご確認ください。
          </p>
        </header>

        <div className="space-y-3">
          {BEPPYO_ENTRIES.map((b) => {
            const egovUrl = LAW_METADATA[b.lawShort]?.egovLawId
              ? `https://laws.e-gov.go.jp/law/${LAW_METADATA[b.lawShort].egovLawId}`
              : null;
            return (
              <section
                key={b.id}
                id={b.id}
                aria-label={`${b.lawShort} ${b.label} ${b.name}`}
                className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white">
                    <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {b.lawShort} {b.label}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{b.name}</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{b.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {egovUrl && (
                    <a
                      href={egovUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      e-Govで表の本文を確認
                    </a>
                  )}
                  {b.relatedArticles.map((ra) => {
                    const entry = findEntryByShort(ra.lawShort, ra.articleNum);
                    if (!entry) return null;
                    return (
                      <Link
                        key={`${ra.lawShort}-${ra.articleNum}`}
                        href={entry.path}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        {ra.lawShort} {ra.articleNum}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] leading-5 text-slate-500">
          収載: 安衛令（第1〜第9・第6の2）・安衛則（第1〜第9）・粉じん則（第1〜第3）・じん肺則・クレーン則・電離則（第1〜第3）の別表。
          各表の適用範囲・除外・裾切値は必ず e-Gov の現行原文でご確認ください。
        </p>
      </div>
    </>
  );
}
