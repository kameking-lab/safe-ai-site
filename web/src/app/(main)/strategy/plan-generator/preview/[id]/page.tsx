import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { PlanDocument } from "@/components/safety-plan/plan-document";
import { PrintButton } from "@/components/safety-plan/print-button";
import { CrossToolLinks, SAFETY_PLAN_TO_SLUG } from "@/components/cross-tool-links";
import { CopilotStepNav } from "@/components/copilot/CopilotStepNav";
import { CopilotMemo } from "@/components/copilot/CopilotMemo";
import { CopilotNextSteps } from "@/components/copilot/CopilotNextSteps";
import { CopilotPlanSync } from "@/components/copilot/CopilotPlanSync";
import type { CopilotScale } from "@/lib/copilot/types";
import { findTemplateById } from "@/data/safety-plan-templates";
import { regenerateFromTemplateId } from "@/lib/safety-plan-generator";
import type {
  MeasureCategory,
  OverworkPriority,
  SpecialWorkId,
} from "@/types/safety-plan";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const MEASURE_KEYS: MeasureCategory[] = [
  "education",
  "ky",
  "health-check",
  "inspection",
  "committee",
  "ra",
  "drill",
  "equipment-check",
  "industry-specific",
];

const isMeasureCategory = (v: string): v is MeasureCategory =>
  (MEASURE_KEYS as string[]).includes(v);

const SPECIAL_WORK_KEYS: SpecialWorkId[] = [
  "high-place",
  "organic-solvent",
  "specified-chemical",
  "dust",
  "noise",
  "vibration",
  "ionizing-radiation",
  "lead",
  "asbestos",
  "lone-work",
  "shift-work",
  "heavy-load",
];

const isSpecialWorkId = (v: string): v is SpecialWorkId =>
  (SPECIAL_WORK_KEYS as string[]).includes(v);

const OVERWORK_KEYS: OverworkPriority[] = ["high", "normal", "low"];

const isOverworkPriority = (v: string): v is OverworkPriority =>
  (OVERWORK_KEYS as string[]).includes(v);

function readString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function readYear(
  sp: Record<string, string | string[] | undefined>,
  fallback: number,
): number {
  const raw = readString(sp, "year");
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 2025 && n <= 2040) return n;
  return fallback;
}

function readFocus(
  sp: Record<string, string | string[] | undefined>,
): MeasureCategory[] {
  const raw = readString(sp, "focus");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is MeasureCategory => s !== "" && isMeasureCategory(s));
}

function readSpecialWork(
  sp: Record<string, string | string[] | undefined>,
): SpecialWorkId[] {
  const raw = readString(sp, "special");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SpecialWorkId => s !== "" && isSpecialWorkId(s));
}

function readOverwork(
  sp: Record<string, string | string[] | undefined>,
): OverworkPriority | undefined {
  const raw = readString(sp, "overwork");
  if (!raw) return undefined;
  return isOverworkPriority(raw) ? raw : undefined;
}

function readOverseas(
  sp: Record<string, string | string[] | undefined>,
): boolean {
  const raw = readString(sp, "overseas");
  return raw === "1" || raw === "true";
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const template = findTemplateById(id);
  if (!template) {
    return { title: "計画書が見つかりません", robots: { index: false, follow: false } };
  }
  const year = readYear(sp, 2026);
  const org = readString(sp, "org") || template.industryLabel;
  const title = `${year}年度 安全衛生計画書 プレビュー｜${template.industryLabel}・${template.scaleLabel}`;
  const description = `${org} 向けの ${year} 年度 安全衛生計画書プレビュー。重点目標・実施事項・月別スケジュール・関連法令を含む。`;
  return {
    title,
    description,
    alternates: { canonical: `/strategy/plan-generator/preview/${id}` },
    robots: { index: false, follow: true },
  };
}

export default async function PreviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const result = regenerateFromTemplateId({
    templateId: id,
    fiscalYear: readYear(sp, 2026),
    organizationName: readString(sp, "org"),
    focusAreas: readFocus(sp),
    customGoals: [],
    notes: readString(sp, "notes"),
    specialWork: readSpecialWork(sp),
    hasOverseasAssignment: readOverseas(sp),
    overworkPriority: readOverwork(sp),
  });

  if (!result.ok) {
    notFound();
  }

  const plan = result.plan;
  const previewPath = `/strategy/plan-generator/preview/${id}`;
  const reportSlug = SAFETY_PLAN_TO_SLUG[plan.template.industry];
  const planScale: CopilotScale | undefined =
    plan.template.scale === "small" ||
    plan.template.scale === "medium" ||
    plan.template.scale === "large"
      ? plan.template.scale
      : undefined;
  // Compose a query string that preserves the user's selections so the link
  // round-trips back to a regenerated preview if they want to tweak inputs.
  const previewSearch = (() => {
    const params = new URLSearchParams();
    const focus = readFocus(sp);
    const special = readSpecialWork(sp);
    const overwork = readOverwork(sp);
    const org = readString(sp, "org");
    const notes = readString(sp, "notes");
    if (org) params.set("org", org);
    params.set("year", String(plan.fiscalYear));
    if (focus.length > 0) params.set("focus", focus.join(","));
    if (special.length > 0) params.set("special", special.join(","));
    if (readOverseas(sp)) params.set("overseas", "1");
    if (overwork && overwork !== "normal") params.set("overwork", overwork);
    if (notes) params.set("notes", notes);
    return params.toString();
  })();
  const fullPreviewHref = `${previewPath}${previewSearch ? `?${previewSearch}` : ""}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <CopilotPlanSync
        industry={reportSlug}
        scale={planScale}
        fiscalYear={plan.fiscalYear}
        templateId={id}
        href={fullPreviewHref}
        organizationName={plan.organizationName || undefined}
      />
      <div className="print:hidden">
        <PageJsonLd
          name={`${plan.fiscalYear}年度 安全衛生計画書 プレビュー`}
          description={`${plan.template.industryLabel}・${plan.template.scaleLabel}の年次安全衛生計画書プレビュー`}
          path={previewPath}
          breadcrumbs={[
            { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
            {
              name: "計画ジェネレーター",
              url: "https://www.anzen-ai-portal.jp/strategy/plan-generator",
            },
            {
              name: "プレビュー",
              url: `https://www.anzen-ai-portal.jp${previewPath}`,
            },
          ]}
        />
      </div>

      <PageContainer width="prose" className="py-6 md:py-10">
        <div className="mb-4 space-y-3 print:hidden">
          <CopilotStepNav current="plan-generator" industry={reportSlug} />
          <CopilotMemo />
        </div>

        <div className="mb-6 flex flex-col items-stretch gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/strategy/plan-generator"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← 入力に戻る
          </Link>
          <PrintButton />
        </div>

        <PlanDocument plan={plan} />

        <div className="mt-8 print:hidden">
          <Link
            href="/strategy/plan-generator"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← 入力に戻る
          </Link>
        </div>

        <div className="print:hidden">
          <CopilotNextSteps
            current="plan-generator"
            industry={reportSlug}
            intro={`${plan.template.industryLabel}向けの${plan.fiscalYear}年度計画書を生成しました。重点目標・実施事項に対応する事故事例や根拠法令を、安全Copilotで横断確認できます。`}
            extraCta={
              reportSlug
                ? {
                    label: `${plan.template.industryLabel}の事故傾向と本計画を突き合わせる`,
                    description:
                      "業種別事故レポートと本計画書を並べて、目標値と実態に乖離がないか点検します。",
                    href: `/accidents-reports/${reportSlug}`,
                  }
                : undefined
            }
          />
        </div>
      </PageContainer>
      <div className="print:hidden">
        <CrossToolLinks
          industry={SAFETY_PLAN_TO_SLUG[plan.template.industry]}
          exclude="plan-generator"
          heading="計画書と合わせて使う"
        />
      </div>
    </div>
  );
}
