import type { Metadata } from "next";
import { LawSearchPanel } from "@/components/law-search-panel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安全衛生法令 条文全文検索（MHLW公式法令PDF対応）";
const _desc =
  "労働安全衛生法・安衛則・クレーン則・有機則・特化則などの条文に加え、厚労省の R4/R5 省令改正・施行通達 PDF から抽出した 295 条文（生データ 588 チャンク）をキーワード・条番号・法令名で全文検索。";

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

export default function LawSearchPage() {
  return <LawSearchPanel />;
}
