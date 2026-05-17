import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen, ShieldCheck, AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { CardGrid } from "@/components/layout/card-grid";
import { Cluster, Stack } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import { CrossToolLinks } from "@/components/cross-tool-links";
import {
  JsonLd,
  breadcrumbSchema,
  webPageSchema,
  faqPageSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  getIndustryContent,
  INDUSTRY_CONTENT_SLUGS,
} from "@/data/industries-content";
import {
  getIndustryConfig,
  getIndustryReport,
  type IndustrySlug,
} from "@/lib/accident-analysis";

export function generateStaticParams() {
  return INDUSTRY_CONTENT_SLUGS.map((slug) => ({ industry: slug }));
}

export const revalidate = 86400;
export const dynamicParams = false;

type Params = Promise<{ industry: string }>;

const COLOR_SWATCH: Record<string, {
  hero: string;
  badge: string;
  card: string;
  accent: string;
  pillBg: string;
}> = {
  amber: {
    hero: "from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-950",
    badge: "text-amber-700 dark:text-amber-300",
    card: "border-amber-200 dark:border-amber-900",
    accent: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    pillBg: "bg-amber-50 dark:bg-amber-900/30",
  },
  blue: {
    hero: "from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-950",
    badge: "text-blue-700 dark:text-blue-300",
    card: "border-blue-200 dark:border-blue-900",
    accent: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
    pillBg: "bg-blue-50 dark:bg-blue-900/30",
  },
  emerald: {
    hero: "from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-950",
    badge: "text-emerald-700 dark:text-emerald-300",
    card: "border-emerald-200 dark:border-emerald-900",
    accent: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    pillBg: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  rose: {
    hero: "from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-950",
    badge: "text-rose-700 dark:text-rose-300",
    card: "border-rose-200 dark:border-rose-900",
    accent: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
    pillBg: "bg-rose-50 dark:bg-rose-900/30",
  },
  violet: {
    hero: "from-violet-50 to-white dark:from-violet-950/40 dark:to-slate-950",
    badge: "text-violet-700 dark:text-violet-300",
    card: "border-violet-200 dark:border-violet-900",
    accent: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
    pillBg: "bg-violet-50 dark:bg-violet-900/30",
  },
};

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { industry } = await params;
  const content = getIndustryContent(industry);
  if (!content) return {};
  const cfg = getIndustryConfig(industry);
  const path = `/industries/${content.slug}`;
  return {
    title: content.seoTitle,
    description: content.seoDescription,
    alternates: { canonical: path },
    openGraph: withSiteOpenGraph(path, {
      title: content.seoTitle,
      description: content.seoDescription,
      images: [
        {
          url: ogImageUrl(content.seoTitle, cfg?.tagline ?? content.heroHeadline),
          width: 1200,
          height: 630,
        },
      ],
    }),
    twitter: withSiteTwitter({
      title: content.seoTitle,
      description: content.seoDescription,
      images: [ogImageUrl(content.seoTitle, cfg?.tagline ?? content.heroHeadline)],
    }),
  };
}

export default async function IndustryLandingPage({ params }: { params: Params }) {
  const { industry } = await params;
  const content = getIndustryContent(industry);
  if (!content) notFound();
  const cfg = getIndustryConfig(industry);
  if (!cfg) notFound();
  const report = getIndustryReport(content.slug as IndustrySlug);

  const url = `${SITE_URL}/industries/${content.slug}`;
  const swatch = COLOR_SWATCH[cfg.colorClass] ?? COLOR_SWATCH.blue;

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: content.seoTitle,
            description: content.seoDescription,
            url,
            datePublished: "2026-05-16",
            dateModified: "2026-05-16",
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "業種別案内", url: `${SITE_URL}/industries` },
            { name: cfg.label, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: content.seoTitle,
            description: content.seoDescription,
            url,
            inLanguage: "ja",
            mainEntity: {
              "@type": "Thing",
              name: `${cfg.label}の労働安全衛生`,
              description: content.heroLead,
            },
            isPartOf: {
              "@type": "WebSite",
              name: "安全AIポータル",
              url: SITE_URL,
            },
          },
          faqPageSchema(content.faq),
        ]}
      />
      <PageContainer width="full">
        <Breadcrumb
          items={[
            { name: "業種別案内", href: "/industries" },
            { name: cfg.label },
          ]}
        />

        {/* Hero */}
        <header
          className={`rounded-xl border border-slate-200 bg-gradient-to-br p-5 sm:p-6 dark:border-slate-800 ${swatch.hero}`}
        >
          <Cluster gap="sm">
            <span className="text-4xl" aria-hidden="true">
              {cfg.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${swatch.badge}`}>
                業種別ポータル ・ {cfg.labelEn}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
                {content.heroHeadline}
              </h1>
            </div>
          </Cluster>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
            {content.heroLead}
          </p>
          {content.keywords.length > 0 && (
            <Cluster gap="xs" className="mt-4">
              {content.keywords.map((kw) =>
                kw.href ? (
                  <Link
                    key={kw.label}
                    href={kw.href}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ring-1 ring-slate-200 hover:opacity-80 dark:ring-slate-700 ${swatch.pillBg}`}
                  >
                    #{kw.label}
                  </Link>
                ) : (
                  <span
                    key={kw.label}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ring-1 ring-slate-200 dark:ring-slate-700 ${swatch.pillBg}`}
                  >
                    #{kw.label}
                  </span>
                ),
              )}
            </Cluster>
          )}
        </header>

        {/* Stats from analytics layer */}
        {report && report.stats.total > 0 && (
          <Section
            title="業種別 統計（自動集計）"
            description="厚労省データと curated 事例から自動集計したサマリ。詳細は事故分析レポートへ。"
            spacing="default"
            className="mt-6"
          >
            <CardGrid cols={4} gap="sm">
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-600 dark:text-slate-400">事例件数</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {num(report.stats.total)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">件（curated + 厚労省）</p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="text-xs text-slate-600 dark:text-slate-400">死亡事例</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                  {num(report.stats.severity.fatal)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">件 ・ 全体の{(report.stats.fatalityShareOfAll * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-600 dark:text-slate-400">最多 事故型</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {report.topTypes[0]?.name ?? "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {report.topTypes[0] ? `${(report.topTypes[0].share * 100).toFixed(1)}%` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-600 dark:text-slate-400">収録期間</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {report.stats.yearRange.min || "—"} 〜 {report.stats.yearRange.max || "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">年</p>
              </div>
            </CardGrid>
            <div className="mt-3">
              <Link
                href={`/accidents-reports/${content.slug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                {cfg.label}の事故分析レポートを開く
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Section>
        )}

        {/* Challenges */}
        <Section
          title="重点課題"
          description={`${cfg.label}で繰り返し発生する代表的なリスクと組織的対応の要点`}
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={3} gap="md">
            {content.challenges.map((ch) => (
              <article
                key={ch.title}
                className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${swatch.card}`}
              >
                <Cluster gap="sm">
                  <span className="text-2xl" aria-hidden="true">
                    {ch.icon}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {ch.title}
                  </h3>
                </Cluster>
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {ch.body}
                </p>
              </article>
            ))}
          </CardGrid>
        </Section>

        {/* Recommended features */}
        <Section
          title="この業種におすすめの機能"
          description="課題に対応する機能へワンクリックで遷移します"
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={3} gap="md">
            {content.recommendations.map((rec) => (
              <Link
                key={rec.href}
                href={rec.href}
                className={`group block rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-slate-900 ${swatch.card}`}
              >
                <Cluster gap="sm">
                  <span className="text-2xl" aria-hidden="true">
                    {rec.icon}
                  </span>
                  <h3 className="flex-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {rec.title}
                  </h3>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
                    aria-hidden="true"
                  />
                </Cluster>
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {rec.reason}
                </p>
                {rec.cta && (
                  <span
                    className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${swatch.accent}`}
                  >
                    {rec.cta} →
                  </span>
                )}
              </Link>
            ))}
          </CardGrid>
        </Section>

        {/* Law highlights */}
        <Section
          title="関連法令ハイライト"
          description="頻出する条文・規則・指針。条文検索や法改正一覧と連動しています"
          spacing="default"
          className="mt-8"
        >
          <Stack gap="sm">
            {content.lawHighlights.map((law) => (
              <Link
                key={law.name}
                href={law.href}
                className={`group flex items-start gap-3 rounded-lg border bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50/30 dark:bg-slate-900 dark:hover:bg-emerald-950/30 ${swatch.card}`}
              >
                <BookOpen
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 group-hover:text-emerald-700"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {law.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {law.articles} ・ {law.note}
                  </p>
                </div>
                <ArrowUpRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </Stack>
          <Cluster gap="sm" className="mt-3">
            <Link
              href="/law-search"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              条文検索を開く
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/laws"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              法改正一覧
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/circulars"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              通達原文
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Cluster>
        </Section>

        {/* Typical work types */}
        <Section
          title="典型的な業務と主なハザード"
          description={`${cfg.label}の中で発生する代表的な作業区分とリスクの組合せ`}
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={3} gap="md">
            {content.workTypes.map((wt) => (
              <div
                key={wt.name}
                className={`rounded-lg border bg-white p-3 dark:bg-slate-900 ${swatch.card}`}
              >
                <Cluster gap="xs">
                  <AlertTriangle className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {wt.name}
                  </p>
                </Cluster>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                  主リスク: {wt.hazard}
                </p>
              </div>
            ))}
          </CardGrid>
        </Section>

        {/* FAQ */}
        <Section
          title="よくある質問"
          description={`${cfg.label}の安全管理でよく聞かれる質問`}
          spacing="default"
          className="mt-8"
        >
          <Stack gap="sm">
            {content.faq.map((it) => (
              <details
                key={it.question}
                className={`group rounded-lg border bg-white p-3 dark:bg-slate-900 ${swatch.card}`}
              >
                <summary className="cursor-pointer list-none">
                  <Cluster gap="sm">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Q. {it.question}
                    </p>
                  </Cluster>
                </summary>
                <p className="mt-2 pl-6 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  A. {it.answer}
                </p>
              </details>
            ))}
          </Stack>
        </Section>

        {/* CTA */}
        <Section spacing="tight" className="mt-10">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              次のアクション
            </p>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
              業種特有の機能を組み合わせて、現場運用に落とし込みましょう。
            </p>
            <Cluster gap="sm" className="mt-3">
              <Link
                href="/ky"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                📝 KYを作成
              </Link>
              <Link
                href={`/strategy/plan-generator?industry=${content.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
              >
                📋 年次計画を生成
              </Link>
              <Link
                href="/exam-quiz"
                className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
              >
                ✅ 過去問演習
              </Link>
              <Link
                href={`/accidents-reports/${content.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
              >
                🚨 事故分析を見る
              </Link>
            </Cluster>
          </div>
        </Section>

        {/* Other industries */}
        <Section
          title="他の業種"
          description="比較や横断確認に"
          spacing="tight"
          className="mt-8"
        >
          <Cluster gap="sm">
            {INDUSTRY_CONTENT_SLUGS.filter((s) => s !== content.slug).map((s) => {
              const other = getIndustryConfig(s);
              if (!other) return null;
              return (
                <Link
                  key={s}
                  href={`/industries/${s}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span aria-hidden="true">{other.icon}</span>
                  {other.label}
                </Link>
              );
            })}
          </Cluster>
        </Section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          掲載情報は厚生労働省・建災防・陸災防等の公開資料を基に編集部で整理したものです。
          法令の最新情報や個別の判断は、所轄労働基準監督署や顧問の労働安全コンサルタントにご確認ください。
        </p>
      </PageContainer>
      <CrossToolLinks
        industry={content.slug as IndustrySlug}
        exclude="industries"
        heading="この業種で使える実務ツール"
      />
    </>
  );
}
