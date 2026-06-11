import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  SchedulerDocument,
  buildTrackerData,
} from "@/components/health-checkup/scheduler-document";
import { CheckupConclusionCard } from "@/components/health-checkup/checkup-conclusion-card";
import { PrintButton } from "@/components/health-checkup/print-button";
import { CrossToolLinks, HEALTH_CHECKUP_TO_SLUG } from "@/components/cross-tool-links";
import { buildDecision } from "@/lib/health-checkup-engine";
import {
  INDUSTRY_LABELS,
  SUBSTANCE_LABELS,
  WORK_CONDITION_LABELS,
  type IndustryId,
  type SubstanceId,
  type WorkConditionId,
  type WorkerProfile,
} from "@/types/health-checkup";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const INDUSTRY_KEYS = Object.keys(INDUSTRY_LABELS) as IndustryId[];
const SUBSTANCE_KEYS = Object.keys(SUBSTANCE_LABELS) as SubstanceId[];
const WORK_CONDITION_KEYS = Object.keys(WORK_CONDITION_LABELS) as WorkConditionId[];

function readString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function readIndustry(
  sp: Record<string, string | string[] | undefined>,
): IndustryId {
  const v = readString(sp, "industry");
  return (INDUSTRY_KEYS as string[]).includes(v) ? (v as IndustryId) : "construction";
}

function readList<T extends string>(
  sp: Record<string, string | string[] | undefined>,
  key: string,
  whitelist: T[],
): T[] {
  const raw = readString(sp, key);
  if (!raw) return [];
  const allowed = new Set<string>(whitelist);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => s !== "" && allowed.has(s));
}

function readHireDate(
  sp: Record<string, string | string[] | undefined>,
): string {
  const v = readString(sp, "hire");
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10);
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const industry = readIndustry(sp);
  return {
    title: `健康診断スケジューラ 判定結果｜${INDUSTRY_LABELS[industry]}`,
    description:
      "業種・職種・物質・作業条件に基づく必要健診の判定結果と年間スケジュール。印刷／PDF出力対応。",
    alternates: { canonical: "/health-checkup-scheduler/result" },
    // The result page is generated from query parameters and not a stable
    // public resource — keep it out of the index.
    robots: { index: false, follow: true },
  };
}

export default async function HealthCheckupSchedulerResultPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const industry = readIndustry(sp);
  const jobIds = readString(sp, "jobs")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const substances = readList(sp, "substances", SUBSTANCE_KEYS);
  const workConditions = readList(sp, "conditions", WORK_CONDITION_KEYS);
  const hireDate = readHireDate(sp);

  const profile: WorkerProfile = {
    industry,
    jobIds,
    substances,
    workConditions,
    hireDate,
  };

  const decision = buildDecision(profile, []);
  const generatedAt = new Date().toISOString().slice(0, 10);
  const tracker = buildTrackerData(profile, decision);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <PageJsonLd
          name="健康診断スケジューラ 判定結果"
          description="業種・職種・物質・作業条件に基づく必要健診の判定結果と年間スケジュール。"
          path="/health-checkup-scheduler/result"
          breadcrumbs={[
            { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
            {
              name: "健康診断スケジューラ",
              url: "https://www.anzen-ai-portal.jp/health-checkup-scheduler",
            },
            {
              name: "判定結果",
              url: "https://www.anzen-ai-portal.jp/health-checkup-scheduler/result",
            },
          ]}
        />
      </div>

      <PageContainer width="prose" className="py-6 md:py-10">
        <div className="mb-6 flex flex-col items-stretch gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/health-checkup-scheduler"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← 入力に戻る
          </Link>
          <PrintButton />
        </div>

        {/* 結論ファースト: 期限超過→間近→記録のこり→期限内の1メッセージ（画面専用） */}
        <div className="mb-6 print:hidden">
          <CheckupConclusionCard
            entries={tracker.entries}
            storageKey={tracker.storageKey}
            requiredTotal={decision.required.length}
          />
        </div>

        <SchedulerDocument
          profile={profile}
          decision={decision}
          generatedAt={generatedAt}
        />

        <div className="mt-8 print:hidden">
          <Link
            href="/health-checkup-scheduler"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← 入力に戻る
          </Link>
        </div>
      </PageContainer>
      <div className="print:hidden">
        <CrossToolLinks
          industry={HEALTH_CHECKUP_TO_SLUG[industry]}
          exclude="health-checkup"
          heading="同業種の関連ツール"
        />
      </div>
    </div>
  );
}
