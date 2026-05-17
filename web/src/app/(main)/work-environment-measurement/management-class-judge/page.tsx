import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { WorkEnvManagementClassJudge } from "@/components/work-env-management-class-judge";

const _title = "管理区分 判定ツール | 作業環境測定";
const _desc =
  "A測定・B測定の値と管理濃度を入力すると、作業環境測定基準告示に基づく管理区分（第1〜第3）を即座に判定。区分別の義務的改善措置（換気強化・呼吸用保護具・再測定）もあわせて確認できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/work-environment-measurement/management-class-judge" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function ManagementClassJudgePage() {
  return (
    <>
      <PageJsonLd
        name="管理区分 判定ツール"
        description="作業環境測定基準告示に基づく第1〜第3管理区分を判定し、改善措置を提案するツール。"
        path="/work-environment-measurement/management-class-judge"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "作業環境測定",
            url: "https://www.anzen-ai-portal.jp/work-environment-measurement",
          },
          {
            name: "管理区分 判定ツール",
            url: "https://www.anzen-ai-portal.jp/work-environment-measurement/management-class-judge",
          },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5">
          <Link
            href="/work-environment-measurement"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-700"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            作業環境測定トップに戻る
          </Link>
        </div>

        <header className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            管理区分 判定ツール
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            A測定値・B測定値と管理濃度を入力すると、作業環境測定基準告示に基づき
            管理区分（第1〜第3）を判定し、義務的改善措置を一覧表示します。
          </p>
        </header>

        <WorkEnvManagementClassJudge />
      </div>
    </>
  );
}
