import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  JsonLd,
  webApplicationSchema,
  COPILOT_FEATURE_PEERS,
} from "@/components/json-ld";
import { PlanGeneratorForm } from "@/components/safety-plan/plan-generator-form";
import { CopilotStepNav } from "@/components/copilot/CopilotStepNav";
import { CopilotMemo } from "@/components/copilot/CopilotMemo";
import { CopilotNextSteps } from "@/components/copilot/CopilotNextSteps";
import { INDUSTRY_LABELS, SCALE_LABELS } from "@/types/safety-plan";
import { ogImageUrl } from "@/lib/og-url";

const _title = "年次安全衛生計画 業種別 ジェネレーター｜10業種×3規模・無料・PDF";
const _desc =
  "年次安全衛生計画 業種別 テンプレートを無料で自動生成 — 建設業・製造業・運輸業・医療福祉ほか10業種×規模3段階の30テンプレートから、基本方針・重点目標・実施事項・月別スケジュール・関連法令を含む安全衛生計画書を作成。PDF出力可。使い方ガイドは /guides/annual-safety-plan-generator を参照。";

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
          { name: "戦略・計画", url: "https://www.anzen-ai-portal.jp/strategy" },
          { name: "年次安全衛生計画ジェネレーター", url: "https://www.anzen-ai-portal.jp/strategy/plan-generator" },
        ]}
      />
      <JsonLd
        schema={webApplicationSchema({
          name: "年次安全衛生計画ジェネレーター",
          description:
            "10業種×3規模の30テンプレートから、基本方針・重点目標・実施事項・月別スケジュール・関連法令を含む年次安全衛生計画書を自動生成します。",
          url: "https://www.anzen-ai-portal.jp/strategy/plan-generator",
          applicationCategory: "BusinessApplication",
          mentions: [COPILOT_FEATURE_PEERS.chatbot, COPILOT_FEATURE_PEERS.accidentsReports],
          featureList: [
            "業種10種×規模3段階の30テンプレート",
            "安衛法・安衛則・関連省令の条文番号付き実施事項",
            "全国安全週間・全国労働衛生週間を含む月別スケジュール",
            "業種別事故レポートとの自動連携",
            "安衛法AIチャットボットでの根拠法令確認導線",
          ],
        })}
      />
      <PageContainer width="prose" className="py-8 md:py-12">
        <div className="mb-4 space-y-3">
          <CopilotStepNav current="plan-generator" />
          <CopilotMemo />
        </div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            年次安全衛生計画ジェネレーター
          </h1>
          {/* P1-D: 説明文を 1 行に圧縮。詳細は <details> 内に移動して
              ファーストビューで業種・規模選択が見えるようにする。 */}
          <p className="mt-2 text-sm text-slate-700">
            業種と規模を選ぶだけで、基本方針・重点目標・月別スケジュール・関連法令付きの年次計画書を自動生成。PDF出力可。
          </p>
          <details className="mt-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-semibold text-emerald-700 hover:text-emerald-800">
              テンプレートと含まれる項目を見る
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>業種10種（{Object.values(INDUSTRY_LABELS).slice(0, 5).join("・")} ほか）×規模3段階（{Object.values(SCALE_LABELS).join("・")}）の30テンプレート。</li>
              <li>安衛法・安衛則・関連省令の条文番号を実施事項に紐付け。</li>
              <li>厚労省通達・告示の出典を計画書末尾に自動掲載。</li>
              <li>月別スケジュールは全国安全週間（7月）・全国労働衛生週間（10月）・防災の日（9月）等の年間イベントを織り込み済み。</li>
            </ul>
          </details>
        </header>

        <Suspense
          fallback={
            <div
              aria-busy="true"
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-32 w-full animate-pulse rounded bg-slate-100" />
            </div>
          }
        >
          <PlanGeneratorForm />
        </Suspense>

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
          <p className="mt-3">
            <Link
              href="/guides/annual-safety-plan-generator"
              className="font-semibold underline hover:text-amber-700"
            >
              → ガイド：年次安全衛生計画ジェネレーター（業種別）の使い方
            </Link>
          </p>
        </section>

        <CopilotNextSteps
          current="plan-generator"
          intro="生成前でも、業種別レポートで事故傾向を先に確認すると、本フォームの「重点取組み」が自動で引き継がれます。"
        />
      </PageContainer>
    </div>
  );
}
