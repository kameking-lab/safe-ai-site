import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { InvestigationCheckerForm } from "./InvestigationCheckerForm";
import { ogImageUrl } from "@/lib/og-url";

const _title =
  "事前調査・報告義務 判定ツール｜石綿（アスベスト）対応支援";
const _desc =
  "建築物の解体・改修工事における石綿事前調査義務、労基署および自治体（大防法）への結果報告義務、建築物石綿含有建材調査者の要否を、建物用途・建築年・工事種別・請負金額・床面積から即時判定します。判定根拠条文付き。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/asbestos-management/investigation-checker" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/asbestos-management/investigation-checker",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="事前調査・報告義務 判定ツール"
        description={_desc}
        path="/asbestos-management/investigation-checker"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "石綿対応支援", url: "https://www.anzen-ai-portal.jp/asbestos-management" },
          {
            name: "事前調査・報告義務 判定ツール",
            url: "https://www.anzen-ai-portal.jp/asbestos-management/investigation-checker",
          },
        ]}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Investigation Requirement Checker
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            事前調査・報告義務 判定ツール
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            プロジェクトの基本情報を入力すると、石綿障害予防規則・労働安全衛生規則・大気汚染防止法に基づく事前調査・報告の要否を判定します。判定結果は条文出典付きで、すぐに社内記録・発注者説明に活用できます。
          </p>
        </header>
        <InvestigationCheckerForm />
        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 md:p-6">
          <h2 className="text-base font-semibold text-slate-900">補足</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>R4.4 改正により、解体・改修工事の事前調査結果は原則として労基署に電子報告（GビズID利用）が必要です。</li>
            <li>R5.10 以降は建築物の事前調査を「建築物石綿含有建材調査者」が実施することが原則となりました。</li>
            <li>工作物（煙突・配管・タンク等）については令和8年4月施行予定の工作物石綿事前調査者制度に注意してください。</li>
            <li>本ツールは石綿障害予防規則・関連通達の公開情報に基づく独自整理であり、所轄労基署の運用解釈は最新情報を参照してください。</li>
          </ul>
        </section>
      </PageContainer>
    </div>
  );
}
