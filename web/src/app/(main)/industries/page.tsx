import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { listIndustries } from "@/lib/accident-analysis";

const title = "業種別 安全管理ポータル | 建設・製造・運輸・医療福祉・サービス";
const description =
  "業種ごとの労働安全衛生課題を、関連法令・事故事例・推奨機能（KY・化学物質RA・年次計画・AIチャット）への動線で整理。建設業・製造業・運輸業・医療福祉・サービス業の5業種別エントリポイントを提供します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/industries" },
  openGraph: withSiteOpenGraph("/industries", {
    title,
    description,
    images: [{ url: ogImageUrl(title, "5業種別の安全管理ポータル"), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title,
    description,
    images: [ogImageUrl(title, "5業種別の安全管理ポータル")],
  }),
};

export const revalidate = 86400;

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

export default function IndustriesHubPage() {
  const contents = listIndustryContents();
  const configs = listIndustries();
  const configMap = new Map(configs.map((c) => [c.slug, c]));
  const url = `${SITE_URL}/industries`;

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
              datePublished: "2026-05-16",
              url: `${SITE_URL}/industries/${it.slug}`,
              description: it.seoDescription,
            })),
          ),
        ]}
      />
      <PageContainer width="full">
        <Breadcrumb items={[{ name: "業種別案内" }]} />

        <header className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-slate-800 dark:from-emerald-950/40 dark:to-slate-950">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            業種別エントリポイント
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            業種別の安全管理ポータル
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
            建設業・製造業・運輸業・医療福祉・サービス業の
            <span className="font-semibold">5業種</span>
            について、現場の重点課題と関連法令、推奨機能（KY用紙・化学物質RA・年次安全衛生計画・事故分析・AIチャットボット）への最短動線を整理しています。
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            検索からの来訪向けに、業種固有のキーワード・課題・条文ハイライトを集約。事故分析（自動集計）と
            年次計画ジェネレーター、KY業種別プリセットへワンクリックで遷移できます。
          </p>
        </header>

        <Section
          title="5業種から選ぶ"
          description="各カードをクリックすると業種別の専用ページに遷移します。"
          spacing="default"
          className="mt-6"
        >
          <CardGrid cols={3} gap="md">
            {contents.map((it) => {
              const cfg = configMap.get(it.slug);
              const color = cfg ? CARD_COLOR_CLASS[cfg.colorClass] ?? CARD_COLOR_CLASS.blue : CARD_COLOR_CLASS.blue;
              return (
                <Link
                  key={it.slug}
                  href={`/industries/${it.slug}`}
                  className={`group block rounded-xl border-2 p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${color.border} ${color.hover} ${color.bg}`}
                >
                  <Cluster gap="sm">
                    <span className="text-3xl" aria-hidden="true">
                      {cfg?.icon ?? "🏢"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {cfg?.label ?? it.slug}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {cfg?.tagline ?? ""}
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
                </Link>
              );
            })}
          </CardGrid>
        </Section>

        <Section title="関連ページ" spacing="tight" className="mt-8">
          <Cluster gap="sm">
            <Link
              href="/accidents-reports"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              🚨 業種別 事故分析レポート
            </Link>
            <Link
              href="/strategy/plan-generator"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              📋 年次安全衛生計画ジェネレーター
            </Link>
            <Link
              href="/ky"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              📝 KY用紙作成
            </Link>
            <Link
              href="/chatbot"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              💬 安衛法AIチャット
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
