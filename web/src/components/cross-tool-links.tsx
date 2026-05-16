import { RelatedPageCards, type RelatedPage } from "@/components/related-page-cards";
import type { IndustrySlug } from "@/lib/accident-analysis";

// Health-checkup IndustryId → IndustrySlug (for result page)
export const HEALTH_CHECKUP_TO_SLUG: Partial<Record<string, IndustrySlug>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transportation: "transport",
  medical: "healthcare",
  service: "service",
};

// Safety-plan IndustryId → IndustrySlug (for plan-generator preview)
export const SAFETY_PLAN_TO_SLUG: Partial<Record<string, IndustrySlug>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transportation: "transport",
  medical: "healthcare",
  service: "service",
  // retail / food / wholesale / warehouse / office → no matching accident-analysis slug
};

const INDUSTRY_LABELS: Record<IndustrySlug, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  transport: "運輸交通業",
  healthcare: "医療福祉",
  service: "サービス業",
};

export type CrossToolId =
  | "accidents-reports"
  | "ky-examples"
  | "education-certification"
  | "health-checkup"
  | "plan-generator"
  | "industries";

function buildPages(industry?: IndustrySlug, exclude?: CrossToolId): RelatedPage[] {
  const lbl = industry ? INDUSTRY_LABELS[industry] : undefined;

  const all: Array<{ id: CrossToolId; page: RelatedPage }> = [
    {
      id: "accidents-reports",
      page: {
        href: industry ? `/accidents-reports/${industry}` : "/accidents-reports",
        label: "業種別事故レポート",
        description: lbl
          ? `${lbl}の労働災害を自動分析。事故型ランキング・原因・推奨対策を業種特有パターンで確認。`
          : "5業種の労働災害を自動分析。事故型・原因・業種特有パターン・推奨対策を一覧化。",
        color: "rose",
        cta: lbl ? `${lbl}レポートを見る` : "事故レポートを見る",
      },
    },
    {
      id: "ky-examples",
      page: {
        href: "/ky-examples",
        label: "KY事例DB",
        description: lbl
          ? `${lbl}を含む5業種150件の危険予知実例。リスク・対策を作業別に検索して KY 用紙に活用。`
          : "5業種×10作業の危険予知実例150件。KY 用紙作成の出発点として活用できます。",
        color: "amber",
        cta: "KY事例を確認する",
      },
    },
    {
      id: "education-certification",
      page: {
        href: "/education-certification/finder",
        label: "特別教育・技能講習",
        description: lbl
          ? `${lbl}で必要な特別教育・技能講習を根拠条文・講習時間付きで自動判定。`
          : "安衛則第36条の特別教育・技能講習約100種。業種・作業から必要資格を自動判定。",
        color: "blue",
        cta: "必要資格を確認",
      },
    },
    {
      id: "health-checkup",
      page: {
        href: "/health-checkup-scheduler",
        label: "健診スケジューラ",
        description: lbl
          ? `${lbl}の職種・取扱物質から必要健診を自動判定。雇入日起点の年間スケジュール生成。`
          : "業種・職種・取扱物質から必要健診を自動判定。年間スケジュールを生成します。",
        color: "emerald",
        cta: "健診を確認する",
      },
    },
    {
      id: "plan-generator",
      page: {
        href: "/strategy/plan-generator",
        label: "年次安全衛生計画",
        description: lbl
          ? `${lbl}向けテンプレートから基本方針・重点目標・月別スケジュールを含む計画書を自動生成。`
          : "業種・規模別30テンプレートから年次安全衛生計画書を自動生成。PDF出力対応。",
        color: "purple",
        cta: "計画書を生成する",
      },
    },
    {
      id: "industries",
      page: {
        href: industry ? `/industries/${industry}` : "/industries",
        label: "業種別ポータル",
        description: lbl
          ? `${lbl}の重点課題・関連法令・推奨機能をワンページに集約。横断的な安全管理の出発点。`
          : "5業種の重点課題・関連法令・推奨機能への動線をワンページに集約。",
        color: "sky",
        cta: lbl ? `${lbl}ポータルへ` : "業種別に探す",
      },
    },
  ];

  return all.filter(({ id }) => id !== exclude).map(({ page }) => page);
}

interface CrossToolLinksProps {
  /** Optional canonical industry slug for contextual deep-links */
  industry?: IndustrySlug;
  /** Tool ID to omit from the list (the current page's tool) */
  exclude?: CrossToolId;
  /** Section heading */
  heading?: string;
}

export function CrossToolLinks({ industry, exclude, heading }: CrossToolLinksProps) {
  return (
    <RelatedPageCards
      heading={heading ?? "合わせて使う"}
      pages={buildPages(industry, exclude)}
    />
  );
}
