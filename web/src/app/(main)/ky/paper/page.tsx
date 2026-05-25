import type { Metadata } from "next";
import { Suspense } from "react";
import { KyPaperView } from "@/components/ky-paper/ky-paper-view";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, howToSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";

const TITLE = "KY用紙 作成ツール｜危険予知活動表（用紙ファースト）";
const DESC =
  "完成形のKY用紙を見ながら、ズームで確認し、音声またはキーボードで入力。日付・天気は自動取得、参加者は作業員マスターから選ぶだけ。AIが危険箇所を提案し、朝礼サイネージにそのまま映せます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  // 一本化により /ky/paper が KY 入力の正規ページ。検索インデックス対象にする。
  alternates: { canonical: "/ky/paper" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESC,
    images: [{ url: ogImageUrl(TITLE, DESC), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESC)],
  },
};

const KY_HOWTO = howToSchema({
  name: "KY（危険予知）活動の進め方",
  description: "建設・製造現場で行うKY（危険予知）活動を4ラウンド法でデジタル記録する手順。",
  url: "https://www.anzen-ai-portal.jp/ky/paper",
  totalTime: "PT15M",
  steps: [
    { name: "1R: 現状の把握", text: "作業内容・場所・人員・使用機械を整理し『どんな危険があるか』を全員で出し合う。" },
    { name: "2R: 本質追究", text: "出た危険のうち最も重要な要因（危険のポイント）を選定する。" },
    { name: "3R: 対策の樹立", text: "危険のポイントに対し具体的な対策案を3つ以上挙げる。" },
    { name: "4R: 目標設定", text: "本日の行動目標を1つに絞り、唱和して全員で確認する。" },
  ],
});

export default function KyPaperPage() {
  return (
    <>
      <PageJsonLd
        name={TITLE}
        description={DESC}
        path="/ky/paper"
        keywords={["KYT 4ラウンド法 やり方", "建設業 KY 例 作業前確認", "KY用紙 作成 テンプレート", "危険予知活動 手順"]}
      />
      <JsonLd schema={KY_HOWTO} />
      <Suspense fallback={<PageSkeleton label="KY用紙ビューを読み込み中" />}>
        <KyPaperView />
      </Suspense>
    </>
  );
}
