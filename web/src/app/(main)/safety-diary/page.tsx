import type { Metadata } from "next";
import { DiaryListClient } from "@/components/safety-diary/diary-list-client";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";

const _title = "安全衛生日誌 ｜ 必須5項目で3〜5分入力 + 月次まとめ";
const _desc =
  "業種別プリセット（建設/製造/医療福祉/運輸/IT）に対応した安全衛生日誌。必須5項目を3〜5分で入力し、任意8項目で詳細化。月次まとめで延労働人数・KY実施率・ヒヤリ件数を可視化。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/safety-diary" },
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

export default function SafetyDiaryPage() {
  return (
    <>
      <PageJsonLd
        name="安全衛生日誌"
        description="必須5項目+任意8項目の現場日誌。月次まとめで類似事故・関連法改正をハイライト。"
        path="/safety-diary"
      />
      <DiaryListClient />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/ky",
            label: "KY簡易作成",
            description: "朝礼3分で危険予知活動表を作成し、その日の日誌へそのまま転記できます。",
            color: "emerald",
            cta: "KYを書く",
          },
          {
            href: "/pdf",
            label: "PDF エクスポート",
            description: "日誌・KY・RA をワンクリックでPDF出力。協力会社・元請への提出に。",
            color: "sky",
            cta: "PDFを出力",
          },
          {
            href: "/accidents",
            label: "事故事例で振り返り",
            description: "日誌の月次まとめから類似事故を逆引きし、翌月のKYに反映できます。",
            color: "orange",
            cta: "類似事故を見る",
          },
        ]}
      />
    </>
  );
}
