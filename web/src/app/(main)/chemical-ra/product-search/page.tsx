import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductSearchPanel } from "@/components/product-search-panel";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";

const _title = "SDS製品検索＋自動リスクアセスメント";
const _desc =
  "製品名・メーカー名から含有化学物質を検索し、CREATE-SIMPLE準拠の簡略リスクアセスメントを自動実行。換気・取扱量・作業時間からI〜IVのリスクレベルを判定し、対策を提示します。";

export const metadata: Metadata = {
  alternates: { canonical: "/chemical-ra/product-search" },
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function ProductSearchPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Link
          href="/chemical-ra"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          化学物質RA に戻る
        </Link>
      </div>
      <ProductSearchPanel />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/chemical-ra",
            label: "化学物質RA（手入力）",
            description: "成分名・CAS番号がわかっている場合の直接入力フォーム。",
            color: "emerald",
            cta: "手入力で評価",
          },
          {
            href: "/chemical-database",
            label: "化学物質検索DB",
            description: "厚労省 8,400物質超の規制区分・濃度基準値を横断検索。",
            color: "blue",
            cta: "物質を調べる",
          },
          {
            href: "/equipment-finder",
            label: "保護具AIファインダー",
            description: "検出された化学物質に対応する保護手袋・呼吸器を選定。",
            color: "amber",
            cta: "保護具を選ぶ",
          },
        ]}
      />
    </>
  );
}
