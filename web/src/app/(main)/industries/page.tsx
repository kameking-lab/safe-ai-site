import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  ScrollText,
  Siren,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { CardGrid } from "@/components/layout/card-grid";
import { Cluster } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  JsonLd,
  breadcrumbSchema,
  webPageSchema,
  articleListSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { listIndustryContents } from "@/data/industries-content";
import { getIndustryReport, type IndustrySlug } from "@/lib/accident-analysis";

const title = "業種別 安全管理ポータル | 建設・製造・運輸・医療福祉・サービス・小売・飲食・卸売・倉庫・事務系の10業種";
const description =
  "10業種ごとの労働安全衛生課題を、関連法令・通達・典型事故・KY・化学物質・特別教育・事故レポート・年次計画・FAQへの動線で整理。建設業から事務系業種まで、業種別エントリポイントを提供します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/industries" },
  openGraph: withSiteOpenGraph("/industries", {
    title,
    description,
    images: [{ url: ogImageUrl(title, "10業種別の安全管理ポータル"), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title,
    description,
    images: [ogImageUrl(title, "10業種別の安全管理ポータル")],
  }),
};

export const revalidate = 2592000;

const CARD_COLOR_CLASS: Record<string, { border: string; hover: string; bg: string }> = {
  amber: {
    border: "border-amber-200",
    hover: "hover:border-amber-400",
    bg: "bg-amber-50/40",
  },
  blue: {
    border: "border-blue-200",
    hover: "hover:border-blue-400",
    bg: "bg-blue-50/40",
  },
  emerald: {
    border: "border-emerald-200",
    hover: "hover:border-emerald-400",
    bg: "bg-emerald-50/40",
  },
  rose: {
    border: "border-rose-200",
    hover: "hover:border-rose-400",
    bg: "bg-rose-50/40",
  },
  violet: {
    border: "border-violet-200",
    hover: "hover:border-violet-400",
    bg: "bg-violet-50/40",
  },
};

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

export default function IndustriesHubPage() {
  const contents = listIndustryContents();
  const url = `${SITE_URL}/industries`;

  // Sector-wide accident summary (only for 5 industries with analysis data)
  const summary = contents
    .filter((c) => c.accidentAnalysisSlug)
    .map((c) => {
      const report = getIndustryReport(c.accidentAnalysisSlug as IndustrySlug);
      return {
        slug: c.slug,
        label: c.label,
        icon: c.icon,
        total: report?.stats.total ?? 0,
        fatal: report?.stats.severity.fatal ?? 0,
        topType: report?.topTypes[0]?.name ?? "—",
      };
    });

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "業種別案内", url },
          ]),
          articleListSchema(
            contents.map((it) => ({
              headline: it.seoTitle,
              datePublished: "2026-05-17",
              url: `${SITE_URL}/industries/${it.slug}`,
              description: it.seoDescription,
            })),
          ),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "業種別 安全管理ポータル 10業種",
            numberOfItems: contents.length,
            itemListElement: contents.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.label,
              url: `${SITE_URL}/industries/${c.slug}`,
            })),
          },
        ]}
      />
      <PageContainer width="full">
        <Breadcrumb items={[{ name: "業種別案内" }]} />

        <header className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-slate-800 dark:from-emerald-950/40 dark:to-slate-950">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            業種別エントリポイント ・ 主要10業種
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            業種別の安全管理ポータル
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
            あなたの業種を選ぶと、重点課題・関連法令・典型事故・KY・特別教育・事故レポート・年次計画への動線がまとまっています。
          </p>
        </header>

        <Section
          title="10業種から選ぶ"
          description="各カードをクリックすると業種別の専用ページに遷移します（全10セクション構成）"
          spacing="default"
          className="mt-6"
        >
          <CardGrid cols={3} gap="md">
            {contents.map((it) => {
              const color = CARD_COLOR_CLASS[it.colorClass] ?? CARD_COLOR_CLASS.blue;
              return (
                <Link
                  key={it.slug}
                  href={`/industries/${it.slug}`}
                  className={`group block rounded-xl border-2 p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${color.border} ${color.hover} ${color.bg}`}
                >
                  <Cluster gap="sm">
                    <span className="text-3xl" aria-hidden="true">
                      {it.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {it.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {it.tagline}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
                      aria-hidden="true"
                    />
                  </Cluster>
                  <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {it.heroHeadline}
                  </p>
                  <Cluster gap="xs" className="mt-3">
                    {it.keywords.slice(0, 4).map((kw) => (
                      <span
                        key={kw.label}
                        className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                      >
                        #{kw.label}
                      </span>
                    ))}
                  </Cluster>
                  {it.accidentAnalysisSlug && (
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                      事故分析レポート連動
                    </p>
                  )}
                </Link>
              );
            })}
          </CardGrid>
        </Section>

        {/* Sector-wide summary across the 5 industries with accident-statistics data */}
        {summary.length > 0 && (
          <Section
            title="業界全体動向 — 主要5業種の事故分析サマリ"
            description="事故統計データを保有する5業種の比較。詳細は各業種ページの統計ブロックへ"
            spacing="default"
            className="mt-8"
          >
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      業種
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                      事例件数
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                      うち死亡
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      最多事故型
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                      レポート
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {summary.map((s) => (
                    <tr key={s.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        <span className="mr-1.5" aria-hidden="true">{s.icon}</span>
                        {s.label}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {num(s.total)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-rose-700 dark:text-rose-300">
                        {num(s.fatal)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                        {s.topType}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <Link
                          href={`/industries/${s.slug}`}
                          className="inline-flex min-h-[44px] items-center justify-end px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                        >
                          開く →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden="true" />
              小売・飲食・卸売・倉庫・事務系は事故統計データとの個別連動なし。各ページの事故事例セクションで業種特有パターンを掲載しています。
            </p>
          </Section>
        )}

        <Section title="関連ページ" spacing="tight" className="mt-8">
          <Cluster gap="sm">
            <Link
              href="/accidents-reports"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Siren className="h-4 w-4 shrink-0" aria-hidden="true" />業種別 事故分析レポート
            </Link>
            <Link
              href="/strategy/plan-generator"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />年次安全衛生計画ジェネレーター
            </Link>
            <Link
              href="/ky"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />KY用紙作成
            </Link>
            <Link
              href="/chatbot"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />安衛法AIチャット
            </Link>
            <Link
              href="/education-certification"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />特別教育・技能講習
            </Link>
            <Link
              href="/circulars"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ScrollText className="h-4 w-4 shrink-0" aria-hidden="true" />通達原文
            </Link>
          </Cluster>
        </Section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          各業種ページに掲載する法令・通達・統計は厚生労働省の公開情報を基にしています。事故事例の集計値や統計表示は
          /accidents-reports/[業種] のデータレイヤーと連動しています。
        </p>
      </PageContainer>
    </>
  );
}
