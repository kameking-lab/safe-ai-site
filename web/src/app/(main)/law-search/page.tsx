import type { Metadata } from "next";
import { LawSearchPanel } from "@/components/law-search-panel";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生法令 条文全文検索（厚労省公式PDF対応）";
const _desc =
  "労働安全衛生法・安衛則・クレーン則・有機則・特化則・石綿則・じん肺法など全33法令の条文を全文検索。厚労省の令和4年・5年の省令改正・施行通達 PDF から抽出した条文も含む。条番号・キーワード・法令名で絞り込み可能。";

export const metadata: Metadata = {
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

export default function LawSearchPage() {
  return (
    <>
      
      <PageJsonLd name="法令条文検索" description="労働安全衛生法・関連政令・省令の条文を全文検索。条文間の参照リンクも追跡。" path="/law-search" />
      <LawSearchPanel />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/laws",
            label: "法改正一覧（年表）",
            description: "見つけた条文の改正履歴・施行日・AI要約を時系列で確認。",
            color: "emerald",
            cta: "改正履歴を見る",
          },
          {
            href: "/circulars",
            label: "通達原文",
            description: "条文を補足する厚労省通達の原文を縦長スクロールで閲覧。",
            color: "amber",
            cta: "通達を読む",
          },
          {
            href: "/chatbot",
            label: "安衛法AIチャット",
            description: "条文の解釈や適用判断を AI に質問。条文番号と通達を出典に提示。",
            color: "blue",
            cta: "AIに聞く",
          },
          {
            href: "/laws/glossary",
            label: "法令用語集",
            description: "公布／施行／告示／通達／指針の違いと拘束力を一次出典付きで解説。",
            color: "purple",
            cta: "用語を確認",
          },
        ]}
      />
    </>
  );
}
