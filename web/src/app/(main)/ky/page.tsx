import { Suspense } from "react";
import type { Metadata } from "next";
import { KyPageContent } from "@/components/ky-page-content";
import { EnterpriseFunnel } from "@/components/EnterpriseFunnel";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, howToSchema } from "@/components/json-ld";

const _title = "KY用紙 作成ツール｜危険予知活動";
const _desc =
  "危険予知活動表（KY用紙）をオンラインで作成・記録。音声入力対応で現場から入力。建設・製造・土木の安全朝礼KY活動に。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/ky" },
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

const KY_HOWTO = howToSchema({
  name: "KY（危険予知）活動の進め方",
  description:
    "建設・製造現場で行うKY（危険予知）活動を4ラウンド法でデジタル記録する手順。",
  url: "https://safe-ai-site.vercel.app/ky",
  totalTime: "PT15M",
  steps: [
    { name: "1R: 現状の把握", text: "作業内容・場所・人員・使用機械を整理し『どんな危険があるか』を全員で出し合う。" },
    { name: "2R: 本質追究", text: "出た危険のうち最も重要な要因（危険のポイント）を選定する。" },
    { name: "3R: 対策の樹立", text: "危険のポイントに対し具体的な対策案を3つ以上挙げる。" },
    { name: "4R: 目標設定", text: "本日の行動目標を1つに絞り、唱和して全員で確認する。" },
  ],
});

export default function KyPage() {
  return (
    <>
      <JsonLd schema={KY_HOWTO} />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500">読み込み中...</div>}>
        <KyPageContent />
      </Suspense>
      <EnterpriseFunnel
        service="ky-digital"
        headline="KY運用を、貴社の現場に最適化しませんか？"
        subline="業種別テンプレート・現場別カスタム・PDF一括ダウンロード・労基署提出フォーマット対応など、貴社専用に作り込みます。"
      />
    </>
  );
}
