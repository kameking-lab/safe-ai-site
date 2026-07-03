import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { SchedulerForm } from "@/components/health-checkup/scheduler-form";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { ALL_CHECKUP_RULES, ALL_JOB_PROFILES } from "@/data/health-checkup-rules";
import { CHECKUP_TYPE_LABELS } from "@/types/health-checkup";
import { ogImageUrl } from "@/lib/og-url";

// 結論カードのデカ数字はデータから算出（手書き禁止・常に実数と一致）。
const RULE_COUNT = ALL_CHECKUP_RULES.length;
const CATEGORY_COUNT = Object.keys(CHECKUP_TYPE_LABELS).length;
const JOB_COUNT = ALL_JOB_PROFILES.length;

const _title = "健康診断スケジューラ｜業種・職種別に必要な健診30種を自動判定";
const _desc =
  "業種・職種・取扱化学物質・作業条件から、一般健診・特定業務従事者健診・特殊健診（特化則の個別物質14種を含む）・じん肺健診・歯科特殊健診・電離放射線健診・長時間労働者の医師面接指導・海外派遣労働者健診の必要種別を自動判定し、雇入日を起点とした年間スケジュールを生成・繁忙期回避で最適化します。安衛則・有機則・特化則・鉛則・四アルキル鉛則・高気圧則・石綿則・じん肺法・電離則・安衛法第66条の8/安衛則第45条の2 に対応。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/health-checkup-scheduler" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/health-checkup-scheduler",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function HealthCheckupSchedulerPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="健康診断スケジューラ"
        description={_desc}
        path="/health-checkup-scheduler"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "健康診断スケジューラ",
            url: "https://www.anzen-ai-portal.jp/health-checkup-scheduler",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "健康診断スケジューラ",
          url: "https://www.anzen-ai-portal.jp/health-checkup-scheduler",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          description: _desc,
        }}
      />
      <PageContainer width="prose" className="py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            健康診断スケジューラ
          </h1>

          <ConclusionCard
            className="mt-4"
            tone="info"
            icon={Stethoscope}
            value={RULE_COUNT}
            unit="種"
            title="健診を自動判定"
            description="業種・職種・取扱物質・作業条件を選ぶと、法定健診の要否と雇入日起点の年間スケジュールを生成します。"
            action={{ href: "#scheduler-form", label: "入力をはじめる" }}
          >
            <StatusBadge tone="info">{CATEGORY_COUNT}区分</StatusBadge>
            <StatusBadge tone="neutral">{JOB_COUNT}職種対応</StatusBadge>
            <StatusBadge tone="safe">無料・登録不要</StatusBadge>
          </ConclusionCard>

          <CollapsibleDetail
            className="mt-3"
            summary="この判定でカバーする範囲（8区分・対応法令）"
          >
            <p>
              業種と職種、取扱化学物質、作業条件を選ぶだけで、労働安全衛生法・関係省令で求められる健康診断（一般／特定業務／特殊／じん肺／歯科特殊／電離放射線／長時間労働者面接／海外派遣の8カテゴリ・30ルール）の必要種別を判定し、雇入日を起点にした年間スケジュールを生成・操業閑散期へ自動再配置します。
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>建設業・製造業・運輸交通業・医療福祉・サービス業の代表的職種を網羅。</li>
              <li>有機則・特化則（個別物質14種＋希少金属）・鉛則・四アルキル鉛則・高気圧則・石綿則・じん肺法・電離則の各健診規定に対応。</li>
              <li>安衛法第66条の8 長時間労働者の医師面接指導と、安衛則第45条の2 海外派遣前後健診も判定対象。</li>
              <li>雇入日を入力すると、雇入時健診と6か月以内ごとの再実施月を自動配置し、繁忙月の集中を閑散期へ再配置した最適化スケジュールも提示。</li>
              <li>結果ページから印刷／PDFエクスポートが可能（安全衛生委員会の資料に利用可）。</li>
            </ul>
          </CollapsibleDetail>
        </header>

        <div id="scheduler-form" className="scroll-mt-20">
          <SchedulerForm />
        </div>

        <section className="mt-10 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <h2 className="font-semibold">関連ツール</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <Link href="/chemical-ra" className="underline">
                化学物質リスクアセスメント
              </Link>
              ：取扱化学物質のばく露評価と健診対象の整合確認に。
            </li>
            <li>
              <Link href="/lms" className="underline">
                Eラーニング
              </Link>
              ：特定業務従事者の安全衛生教育とセットでの活用を推奨。
            </li>
            <li>
              <Link href="/laws" className="underline">
                法改正一覧
              </Link>
              ：歯科特殊健診の報告義務改正(令和4年10月施行)など、健診関連の最新法改正を確認。
            </li>
            <li>
              <Link href="/strategy/plan-generator" className="underline">
                年次安全衛生計画ジェネレーター
              </Link>
              ：判定結果を年次計画書の「健康管理」セクションに組み込めます。
            </li>
          </ul>
        </section>

        <section className="mt-6 text-xs text-slate-500">
          <p>
            ※
            本ツールは法令解釈の一般的な指針を示すものであり、個別の作業実態・物質ばく露濃度・労働時間の運用に応じた最終判断は産業医・所轄労働基準監督署の指導に従ってください。
          </p>
        </section>
      </PageContainer>
    </div>
  );
}
