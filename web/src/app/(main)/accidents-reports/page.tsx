import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitCompare } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { CardGrid } from "@/components/layout/card-grid";
import { Cluster } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import { AccidentsPreliminaryBanner } from "@/components/accidents-meta-info";
import { getAllIndustriesSummary } from "@/lib/accident-analysis";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  JsonLd,
  breadcrumbSchema,
  webPageSchema,
  articleListSchema,
} from "@/components/json-ld";

const title = "業種別 労働災害分析レポート | 自動集計";
const description =
  "建設業・製造業・運輸業・医療福祉・サービス業の5業種について、5,000件超の労働災害事例を自動分析。業種ごとの事故型・原因・推奨対策・関連法令をワンクリックで確認できます。";

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

export const revalidate = 86400;

const COLOR_CLASS: Record<string, { card: string; pill: string }> = {
  amber: { card: "border-amber-200 hover:border-amber-400 bg-amber-50/40", pill: "bg-amber-100 text-amber-900" },
  blue: { card: "border-blue-200 hover:border-blue-400 bg-blue-50/40", pill: "bg-blue-100 text-blue-900" },
  emerald: { card: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/40", pill: "bg-emerald-100 text-emerald-900" },
  rose: { card: "border-rose-200 hover:border-rose-400 bg-rose-50/40", pill: "bg-rose-100 text-rose-900" },
  violet: { card: "border-violet-200 hover:border-violet-400 bg-violet-50/40", pill: "bg-violet-100 text-violet-900" },
};

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
          webPageSchema({ name: title, description, url }),
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
        ]}
      />
      <PageContainer width="full">
        <Breadcrumb
          items={[
            { name: "事故データベース", href: "/accidents" },
            { name: "業種別レポート" },
          ]}
        />

        <header className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">業種別 自動分析</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            業種別 労働災害分析レポート
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
            厚労省「職場のあんぜんサイト」と編集部 curated 事例を統合した
            <span className="font-semibold"> {num(summary.totalCombined)}件 </span>
            の労働災害事例を、5 業種に分けて自動分析しています。各レポートは事故型ランキング・原因 Top
            10・業種特有パターン・推奨対策・関連法令を1日1回更新でまとめています。
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            データ収録期間: {summary.yearRange.min}年〜{summary.yearRange.max}年 ・ うち curated 詳細{" "}
            {num(summary.totalCurated)}件
          </p>
          {/* B-001 (audit harsh-third-party-2026-05-16): make the representative-pattern
              roadmap visible on the hub so users see the disclaimer before they drill in. */}
          <AccidentsPreliminaryBanner />
        </header>

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
          description="各カードをクリックすると業種ごとの詳細分析ページに遷移します。"
          spacing="default"
          className="mt-6"
        >
          <CardGrid cols={3} gap="md">
            {summary.industries.map((it) => {
              const cls = COLOR_CLASS[it.colorClass] ?? COLOR_CLASS.blue;
              return (
                <Link
                  key={it.slug}
                  href={`/accidents-reports/${it.slug}`}
                  className={`group block rounded-xl border-2 p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${cls.card}`}
                >
                  <Cluster gap="sm">
                    <span className="text-3xl" aria-hidden="true">
                      {it.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{it.label}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{it.tagline}</p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
                      aria-hidden="true"
                    />
                  </Cluster>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
                      <dt className="text-[10px] text-slate-500 dark:text-slate-400">事例</dt>
                      <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {num(it.total)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
                      <dt className="text-[10px] text-slate-500 dark:text-slate-400">死亡</dt>
                      <dd className="text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                        {num(it.fatal)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
                      <dt className="text-[10px] text-slate-500 dark:text-slate-400">最多型</dt>
                      <dd className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200" title={it.topType ?? ""}>
                        {it.topType ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </CardGrid>
        </Section>

        <Section
          title="関連ページ"
          spacing="tight"
          className="mt-8"
        >
          <Cluster gap="sm">
            <Link
              href="/accidents"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🚨 事故データベース（全件）
            </Link>
            <Link
              href="/accidents-analytics"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              📊 事故統計ダッシュボード（25軸）
            </Link>
            <Link
              href="/risk-prediction"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🤖 AIリスク予測
            </Link>
            <Link
              href="/ky"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              📝 KY用紙を起票
            </Link>
          </Cluster>
        </Section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          自動分析の母集団: 厚生労働省 職場のあんぜんサイト 死亡災害DB、労働者死傷病報告オープンデータ、編集部 curated 事例（公開情報を匿名化して再構成）。
          2025〜2026年分は「想定例（速報集計から統計的に導出した代表パターン事例）」を含みます。実報告の確定個票（R07労働者死傷病報告オープンデータ）が公開され次第、当該事例は順次置換予定です。
        </p>
      </PageContainer>
    </>
  );
}
