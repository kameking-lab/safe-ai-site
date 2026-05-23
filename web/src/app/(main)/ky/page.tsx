import { Suspense } from "react";
import type { Metadata } from "next";
import { KyPaperPageContent } from "@/components/ky-paper/ky-paper-page-content";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, howToSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";

const _title = "KY用紙 作成ツール｜危険予知活動 (用紙ファースト型UI)";
const _desc =
  "危険予知活動表（KY用紙）を完成形そのままの用紙に書き込んで作成。建設・製造の現場で朝礼3分。KY事例150件から引用・AIたたき台・印刷PDF出力に対応。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/ky" },
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

const KY_HOWTO = howToSchema({
  name: "KY（危険予知）活動の進め方",
  description:
    "建設・製造現場で行うKY（危険予知）活動を4ラウンド法でデジタル記録する手順。",
  url: "https://www.anzen-ai-portal.jp/ky",
  totalTime: "PT3M",
  steps: [
    { name: "1R: 現状の把握", text: "作業内容・場所・人員・使用機械を整理し『どんな危険があるか』を全員で出し合う。" },
    { name: "2R: 本質追究", text: "出た危険のうち最も重要な要因（危険のポイント）を◎で選定する。" },
    { name: "3R: 対策の樹立", text: "危険のポイントに対し具体的な対策案を3つ以上挙げる。" },
    { name: "4R: 目標設定", text: "本日の行動目標を1つに絞り、指差呼称で全員で唱和する。" },
  ],
});

export default function KyPage() {
  return (
    <>
      <PageJsonLd name={_title} description={_desc} path="/ky" keywords={["KYT 4ラウンド法 やり方", "建設業 KY 例 作業前確認", "KY用紙 作成 テンプレート", "危険予知活動 手順"]} />
      <JsonLd schema={KY_HOWTO} />
      <Suspense fallback={<PageSkeleton label="KY用紙を読み込み中" />}>
        <KyPaperPageContent />
      </Suspense>
    </>
  );
}
