import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { WorkPlanViewer } from "./WorkPlanViewer";
import { ogImageUrl } from "@/lib/og-url";

const _title = "作業計画書テンプレート｜石綿レベル1〜3別｜石綿対応支援";
const _desc =
  "石綿レベル1（吹付け石綿）・レベル2（保温材等）・レベル3（成形板等）別の作業計画書テンプレート。隔離養生・PPE・気中濃度測定・廃棄物処理・健康管理のチェック項目を統合表示し、印刷出力に対応します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/asbestos-management/work-plan-template" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/asbestos-management/work-plan-template",
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
        name="作業計画書テンプレート"
        description={_desc}
        path="/asbestos-management/work-plan-template"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "石綿対応支援", url: "https://www.anzen-ai-portal.jp/asbestos-management" },
          {
            name: "作業計画書テンプレート",
            url: "https://www.anzen-ai-portal.jp/asbestos-management/work-plan-template",
          },
        ]}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Work Plan Templates
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            石綿レベル別 作業計画書テンプレート
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            石綿障害予防規則・労働安全衛生法・大気汚染防止法・廃棄物処理法を横断した作業計画書のテンプレートです。テンプレートに自社情報・現場条件を追記し、現場 KY・近隣説明・元請承認に活用してください。
          </p>
        </header>
        <WorkPlanViewer />
      </PageContainer>
    </div>
  );
}
