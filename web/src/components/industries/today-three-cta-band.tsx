/**
 * P0-018 (usability-audit-day3-2026-05-24):
 * 業種ハブ /industries/[industry] の hero 直下に置く「今日の3CTA」帯。
 *
 * 監査で「KYセクションが業種ハブの 5 番目で、当日業務までスクロール5回」と
 * 指摘された問題への対処。
 * - 1: 直近の事故報告書 (5業種は専用レポート、残5業種は /accidents へ業種フィルタ)
 * - 2: KY 用紙を作る (業種プリセット起動)
 * - 3: 年次計画を作る (plan-generator 業種プリセット)
 *
 * 全 10 業種で動作するよう設計。accidentAnalysisSlug を持たない 5 業種は
 * /accidents?industry=... の汎用 DB へ fallback (機能損失なし)。
 *
 * Server Component から直接埋め込めるよう Client 機能なし。
 */

import Link from "next/link";
import { BarChart3, ClipboardList, CalendarCheck, ArrowRight } from "lucide-react";
import type { IndustryContent, IndustryContentSlug } from "@/types/industry-content";
import type { IndustrySlug } from "@/lib/industry-slugs";

/**
 * IndustryContentSlug → plan-generator IndustryId のマッピング。
 * plan-generator は 13 業種、industries-content は 10 業種なので
 * 一対一マッピング可能 (transport→transportation, healthcare→medical の
 * 名前差は吸収)。
 */
const CONTENT_TO_PLAN_INDUSTRY: Record<IndustryContentSlug, string> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transportation",
  healthcare: "medical",
  service: "service",
  retail: "retail",
  food: "food",
  wholesale: "wholesale",
  warehouse: "warehouse",
  office: "office",
};

export type TodayThreeCtaBandProps = {
  /** 業種コンテンツ。slug + accidentAnalysisSlug + label を参照する */
  content: IndustryContent;
};

function buildReportHref(slug: IndustryContentSlug, analysisSlug?: IndustrySlug): string {
  if (analysisSlug) {
    return `/accidents-reports/${analysisSlug}`;
  }
  // accidents-reports に対応バケットがない 5 業種 (retail/food/wholesale/warehouse/office)
  // は /accidents 全件 DB に業種クエリを渡して fallback。/accidents は q= で
  // テキスト絞り込みするため、業種ラベルを query string に渡す。
  return `/accidents?industry=${encodeURIComponent(slug)}`;
}

export function TodayThreeCtaBand({ content }: TodayThreeCtaBandProps) {
  const reportHref = buildReportHref(content.slug, content.accidentAnalysisSlug);
  const kyHref = `/ky?industry=${encodeURIComponent(content.slug)}`;
  const planIndustry = CONTENT_TO_PLAN_INDUSTRY[content.slug];
  const planHref = `/strategy/plan-generator?industry=${encodeURIComponent(planIndustry)}`;
  const label = content.label;

  return (
    <section
      aria-label={`${label} 今日の3アクション`}
      className="mt-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-3 dark:from-emerald-950/30 dark:to-slate-950 sm:p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">⚡</span>
        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 sm:text-sm">
          {label} ・ 今日の 3 アクション
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CtaCard
          href={reportHref}
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
          title="直近の事故報告"
          subtitle={
            content.accidentAnalysisSlug
              ? `${label} の事故分析レポート (直近7日タブで素早く把握)`
              : `${label} 関連の事故事例を /accidents から検索`
          }
          tone="rose"
        />
        <CtaCard
          href={kyHref}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          title="KY 用紙を作る"
          subtitle={`${label} 業種プリセット付きで KY 用紙を 3 分で起票`}
          tone="emerald"
        />
        <CtaCard
          href={planHref}
          icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
          title="年次計画を作る"
          subtitle={`${label} 用テンプレートから年次安全衛生計画を生成`}
          tone="violet"
        />
      </div>
    </section>
  );
}

type Tone = "rose" | "emerald" | "violet";

const TONE_CLASS: Record<Tone, { card: string; icon: string }> = {
  rose: {
    card: "border-rose-200 bg-white hover:border-rose-400 hover:bg-rose-50/60 dark:border-rose-800 dark:bg-slate-900",
    icon: "text-rose-700 dark:text-rose-300",
  },
  emerald: {
    card: "border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/60 dark:border-emerald-800 dark:bg-slate-900",
    icon: "text-emerald-700 dark:text-emerald-300",
  },
  violet: {
    card: "border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50/60 dark:border-violet-800 dark:bg-slate-900",
    icon: "text-violet-700 dark:text-violet-300",
  },
};

function CtaCard({
  href,
  icon,
  title,
  subtitle,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: Tone;
}) {
  const t = TONE_CLASS[tone];
  return (
    <Link
      href={href}
      className={`group flex items-start gap-2 rounded-xl border-2 p-3 transition-colors ${t.card}`}
    >
      <span className={`mt-0.5 shrink-0 ${t.icon}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-600 dark:text-slate-400">
          {subtitle}
        </span>
      </span>
      <ArrowRight
        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:translate-x-1 group-hover:text-slate-700"
        aria-hidden="true"
      />
    </Link>
  );
}
