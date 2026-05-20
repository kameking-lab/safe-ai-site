import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryReportView } from "@/components/accidents-reports/industry-report-view";
import { CrossToolLinks } from "@/components/cross-tool-links";
import { CopilotStepNav } from "@/components/copilot/CopilotStepNav";
import { CopilotMemo } from "@/components/copilot/CopilotMemo";
import { CopilotNextSteps } from "@/components/copilot/CopilotNextSteps";
import { CopilotIndustrySync } from "@/components/copilot/CopilotIndustrySync";
import {
  getIndustryConfig,
  getIndustryReport,
  listIndustries,
  type IndustrySlug,
} from "@/lib/accident-analysis";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  JsonLd,
  breadcrumbSchema,
  datasetSchema,
  webPageSchema,
} from "@/components/json-ld";

/**
 * Static pre-generation for the 5 supported industries. The underlying
 * dataset (静的 TS + repo 同梱 jsonl) はデプロイ時にしか変わらないため、
 * revalidate=2592000 (30d) で十分。data 更新時は code commit → 再 deploy
 * で全キャッシュが無効化される。
 */
export function generateStaticParams() {
  return listIndustries().map((c) => ({ industry: c.slug }));
}

export const revalidate = 2592000;
export const dynamicParams = false;

type Params = Promise<{ industry: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { industry } = await params;
  const config = getIndustryConfig(industry);
  if (!config) return {};
  const report = getIndustryReport(config.slug as IndustrySlug);
  const total = report?.stats.total ?? 0;
  const fatal = report?.stats.severity.fatal ?? 0;

  const title = `${config.label}の労働災害分析レポート | 業種別 事故事例・原因・対策`;
  const description = `${config.label}（${config.labelEn}）の労働災害${total.toLocaleString("ja-JP")}件を自動分析。死亡${fatal.toLocaleString("ja-JP")}件を含む事故事例から、事故型ランキング、原因 Top 10、業種特有パターン、推奨対策チェックリスト、関連法令を一覧表示。`;

  return {
    title,
    description,
    alternates: { canonical: `/accidents-reports/${config.slug}` },
    openGraph: withSiteOpenGraph(`/accidents-reports/${config.slug}`, {
      title,
      description,
      images: [{ url: ogImageUrl(title, config.tagline), width: 1200, height: 630 }],
    }),
    twitter: withSiteTwitter({
      title,
      description,
      images: [ogImageUrl(title, config.tagline)],
    }),
  };
}

export default async function IndustryReportPage({ params }: { params: Params }) {
  const { industry } = await params;
  const config = getIndustryConfig(industry);
  if (!config) notFound();
  const report = getIndustryReport(config.slug as IndustrySlug);
  if (!report) notFound();

  const url = `${SITE_URL}/accidents-reports/${config.slug}`;
  const description = `${config.label}の労働災害${report.stats.total.toLocaleString("ja-JP")}件を自動集計。事故型、原因、業種特有パターン、推奨対策、関連法令を一覧化。`;

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: `${config.label}の労働災害分析レポート`,
            description,
            url,
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "事故データベース", url: `${SITE_URL}/accidents` },
            { name: "業種別レポート", url: `${SITE_URL}/accidents-reports` },
            { name: config.label, url },
          ]),
          datasetSchema({
            name: `${config.label} 労働災害分析データセット`,
            description,
            url,
            keywords: [
              "労働災害",
              "業種別",
              config.label,
              "事故事例",
              "再発防止",
              "厚生労働省",
            ],
            temporalCoverage:
              report.stats.yearRange.min && report.stats.yearRange.max
                ? `${report.stats.yearRange.min}/${report.stats.yearRange.max}`
                : undefined,
            license: "https://creativecommons.org/licenses/by/4.0/",
            variableMeasured: [
              `事故事例 ${report.stats.total}件`,
              `死亡事例 ${report.stats.severity.fatal}件`,
              "事故型ランキング",
              "原因ランキング",
              "業種特有パターン",
              "月別季節性",
              "年次推移",
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
        ]}
      />
      <CopilotIndustrySync
        industry={config.slug as IndustrySlug}
        source="accidents-reports"
        concerns={
          report.topTypes[0]?.name ? [report.topTypes[0].name] : undefined
        }
      />
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 space-y-3 sm:px-6">
        <CopilotStepNav current="accidents-reports" industry={config.slug} />
        <CopilotMemo />
      </div>
      <IndustryReportView report={report} />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <CopilotNextSteps
          current="accidents-reports"
          industry={config.slug as IndustrySlug}
          intro={`${config.label}の事故傾向と推奨対策を踏まえ、安衛法AIで関連法令を深掘りするか、業種別テンプレートで年次安全衛生計画を作成できます。業種「${config.label}」は引き継がれます。`}
          extraCta={{
            label: `${config.label}向け年次計画を作成`,
            description:
              "本レポートで判明した重点事故型・原因を反映した年次安全衛生計画書を、業種テンプレートから自動生成します。",
            href: `/strategy/plan-generator?industry=${config.slug}`,
          }}
        />
      </div>
      <CrossToolLinks
        industry={config.slug as IndustrySlug}
        exclude="accidents-reports"
        heading="同業種の関連ツール"
      />
    </>
  );
}
