import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { HazardSlideDeck } from "@/components/hazard-slides/slide-deck";
import { PageJsonLd } from "@/components/page-json-ld";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CANONICAL_HAZARD_TYPES } from "@/lib/accidents/type-normalization";
import { getHazardTypeSummaries, getHazardTypeSummary } from "@/lib/hazard-slides/build-summary";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

/**
 * 災害の型別 教育スライド（1型=6枚）。
 * データJSONのコミット→再デプロイで全型が静的再生成される（自動追従）。
 */

export function generateStaticParams() {
  return CANONICAL_HAZARD_TYPES.map((t) => ({ slug: t.slug }));
}

export const revalidate = 2592000;
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = getHazardTypeSummary(slug);
  if (!s) return {};
  const title = `${s.label}の安全教育スライド｜統計・原因・対策・クイズ`;
  const description = `災害の型「${s.label}」の教育スライド6枚。死亡${s.kpi.deathsTotal.toLocaleString(
    "ja-JP",
  )}人（${s.dataAsOf.deaths.replace("死亡災害個票: ", "")}）の実データから統計・多い原因・対策チェックリスト（根拠条文リンク付き）・確認クイズを自動生成。投影（16:9）・A4横印刷対応。`;
  return {
    title,
    description,
    alternates: { canonical: `/education/hazard-slides/${s.slug}` },
    openGraph: withSiteOpenGraph(`/education/hazard-slides/${s.slug}`, {
      title,
      description,
      images: [{ url: ogImageUrl(title, s.measures.headline), width: 1200, height: 630 }],
    }),
    twitter: withSiteTwitter({ title, description, images: [ogImageUrl(title, s.measures.headline)] }),
  };
}

export default async function HazardSlidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const summary = getHazardTypeSummary(slug);
  if (!summary) notFound();

  const others = getHazardTypeSummaries().filter((s) => s.slug !== summary.slug);
  const deathYears = summary.dataAsOf.deaths.replace("死亡災害個票: ", "");

  return (
    <>
      <PageJsonLd
        name={`${summary.label}の安全教育スライド`}
        description={`${summary.label}の統計・原因・対策・クイズ（自動生成教材）`}
        path={`/education/hazard-slides/${summary.slug}`}
      />
      <div className="no-print">
        <Breadcrumb
          items={[
              { name: "教育", href: "/education" },
            { name: "型別スライド", href: "/education/hazard-slides" },
            { name: summary.short },
          ]}
        />
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{summary.label} — 安全教育スライド</h1>
        </header>
        <ConclusionCard
          tone={summary.kpi.deathsRank !== null && summary.kpi.deathsRank <= 5 ? "warning" : "info"}
          value={summary.kpi.deathsTotal.toLocaleString("ja-JP")}
          unit="人"
          title={`死亡者数（${deathYears}）`}
          description={
            summary.kpi.trendPercent !== null && summary.kpi.injuriesLatestYear !== null
              ? `休業4日以上は${summary.kpi.injuriesLatestYear}年 ${summary.kpi.injuriesLatestCount?.toLocaleString("ja-JP")}人（${summary.kpi.injuriesFirstYear}年比${summary.kpi.trendPercent > 0 ? "+" : ""}${summary.kpi.trendPercent}%）。下のスライド6枚で統計→原因→対策→クイズを3分で確認。`
              : "下のスライド6枚で統計→原因→対策→クイズを3分で確認。"
          }
          icon={AlertTriangle}
        >
          {summary.kpi.deathsRank && (
            <StatusBadge tone={summary.kpi.deathsRank <= 5 ? "warning" : "neutral"} size="sm">
              死亡件数 第{summary.kpi.deathsRank}位/21分類
            </StatusBadge>
          )}
          {summary.preliminaryDeaths2025 !== null && (
            <StatusBadge tone="neutral" size="sm">
              2025年速報 {summary.preliminaryDeaths2025}人
            </StatusBadge>
          )}
        </ConclusionCard>
        <div className="h-4" />
      </div>

      <HazardSlideDeck summary={summary} />

      <nav aria-label="他の型のスライド" className="no-print mt-8">
        <p className="text-sm font-semibold text-slate-700">他の型のスライド</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/education/hazard-slides/${s.slug}`}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-amber-400"
              >
                {s.short}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
