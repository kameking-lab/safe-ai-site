import type { Metadata } from "next";
import { ProductSearchPanel } from "@/components/product-search-panel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "SDS製品検索＋自動リスクアセスメント（β）";
const _desc =
  "製品名・メーカー名から含有化学物質を検索し、CREATE-SIMPLE準拠の簡略リスクアセスメントを自動実行。換気・取扱量・作業時間からI〜IVのリスクレベルを判定し、対策を提示します。";

export const metadata: Metadata = {
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
};

export default function ProductSearchPage() {
  return <ProductSearchPanel />;
}
