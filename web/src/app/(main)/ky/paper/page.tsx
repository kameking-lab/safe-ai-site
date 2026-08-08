import type { Metadata } from "next";
import { JsonLd, howToSchema } from "@/components/json-ld";
import { KyZeroFrictionBuilder } from "@/components/ky-paper/ky-zero-friction-builder";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "KYを作る｜危険・対策候補とKY用紙PDF";
const DESC =
  "作業内容から検証済みの危険・対策候補を提示。地域の気象・WBGT、メンバー、端末内31日保存、A4 PDFに対応した無料KY作成ツールです。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/ky/paper" },
  robots: { index: true, follow: true },
  openGraph: withSiteOpenGraph("/ky/paper", {
    title: TITLE,
    description: DESC,
    images: [{ url: ogImageUrl(TITLE, DESC), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title: TITLE,
    description: DESC,
    images: [ogImageUrl(TITLE, DESC)],
  }),
};

const KY_HOWTO = howToSchema({
  name: "KY（危険予知）を短時間で作成する手順",
  description:
    "作業内容から危険と対策の候補を選び、人が現場条件を確認してKY用紙をPDF保存する手順。",
  url: "https://www.anzen-ai-portal.jp/ky/paper",
  steps: [
    {
      name: "作業を入力",
      text: "日時・地域・メンバー・作業内容を入力する。地域確定後は気象とWBGTを確認する。",
    },
    {
      name: "危険を選択",
      text: "作業内容と気象から表示された検証済み候補を確認して選ぶ。必要な危険は手入力する。",
    },
    {
      name: "対策を選択",
      text: "危険ごとの具体的な対策候補を確認して選び、現場条件に合わせて編集または追加する。",
    },
    {
      name: "人が確認してPDF保存",
      text: "未確認項目を確認し、確認者を入力して確定する。下書きまたは確認済みのA4 PDFを端末内で保存する。",
    },
  ],
});

export default function KyPaperPage() {
  const initialNowIso = new Date().toISOString();
  return (
    <>
      <PageJsonLd
        name={TITLE}
        description={DESC}
        path="/ky/paper"
        keywords={[
          "KY用紙 作成",
          "危険予知 対策",
          "KY PDF",
          "建設業 KY",
        ]}
      />
      <JsonLd schema={KY_HOWTO} />
      <KyZeroFrictionBuilder initialNowIso={initialNowIso} />
      <noscript>
        <style>{`#ky-paper-start { display: none !important; }`}</style>
        <section className="mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-bold">KYを作る（印刷用HTML）</h1>
          <p>JavaScriptが無効です。この用紙を印刷し、印刷後に空欄を手書きしてください。</p>
          <table className="mt-4 w-full border-collapse border border-slate-900 text-sm">
            <tbody>
              {[
                "作業日・時間",
                "場所",
                "メンバー",
                "作業内容",
                "気象・気温・湿度・WBGT（区分・対象時刻・取得時刻・提供元）",
                "危険",
                "対策",
                "確認者",
                "備考",
              ].map((label) => (
                <tr key={label}>
                  <th scope="row" className="w-1/3 border border-slate-900 p-3 text-left">{label}</th>
                  <td className="h-16 border border-slate-900 p-3">　</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-bold">下書き・未確認</p>
          <p className="text-sm">候補と気象値は利用できません。現場条件と公式情報を人が確認してください。</p>
        </section>
      </noscript>
    </>
  );
}
