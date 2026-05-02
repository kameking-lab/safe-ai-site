import type { Metadata } from "next";
import { LawSearchPanel } from "@/components/law-search-panel";
import { EnterpriseFunnel } from "@/components/EnterpriseFunnel";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生法令 条文全文検索（厚労省公式PDF対応）";
const _desc =
  "労働安全衛生法・安衛則・クレーン則・有機則・特化則・石綿則・じん肺法など全33法令の条文を全文検索。厚労省の令和4年・5年の省令改正・施行通達 PDF から抽出した条文も含む。条番号・キーワード・法令名で絞り込み可能。";

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
  return (
    <>
      
      <PageJsonLd name="法令条文検索" description="労働安全衛生法・関連政令・省令の条文を全文検索。条文間の参照リンクも追跡。" path="/law-search" />
      <LawSearchPanel />
      <EnterpriseFunnel
        service="law-notify"
        headline="法改正の見落としをゼロに"
        subline="貴社の業種・取扱物質・機械に絞った監視ルールを設定。改正があれば即時メール／Slack通知＋影響評価レポートをお届けします。"
      />
    </>
  );
}
