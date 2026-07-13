import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  GitCompare,
  MessageSquare,
  Siren,
  Sparkles,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { AccidentHubNav } from "@/components/accident-hub-nav";
import { Section } from "@/components/layout/section";
import { Cluster } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import { AccidentsPreliminaryBanner } from "@/components/accidents-meta-info";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { CopilotStepNav } from "@/components/copilot/CopilotStepNav";
import { CopilotMemo } from "@/components/copilot/CopilotMemo";
import { CopilotNextSteps } from "@/components/copilot/CopilotNextSteps";
import { HubFilter } from "@/components/accidents-reports/hub-filter";
import { EstatOfficialTables } from "@/components/accidents/estat-official-tables";
import { AxisAnalysisSection } from "@/components/accidents/axis-analysis-section";
import { MonthlySokuhouSection } from "@/components/accidents/monthly-sokuhou-section";
import { getAllIndustriesSummary } from "@/lib/accident-analysis";
import { DataExportToolbar } from "@/components/accidents/data-export-toolbar";
import {
  REPORTS_CSV_FILENAME,
  industriesSummaryToCsv,
  industriesSummaryToText,
} from "@/lib/accidents-reports-export";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  JsonLd,
  breadcrumbSchema,
  webPageSchema,
  articleListSchema,
  webApplicationSchema,
  COPILOT_FEATURE_PEERS,
} from "@/components/json-ld";

const title = "労働災害 業種別 分析レポート｜5業種5,000件超の自動集計（無料）";
const description =
  "労働災害 業種別 分析レポート — 建設業・製造業・運輸業・医療福祉・サービス業の5業種について、厚労省データと curated 事例を統合した5,000件超の労働災害を自動分析。事故型・原因・推奨対策・関連法令を業種別に無料で確認。解説は /guides/industry-accident-reports を参照。";

export const metadata: Metadata = {
  alternates: { canonical: "/accidents-reports" },
  title,
  description,
  openGraph: withSiteOpenGraph("/accidents-reports", {
    title,
    description,
    images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(title, description)],
  }),
};

export const revalidate = 2592000;

function num(n: number) {
  return n.toLocaleString("ja-JP");
}

export default function AccidentsReportsHubPage() {
  const summary = getAllIndustriesSummary();
  const url = `${SITE_URL}/accidents-reports`;

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, url, keywords: ["労働災害 建設業 業種別 分析", "事故事例 建設業 厚生労働省 統計", "業種別 労働災害 分析レポート", "墜落 転落 はさまれ 業種別", "再発防止 対策 事故事例"] }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "事故データベース", url: `${SITE_URL}/accidents` },
            { name: "業種別レポート", url },
          ]),
          articleListSchema(
            summary.industries.map((it) => ({
              headline: `${it.label}の労働災害分析レポート`,
              datePublished: "2026-05-16",
              url: `${SITE_URL}/accidents-reports/${it.slug}`,
              description: it.tagline,
            })),
          ),
          webApplicationSchema({
            name: "業種別 労働災害分析レポート",
            description:
              "建設業・製造業・運輸業・医療福祉・サービス業の労働災害を自動分析し、業種特有の事故型・原因・推奨対策を一覧化します。",
            url,
            applicationCategory: "BusinessApplication",
            mentions: [COPILOT_FEATURE_PEERS.chatbot, COPILOT_FEATURE_PEERS.planGenerator],
            featureList: [
              "5業種5,000件超の労働災害事例を自動集計",
              "事故型ランキング・原因 Top10・推奨対策チェックリスト",
              "業種比較ビュー",
              "年次安全衛生計画ジェネレーターへの自動連携",
            ],
          }),
        ]}
      />
      <AccidentHubNav current="accidents-reports" />
      <PageContainer width="full">
        <Breadcrumb
          items={[
            { name: "事故データベース", href: "/accidents" },
            { name: "業種別レポート" },
          ]}
        />

        <header className="mt-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">業種別 自動分析</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            業種別 労働災害分析レポート
          </h1>
        </header>

        {/* 柱0バッチ7/9: 結論ファースト = 収録件数のデカ数字を最上部(ファーストビュー内)に。
            安全Copilotのステッパー等の補助ナビは結論カードの下へ移動して「いまの状態」を主役に。 */}
        <ConclusionCard
          tone="info"
          value={num(summary.totalCombined)}
          unit="件"
          title={`${summary.industries.length}業種を自動分析`}
          description={`厚労省データ＋編集部curated事例を統合（${summary.yearRange.min}〜${summary.yearRange.max}年・うちcurated詳細 ${num(summary.totalCurated)}件）。下の業種カードから詳細レポートへ。`}
          className="mt-4"
        />

        {/* 柱C-7: 業種比較サマリーの出力手段。月例安全会議・ベンチマーク資料へ持ち出せる。 */}
        <DataExportToolbar
          filename={REPORTS_CSV_FILENAME}
          csv={industriesSummaryToCsv(summary)}
          text={industriesSummaryToText(summary)}
          shareTitle="業種別 労働災害分析レポート"
          shareUrl={url}
          className="mt-3"
        />

        {/* B-001 (audit harsh-third-party-2026-05-16): make the representative-pattern
            roadmap visible on the hub so users see the disclaimer before they drill in. */}
        <div className="mt-3">
          <AccidentsPreliminaryBanner />
        </div>

        <div className="mt-4 space-y-3">
          <CopilotStepNav current="accidents-reports" />
          <CopilotMemo />
        </div>

        <CollapsibleDetail summary="このレポートについて（データ源・更新頻度）" className="mt-3">
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            厚労省「職場のあんぜんサイト」と編集部 curated 事例を統合した
            <span className="font-semibold"> {num(summary.totalCombined)}件 </span>
            の労働災害事例を、{summary.industries.length} 業種に分けて自動分析しています。各レポートは事故型ランキング・原因 Top
            10・業種特有パターン・推奨対策・関連法令を1日1回更新でまとめています。
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            データ収録期間: {summary.yearRange.min}年〜{summary.yearRange.max}年 ・ うち curated 詳細{" "}
            {num(summary.totalCurated)}件
          </p>
        </CollapsibleDetail>

        <Section
          title="業種を横断比較"
          description="複数業種を並べて事故傾向・死亡率・原因・対策を一望できます。"
          spacing="tight"
          className="mt-6"
        >
          <Link
            href="/accidents-reports/compare"
            className="group flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-white p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-slate-950"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white"
              aria-hidden="true"
            >
              <GitCompare className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                業種比較ビュー（2〜5業種）
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                建設×製造×医療… 業種をまたいで死亡率・主要事故型・原因・危険要因・推奨対策を並列表示。コンサルのベンチマーク用途に最適。
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-emerald-600 transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Section>

        <Section
          title="5 業種のレポート一覧"
          description="キーワード・事故型・月で絞り込めます。各カードをクリックすると業種ごとの詳細分析ページに遷移します。"
          spacing="default"
          className="mt-6"
        >
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summary.industries.map((it) => (
                  <div key={it.slug} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                ))}
              </div>
            }
          >
            <HubFilter industries={summary.industries} yearRange={summary.yearRange} />
          </Suspense>
          {/* P1-C: 業種カードの数値（事例数・死亡数）の意味と、データ源差による
              業種間の桁差をハブ全体の注釈として明示。誤認防止のため。 */}
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
            ※ 各業種の「事例（件）」「うち死亡（人）」は <strong>{summary.yearRange.min}〜{summary.yearRange.max}年の累計</strong> です（速報値ではありません）。
            医療・福祉など一部業種は厚労省「職場のあんぜんサイト」での収録件数が他業種に比べて少なく、
            実際の労働災害件数の業種間比較に直接使うのは適切ではありません。各業種ページで事故型・原因の構造を確認してください。
          </p>
        </Section>

        <Section
          title="関連ページ"
          spacing="tight"
          className="mt-8"
        >
          <Cluster gap="sm">
            <Link
              href="/guides/industry-accident-reports"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />ガイド：労働災害 業種別 分析レポートの読み方
            </Link>
            <Link
              href="/strategy/plan-generator"
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200"
            >
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />年次安全衛生計画ジェネレーター
            </Link>
            <Link
              href="/chatbot"
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />安衛法AIチャットボット
            </Link>
            <Link
              href="/accidents"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Siren className="h-4 w-4 shrink-0" aria-hidden="true" />事故データベース（全件）
            </Link>
            <Link
              href="/accidents-analytics"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />事故統計ダッシュボード（25軸）
            </Link>
            <Link
              href="/risk-prediction"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />AIリスク予測
            </Link>
            <Link
              href="/ky"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />KY用紙を起票
            </Link>
          </Cluster>
        </Section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          自動分析の母集団: 厚生労働省 職場のあんぜんサイト 死亡災害DB、労働者死傷病報告オープンデータ、編集部 curated 事例（公開情報を匿名化して再構成）。
          2025〜2026年分は「想定例（速報集計から統計的に導出した代表パターン事例）」を含みます。実報告の確定個票（R07労働者死傷病報告オープンデータ）が公開され次第、当該事例は順次置換予定です。
        </p>

        {/* P2-1: 最新の月次速報（厚労省・速報値、ETL取込） */}
        <MonthlySokuhouSection />
        {/* P3-2: 多軸分析（曜日別＋集計可否の明示） */}
        <AxisAnalysisSection />
        {/* P3-1: e-Stat 公式統計表カタログ（労働災害・政府統計） */}
        <EstatOfficialTables />

        <CopilotNextSteps
          current="accidents-reports"
          intro="業種を選んで詳細レポートを開くと、その業種が安全Copilotに引き継がれ、年次計画と法令チャットでも自動的に反映されます。"
        />
      </PageContainer>
    </>
  );
}
