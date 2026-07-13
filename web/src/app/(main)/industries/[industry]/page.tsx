import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  FileText,
  GraduationCap,
  FlaskConical,
  HelpCircle,
  ScrollText,
  Hash,
  MessageSquare,
  Siren,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { CardGrid } from "@/components/layout/card-grid";
import { Cluster, Stack } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import { CrossToolLinks } from "@/components/cross-tool-links";
import { TodayThreeCtaBand } from "@/components/industries/today-three-cta-band";
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
  getIndustryReport,
  type IndustrySlug,
} from "@/lib/accident-analysis";

export function generateStaticParams() {
  return INDUSTRY_CONTENT_SLUGS.map((slug) => ({ industry: slug }));
}

export const revalidate = 2592000;
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

const FAQ_CATEGORY_LABEL: Record<string, string> = {
  "law-system": "法令・制度",
  management: "安全衛生管理体制",
  chemical: "化学物質・有害物",
  "health-education": "健康管理・教育",
};

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { industry } = await params;
  const content = getIndustryContent(industry);
  if (!content) return {};
  const path = `/industries/${content.slug}`;
  return {
    title: content.seoTitle,
    description: content.seoDescription,
    keywords: content.longTailKeywords.slice(0, 25).join(", "),
    alternates: { canonical: path },
    openGraph: withSiteOpenGraph(path, {
      title: content.seoTitle,
      description: content.seoDescription,
      images: [
        {
          url: ogImageUrl(content.seoTitle, content.tagline),
          width: 1200,
          height: 630,
        },
      ],
    }),
    twitter: withSiteTwitter({
      title: content.seoTitle,
      description: content.seoDescription,
      images: [ogImageUrl(content.seoTitle, content.tagline)],
    }),
  };
}

export default async function IndustryLandingPage({ params }: { params: Params }) {
  const { industry } = await params;
  const content = getIndustryContent(industry);
  if (!content) notFound();
  const report = content.accidentAnalysisSlug
    ? getIndustryReport(content.accidentAnalysisSlug as IndustrySlug)
    : null;

  const url = `${SITE_URL}/industries/${content.slug}`;
  const swatch = COLOR_SWATCH[content.colorClass] ?? COLOR_SWATCH.blue;

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: content.seoTitle,
            description: content.seoDescription,
            url,
            datePublished: "2026-05-17",
            dateModified: "2026-05-17",
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "業種別案内", url: `${SITE_URL}/industries` },
            { name: content.label, url },
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
              name: `${content.label}の労働安全衛生`,
              description: content.heroLead,
            },
            isPartOf: {
              "@type": "WebSite",
              name: "安全AIポータル",
              url: SITE_URL,
            },
            keywords: content.longTailKeywords.join(", "),
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${content.label}の安全管理ツール一覧`,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            numberOfItems: content.recommendations.length,
            itemListElement: content.recommendations.map((rec, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: rec.title,
              description: rec.reason,
              url: `${SITE_URL}${rec.href}`,
            })),
          },
          faqPageSchema(content.faq),
        ]}
      />
      <PageContainer width="full">
        <Breadcrumb
          items={[
            { name: "業種別案内", href: "/industries" },
            { name: content.label },
          ]}
        />

        {/* 建設業ランディングへの誘導 (Phase 5) */}
        {industry === "construction" && (
          <Link
            href="/for/construction"
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-3 hover:bg-emerald-100"
          >
            <div>
              <p className="text-sm font-bold text-emerald-900">
                実務でこの内容を使う方は → 建設業 実務ポータル
              </p>
              <p className="mt-0.5 text-xs text-emerald-800">
                職長・元請担当・現場代理人 向けの即実行エントリ。KY・朝礼・年次計画を 1〜2 タップで起動。
              </p>
            </div>
            <span className="text-emerald-700 font-bold">→</span>
          </Link>
        )}

        {/* Hero */}
        <header
          className={`rounded-xl border border-slate-200 bg-gradient-to-br p-5 sm:p-6 dark:border-slate-800 ${swatch.hero}`}
        >
          <Cluster gap="sm">
            <span className="text-4xl" aria-hidden="true">
              {content.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${swatch.badge}`}>
                業種別ポータル ・ {content.labelEn}
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
                    className={`inline-flex min-h-[44px] items-center rounded-full px-2.5 py-0.5 text-xs ring-1 ring-slate-200 hover:opacity-80 dark:ring-slate-700 ${swatch.pillBg}`}
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

        {/* P0-018 (usability-audit-day3): hero 直下に「今日の3CTA」帯を配置。
            事故レポート・KY 用紙・年次計画への業種コンテキスト付き起動を
            1 タップで提供し、KY セクションまでスクロール 5 回問題を解消。 */}
        <TodayThreeCtaBand content={content} />

        {/* Stats from analytics layer (only for industries with accident-analysis bucket) */}
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
                href={`/accidents-reports/${content.accidentAnalysisSlug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                {content.label}の事故分析レポートを開く
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Section>
        )}

        {/* 1. Challenges */}
        <Section
          title="1. 重点課題"
          description={`${content.label}で繰り返し発生する代表的なリスクと組織的対応の要点`}
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

        {/* 2. Law highlights */}
        <Section
          title="2. 業種特有法令ハイライト"
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
              className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              条文検索を開く
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/laws"
              className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              法改正一覧
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Cluster>
        </Section>

        {/* 3. Accident examples */}
        <Section
          title="3. 業種特有 典型事故事例"
          description="現場で実際に起きやすい労働災害パターン。事故分析レポートで詳細・予防策を確認できます"
          spacing="default"
          className="mt-8"
        >
          <Stack gap="sm">
            {content.accidentExamples.map((ex) => (
              <Link
                key={ex.title}
                href={ex.href}
                className={`group flex items-start gap-3 rounded-lg border bg-white p-3 transition hover:border-rose-300 hover:bg-rose-50/30 dark:bg-slate-900 dark:hover:bg-rose-950/30 ${swatch.card}`}
              >
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {ex.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {ex.summary}
                  </p>
                </div>
                <ArrowUpRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-rose-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </Stack>
        </Section>

        {/* 4. Circulars */}
        <Section
          title="4. 業種特有 重要通達"
          description="厚労省通達から業種影響度の高いものを抜粋。原文は通達一覧から確認できます"
          spacing="default"
          className="mt-8"
        >
          <Stack gap="sm">
            {content.circulars.map((c) => (
              <Link
                key={c.id}
                href={`/circulars/${c.id}`}
                className={`group flex items-start gap-3 rounded-lg border bg-white p-3 transition hover:border-emerald-300 dark:bg-slate-900 ${swatch.card}`}
              >
                <ScrollText
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 group-hover:text-emerald-700"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {c.issuer} ・ {c.date}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {c.relevance}
                  </p>
                </div>
                <ArrowUpRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </Stack>
          <div className="mt-3">
            <Link
              href="/circulars"
              className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              通達一覧をすべて見る
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </Section>

        {/* 5. KY topics */}
        <Section
          title="5. 推奨 KY項目"
          description={`${content.label}の典型作業ごとに、KY用紙作成の出発点として使えるテンプレ`}
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={2} gap="md">
            {content.kyTopics.map((ky) => (
              <Link
                key={ky.title}
                href={ky.href}
                className={`group block rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${swatch.card}`}
              >
                <Cluster gap="sm">
                  <FileText className={`h-5 w-5 shrink-0 ${swatch.badge}`} aria-hidden="true" />
                  <h3 className="flex-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {ky.title}
                  </h3>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600"
                    aria-hidden="true"
                  />
                </Cluster>
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {ky.scenario}
                </p>
              </Link>
            ))}
          </CardGrid>
          <div className="mt-3">
            <Link
              href="/ky"
              className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              KY用紙作成ツールを開く
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </Section>

        {/* 6. Chemical substances */}
        {content.chemicalSubstances.length > 0 && (
          <Section
            title="6. 化学物質取扱い・重要物質"
            description="リスクアセスメント対象物の代表例。化学物質RA・データベースと連動"
            spacing="default"
            className="mt-8"
          >
            <Stack gap="sm">
              {content.chemicalSubstances.map((chem) => (
                <Link
                  key={chem.name}
                  href={chem.href}
                  className={`group flex items-start gap-3 rounded-lg border bg-white p-3 transition hover:border-emerald-300 dark:bg-slate-900 ${swatch.card}`}
                >
                  <FlaskConical
                    className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 group-hover:text-emerald-700"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {chem.name}
                      {chem.casNo && (
                        <span className="ml-2 text-[11px] font-normal text-slate-500">
                          CAS: {chem.casNo}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                      {chem.hazard}
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
                href="/chemical-ra"
                className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                化学物質リスクアセスメント
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
              <Link
                href="/chemical-database"
                className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                化学物質データベース
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </Cluster>
          </Section>
        )}

        {/* 7. Education certs */}
        <Section
          title="7. 関連特別教育・技能講習"
          description={`${content.label}で必要となる法定教育・免許・職長教育の一覧`}
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={2} gap="md">
            {content.educationCerts.map((cert) => (
              <Link
                key={cert.name}
                href={cert.href}
                className={`group block rounded-xl border bg-white p-3 transition hover:border-emerald-300 dark:bg-slate-900 ${swatch.card}`}
              >
                <Cluster gap="sm">
                  <GraduationCap className={`h-5 w-5 shrink-0 ${swatch.badge}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {cert.name}
                    </p>
                    <span
                      className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${swatch.accent}`}
                    >
                      {cert.type}
                    </span>
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600"
                    aria-hidden="true"
                  />
                </Cluster>
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  対象: {cert.target}
                </p>
              </Link>
            ))}
          </CardGrid>
          <div className="mt-3">
            <Link
              href="/education-certification"
              className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              特別教育・技能講習ファインダー
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </Section>

        {/* 8. Accident report deep-link (only for industries with reports) */}
        {content.accidentAnalysisSlug && (
          <Section
            title="8. 業種別 事故レポート"
            description="厚労省データ＋curated事例ベースの自動集計レポート"
            spacing="default"
            className="mt-8"
          >
            <Link
              href={`/accidents-reports/${content.accidentAnalysisSlug}`}
              className={`group block rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${swatch.card}`}
            >
              <Cluster gap="sm">
                <AlertTriangle className={`h-6 w-6 shrink-0 ${swatch.badge}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {content.label} 事故分析レポート
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    事故型ランキング、月別季節性、原因分析、推奨対策、30項目チェックリスト、印刷PDFを収録
                  </p>
                </div>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-emerald-600"
                  aria-hidden="true"
                />
              </Cluster>
            </Link>
          </Section>
        )}

        {/* 9. Safety plan template */}
        <Section
          title="9. 業種別 安全衛生計画テンプレ"
          description="規模別（小・中・大）の年次安全衛生計画ジェネレーター"
          spacing="default"
          className="mt-8"
        >
          <Link
            href={`/strategy/plan-generator?industry=${content.safetyPlanIndustry}`}
            className={`group block rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${swatch.card}`}
          >
            <Cluster gap="sm">
              <FileText className={`h-6 w-6 shrink-0 ${swatch.badge}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {content.label}向け 年次安全衛生計画
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  業種×規模別の30テンプレートから、基本方針・目標・月別取組・関連法令・通達を自動生成
                </p>
              </div>
              <ArrowUpRight
                className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-emerald-600"
                aria-hidden="true"
              />
            </Cluster>
          </Link>
        </Section>

        {/* 10. Related FAQ categories */}
        <Section
          title="10. 業種関連 FAQ"
          description={`${content.label}に関連する質問が集まるFAQカテゴリ`}
          spacing="default"
          className="mt-8"
        >
          <CardGrid cols={2} gap="md">
            {content.faqCategories.map((fc) => (
              <Link
                key={fc.category}
                href={`/faq/${fc.category}`}
                className={`group block rounded-xl border bg-white p-3 transition hover:border-emerald-300 dark:bg-slate-900 ${swatch.card}`}
              >
                <Cluster gap="sm">
                  <HelpCircle className={`h-5 w-5 shrink-0 ${swatch.badge}`} aria-hidden="true" />
                  <p className="flex-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {fc.label} ({FAQ_CATEGORY_LABEL[fc.category] ?? fc.category})
                  </p>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600"
                    aria-hidden="true"
                  />
                </Cluster>
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {fc.rationale}
                </p>
              </Link>
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
                key={rec.href + rec.title}
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

        {/* Typical work types */}
        <Section
          title="典型的な業務と主なハザード"
          description={`${content.label}の中で発生する代表的な作業区分とリスクの組合せ`}
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
          description={`${content.label}の安全管理でよく聞かれる質問`}
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

        {/* Long-tail keywords (SEO chip cloud) */}
        <Section
          title="関連キーワード"
          description={`${content.label}に関する検索クエリ・関連トピック（${content.longTailKeywords.length}件）`}
          spacing="default"
          className="mt-8"
        >
          <Cluster gap="xs">
            {content.longTailKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Hash className="h-3 w-3" aria-hidden="true" />
                {kw}
              </span>
            ))}
          </Cluster>
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
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />KYを作成
              </Link>
              <Link
                href={`/strategy/plan-generator?industry=${content.safetyPlanIndustry}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />年次計画を生成
              </Link>
              {content.accidentAnalysisSlug && (
                <Link
                  href={`/accidents-reports/${content.accidentAnalysisSlug}`}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
                >
                  <Siren className="h-4 w-4 shrink-0" aria-hidden="true" />事故分析を見る
                </Link>
              )}
            </Cluster>
          </div>
        </Section>

        {/* 柱C-10: コンサル相談CVパス。専門ページ(業種別ポータル)下部に相談カードを設置 */}
        <Section spacing="tight" className="mt-8">
          <Link
            href={`/contact?tab=business&industry=${encodeURIComponent(content.label)}`}
            className="group block rounded-xl border border-emerald-300 bg-emerald-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/30"
          >
            <Cluster gap="sm">
              <MessageSquare className="h-6 w-6 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  {content.label}の安全管理をコンサルタントに相談する
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                  このページは労働安全コンサルタント（土木）の資格を持つ運営者が実務経験をもとに編集しています。
                  法人・団体からのコンサル・受託開発のご相談を承ります。
                </p>
              </div>
              <ArrowUpRight
                className="h-5 w-5 shrink-0 text-emerald-600 group-hover:translate-x-0.5 dark:text-emerald-400"
                aria-hidden="true"
              />
            </Cluster>
          </Link>
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
              const other = getIndustryContent(s);
              if (!other) return null;
              return (
                <Link
                  key={s}
                  href={`/industries/${s}`}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
      {content.accidentAnalysisSlug && (
        <CrossToolLinks
          industry={content.accidentAnalysisSlug as IndustrySlug}
          exclude="industries"
          heading="この業種で使える実務ツール"
        />
      )}
    </>
  );
}
