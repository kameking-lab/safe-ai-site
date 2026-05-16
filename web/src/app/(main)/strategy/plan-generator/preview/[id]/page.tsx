import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { PlanDocument } from "@/components/safety-plan/plan-document";
import { PrintButton } from "@/components/safety-plan/print-button";
import { CrossToolLinks, SAFETY_PLAN_TO_SLUG } from "@/components/cross-tool-links";
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

  return (
    <div className="min-h-screen bg-slate-50">
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
