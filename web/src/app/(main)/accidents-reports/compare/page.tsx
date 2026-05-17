import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonView } from "@/components/accidents-reports/comparison-view";
import { listIndustries } from "@/lib/accident-analysis";
import {
  buildComparisonDataset,
  canonicalIndustryKey,
  parseIndustryParam,
} from "@/lib/accident-comparison";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  JsonLd,
  breadcrumbSchema,
  datasetSchema,
  webPageSchema,
  articleListSchema,
} from "@/components/json-ld";

export const revalidate = 86400;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function buildCanonical(slugs: string): string {
  return `${SITE_URL}/accidents-reports/compare?industries=${slugs}`;
}

function titleFor(labels: string[]): string {
  return `業種比較ビュー: ${labels.join(" × ")} | 労働災害分析`;
}

function descriptionFor(labels: string[], total: number): string {
  return `${labels.join(" × ")}の労働災害${total.toLocaleString("ja-JP")}件を並べて比較。死亡率・主要事故型・原因 Top 5・危険要因・月次推移を業種横断で分析できます。`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const slugs = parseIndustryParam(params.industries);
  const dataset = buildComparisonDataset(slugs);
  const labels = dataset.rows.map((r) => r.config.label);
  const canonicalKey = canonicalIndustryKey(slugs);
  const canonical = buildCanonical(canonicalKey);
  const title = titleFor(labels);
  const description = descriptionFor(labels, dataset.totalCases);
  return {
    title,
    description,
    alternates: {
      canonical: `/accidents-reports/compare?industries=${canonicalKey}`,
    },
    openGraph: withSiteOpenGraph(
      `/accidents-reports/compare?industries=${canonicalKey}`,
      {
        title,
        description,
        url: canonical,
        images: [
          {
            url: ogImageUrl(title, `${labels.join(" × ")} の労働災害を比較`),
            width: 1200,
            height: 630,
          },
        ],
      },
    ),
    twitter: withSiteTwitter({
      title,
      description,
      images: [ogImageUrl(title, `${labels.join(" × ")} の労働災害を比較`)],
    }),
  };
}

export default async function CompareIndustriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const slugs = parseIndustryParam(params.industries);
  const dataset = buildComparisonDataset(slugs);

  if (dataset.rows.length === 0) {
    notFound();
  }

  const labels = dataset.rows.map((r) => r.config.label);
  const canonicalKey = canonicalIndustryKey(slugs);
  const url = buildCanonical(canonicalKey);
  const title = titleFor(labels);
  const description = descriptionFor(labels, dataset.totalCases);

  const allOptions = listIndustries().map((c) => ({
    slug: c.slug,
    label: c.label,
    icon: c.icon,
    colorClass: c.colorClass,
  }));

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description,
            url,
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "事故データベース", url: `${SITE_URL}/accidents` },
            { name: "業種別レポート", url: `${SITE_URL}/accidents-reports` },
            { name: `比較: ${labels.join(" × ")}`, url },
          ]),
          datasetSchema({
            name: `${labels.join(" × ")} 業種比較 労働災害データセット`,
            description,
            url,
            keywords: [
              "労働災害",
              "業種比較",
              "ベンチマーク",
              ...labels,
              "事故型",
              "原因分析",
              "死亡率",
              "厚生労働省",
            ],
            temporalCoverage:
              dataset.yearRange.min && dataset.yearRange.max
                ? `${dataset.yearRange.min}/${dataset.yearRange.max}`
                : undefined,
            license: "https://creativecommons.org/licenses/by/4.0/",
            variableMeasured: [
              `比較業種数 ${dataset.rows.length}`,
              `累計事例 ${dataset.totalCases}件`,
              "死亡率",
              "重大度構成比",
              "事故型ランキング",
              "原因ランキング",
              "危険要因",
              "月次推移",
              "前年比増減",
            ],
            isBasedOn: [
              {
                name: "厚生労働省 職場のあんぜんサイト 死亡災害DB",
                url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx",
              },
              {
                name: "厚生労働省 労働者死傷病報告オープンデータ",
                url: "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
              },
            ],
          }),
          articleListSchema(
            dataset.rows.map((r) => ({
              headline: `${r.config.label}の労働災害分析レポート`,
              datePublished: "2026-05-17",
              url: `${SITE_URL}/accidents-reports/${r.slug}`,
              description: r.config.tagline,
            })),
          ),
        ]}
      />
      <ComparisonView dataset={dataset} allOptions={allOptions} />
    </>
  );
}
