import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { WorkEnvTargetFinder } from "@/components/work-env-target-finder";

const _title = "測定対象作業場チェッカー | 作業環境測定";
const _desc =
  "業種・作業工程・取扱物質を入力すると、安衛令第21条の10種類の測定義務対象のうち自社が該当する作業場を自動判定。測定方法・頻度・必要資格をあわせて確認できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/work-environment-measurement/target-finder" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function TargetFinderPage() {
  return (
    <>
      <PageJsonLd
        name="測定対象作業場チェッカー"
        description="安衛令第21条の測定義務対象を業種・工程・物質から自動判定するツール。"
        path="/work-environment-measurement/target-finder"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "作業環境測定",
            url: "https://www.anzen-ai-portal.jp/work-environment-measurement",
          },
          {
            name: "測定対象作業場チェッカー",
            url: "https://www.anzen-ai-portal.jp/work-environment-measurement/target-finder",
          },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5">
          <Link
            href="/work-environment-measurement"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            作業環境測定トップに戻る
          </Link>
        </div>

        <header className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            測定対象作業場チェッカー
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            業種・作業工程・取扱物質を選択・入力すると、安衛令第21条に基づき
            自社が測定義務を負う作業場を判定します。
          </p>
        </header>

        <WorkEnvTargetFinder />
      </div>
    </>
  );
}
