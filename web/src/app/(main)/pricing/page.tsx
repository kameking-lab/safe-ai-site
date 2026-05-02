import type { Metadata } from "next";
import Link from "next/link";
import { ogImageUrl } from "@/lib/og-url";
import { PricingContent } from "./PricingContent";
import { PAID_MODE } from "@/lib/paid-mode";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "料金プラン｜無料・月額・受託までの5プラン";
const _desc =
  "ANZEN AI の料金プラン。無料¥0／スタンダード¥980／プロ¥2,980／ビジネス¥29,800／受託（個別見積）の5層。個人から500名規模まで、段階的に導入できます。";

export const metadata: Metadata = PAID_MODE
  ? {
      title: _title,
      description: _desc,
      openGraph: {
        title: `${_title}｜ANZEN AI`,
        description: _desc,
        images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        images: [ogImageUrl(_title, _desc)],
      },
    }
  : {
      title: "料金プラン（準備中）",
      description:
        "ANZEN AI は現在、研究・実証プロジェクトとして全機能を無料公開しています。料金プランは準備中です。",
      robots: { index: false, follow: false },
      alternates: { canonical: "/pricing" },
    };

export default function PricingPage() {
  if (!PAID_MODE) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={_title} description="ANZEN AI は現在、研究・実証プロジェクトとして全機能を無料公開しています。料金プランは準備中です。" path="/pricing" />
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            研究・実証プロジェクト
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            料金プランは現在準備中です
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            ANZEN AI は現時点で個人運営の研究・実証プロジェクトです。
            通達・事故事例・化学物質情報・KY用紙・Eラーニング等、すべての機能を無料でお使いいただけます。
          </p>
          <p className="mt-3 text-xs text-slate-500">
            将来的な料金設計はあくまで構想段階です。実装時期・価格は未定です。
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
            >
              機能を試す
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              ご意見・改善提案を送る
            </Link>
          </div>
        </div>
      </main>
    );
  }
  return <PricingContent />;
}
