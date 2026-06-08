import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { NotificationBuilder } from "./NotificationBuilder";
import { ogImageUrl } from "@/lib/og-url";

const _title =
  "届出書類リスト 自動生成｜石綿（アスベスト）対応支援";
const _desc =
  "プロジェクト規模・石綿レベルに応じて、労基署・自治体・現場掲示・社内保存に必要な届出書類を自動生成。期限・記載事項・提出先を一覧化し、印刷出力に対応します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/asbestos-management/notification-builder" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/asbestos-management/notification-builder",
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
        name="届出書類リスト 自動生成"
        description={_desc}
        path="/asbestos-management/notification-builder"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "石綿対応支援", url: "https://www.anzen-ai-portal.jp/asbestos-management" },
          {
            name: "届出書類リスト 自動生成",
            url: "https://www.anzen-ai-portal.jp/asbestos-management/notification-builder",
          },
        ]}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Notification Form Builder
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            届出書類リスト 自動生成
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            工事種別・規模・石綿レベルを指定すると、提出が必要な届出書類と期限、記載事項、提出先がリスト化されます。印刷ボタンから A4 1〜2 枚に出力できます。
          </p>
        </header>
        <Suspense fallback={null}>
          <NotificationBuilder />
        </Suspense>
      </PageContainer>
    </div>
  );
}
