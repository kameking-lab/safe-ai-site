import { RelatedPageCards, type RelatedPage } from "@/components/related-page-cards";
import type { IndustrySlug } from "@/lib/industry-slugs";
import {
  HEALTH_CHECKUP_TO_SLUG,
  SAFETY_PLAN_TO_SLUG,
  INDUSTRY_LABELS_JA,
} from "@/lib/industry-slugs";

export { HEALTH_CHECKUP_TO_SLUG, SAFETY_PLAN_TO_SLUG };

const INDUSTRY_LABELS: Record<IndustrySlug, string> = INDUSTRY_LABELS_JA;

export type CrossToolId =
  | "accidents-reports"
  | "ky-examples"
  | "education-certification"
  | "health-checkup"
  | "plan-generator"
  | "industries"
  | "foreign-workers"
  | "treatment-work-balance"
  | "work-environment-measurement"
  | "heat-illness-prevention"
  | "asbestos-management"
  | "mental-health-management"
  | "faq"
  | "safety-signs";

function buildPracticeTools(industry?: IndustrySlug, exclude?: CrossToolId): RelatedPage[] {
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
    {
      id: "work-environment-measurement",
      page: {
        href: "/work-environment-measurement",
        label: "作業環境測定",
        description: lbl
          ? `${lbl}の測定対象作業場を自動判定。A・B測定値から管理区分と改善措置を算出。`
          : "安衛令第21条の10種測定対象を判定。A・B測定から管理区分（第1〜第3）と改善措置を算出。",
        color: "blue",
        cta: "管理区分を判定する",
      },
    },
    {
      id: "heat-illness-prevention",
      page: {
        href: "/heat-illness-prevention",
        label: "熱中症対策ハブ",
        description: lbl
          ? `${lbl}の WBGT 基準・業種別リスク・R7 安衛則改正チェックリストと社内文書テンプレ。`
          : "WBGT 計算機・業種別リスク判定・R7 安衛則改正チェックリストと社内文書テンプレ一式。",
        color: "orange",
        cta: "熱中症対策を確認",
      },
    },
    {
      id: "asbestos-management",
      page: {
        href: "/asbestos-management",
        label: "石綿（アスベスト）対応",
        description:
          "R4.4施行の事前調査結果報告義務対応。判定ツール・届出書類自動生成・作業計画テンプレ。",
        color: "purple",
        cta: "石綿対応を確認する",
      },
    },
    {
      id: "safety-signs",
      page: {
        href: "/safety-signs",
        label: "安全衛生標識DB",
        description: lbl
          ? `${lbl}の必須・推奨標識セットと設置位置ガイド。JIS Z 9101準拠の110標識。`
          : "JIS Z 9101準拠の110標識・業種別の必須／推奨セット・設置位置ガイド。",
        color: "rose",
        cta: "標識を確認する",
      },
    },
    {
      id: "faq",
      page: {
        href: "/faq",
        label: "FAQ 200問",
        description:
          "法令・管理体制・化学物質・健康管理の200問を法令根拠付きで解説。カテゴリ別・横断検索対応。",
        color: "sky",
        cta: "FAQを見る",
      },
    },
  ];

  return all.filter(({ id }) => id !== exclude).map(({ page }) => page);
}

function buildGuideTools(industry?: IndustrySlug, exclude?: CrossToolId): RelatedPage[] {
  const lbl = industry ? INDUSTRY_LABELS[industry] : undefined;

  const all: Array<{ id: CrossToolId; page: RelatedPage }> = [
    {
      id: "foreign-workers",
      page: {
        href: "/foreign-workers",
        label: "外国人労働者支援",
        description: lbl
          ? `${lbl}で雇用する外国人労働者の在留資格別義務・多言語教材・技能実習生対応ガイド。`
          : "在留資格別の安全衛生義務・多言語安全教材・技能実習生対応ガイドをワンストップ提供。",
        color: "orange",
        cta: "外国人労働者支援を見る",
      },
    },
    {
      id: "treatment-work-balance",
      page: {
        href: "/treatment-work-balance",
        label: "治療と仕事の両立支援",
        description:
          "がん・脳卒中・心疾患・糖尿病・精神疾患・難病の6カテゴリ別の労務配慮と両立支援プラン。",
        color: "emerald",
        cta: "両立支援を確認する",
      },
    },
    {
      id: "mental-health-management",
      page: {
        href: "/mental-health-management",
        label: "メンタルヘルス対策",
        description:
          "ストレスチェック義務・産業医面接指導・小規模事業場向けトラック別の実務ガイドと書式。",
        color: "rose",
        cta: "メンタルヘルス対策へ",
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
  const practicePages = buildPracticeTools(industry, exclude);
  const guidePages = buildGuideTools(industry, exclude);
  return (
    <>
      <RelatedPageCards
        heading={heading ?? "合わせて使う"}
        pages={practicePages}
      />
      {guidePages.length > 0 && (
        <RelatedPageCards
          heading="対象者別ガイド"
          pages={guidePages}
        />
      )}
    </>
  );
}
