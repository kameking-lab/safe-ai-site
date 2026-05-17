import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { PlanGeneratorForm } from "@/components/safety-plan/plan-generator-form";
import { INDUSTRY_LABELS, SCALE_LABELS } from "@/types/safety-plan";
import { ogImageUrl } from "@/lib/og-url";

const _title = "年次安全衛生計画ジェネレーター｜業種・規模別テンプレート";
const _desc =
  "業種10種×規模3段階の30テンプレートから、年次安全衛生計画（基本方針・重点目標・実施事項・月別スケジュール）を自動生成。安衛法・安衛則・通達・告示に対応。PDF出力可。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/strategy/plan-generator" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function PlanGeneratorPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="年次安全衛生計画ジェネレーター"
        description={_desc}
        path="/strategy/plan-generator"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "戦略・計画", url: "https://www.anzen-ai-portal.jp/strategy/plan-generator" },
          { name: "年次安全衛生計画ジェネレーター", url: "https://www.anzen-ai-portal.jp/strategy/plan-generator" },
        ]}
      />
      <PageContainer width="prose" className="py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            年次安全衛生計画ジェネレーター
          </h1>
          <p className="mt-3 text-base text-slate-700">
            業種と規模を選ぶだけで、基本方針・重点目標・実施事項・月別スケジュール・関連法令を含む年次安全衛生計画書の雛形を作成します。生成後はそのままブラウザでPDFに出力できます。
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-slate-600">
            <li>業種10種（{Object.values(INDUSTRY_LABELS).slice(0, 5).join("・")} ほか）×規模3段階（{Object.values(SCALE_LABELS).join("・")}）の30テンプレート。</li>
            <li>安衛法・安衛則・関連省令の条文番号を実施事項に紐付け。</li>
            <li>厚労省通達・告示の出典を計画書末尾に自動掲載。</li>
            <li>月別スケジュールは全国安全週間（7月）・全国労働衛生週間（10月）・防災の日（9月）等の年間イベントを織り込み済み。</li>
          </ul>
        </header>

        <PlanGeneratorForm />

        <section className="mt-10 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <h2 className="font-semibold">生成された計画書の使い方</h2>
          <p className="mt-1">
            生成された雛形は安全衛生委員会で審議し、自社の作業実態・前年度の災害発生状況・健診結果に応じて修正してから施行することを想定しています。{" "}
            <Link href="/laws" className="underline">
              法改正一覧
            </Link>
            と{" "}
            <Link href="/circulars" className="underline">
              通達・告示一覧
            </Link>{" "}
            も併せてご確認ください。
          </p>
        </section>
      </PageContainer>
    </div>
  );
}
