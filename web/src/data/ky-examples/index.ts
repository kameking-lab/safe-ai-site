import type { KyExample, KyIndustryId, KyWorkTypeId } from "@/types/ky-example";
import { CONSTRUCTION_EXAMPLES } from "./construction";
import { MANUFACTURING_EXAMPLES } from "./manufacturing";
import { TRANSPORT_EXAMPLES } from "./transport";
import { MEDICAL_WELFARE_EXAMPLES } from "./medical-welfare";
import { SERVICE_EXAMPLES } from "./service";

const RAW_KY_EXAMPLES: KyExample[] = [
  ...CONSTRUCTION_EXAMPLES,
  ...MANUFACTURING_EXAMPLES,
  ...TRANSPORT_EXAMPLES,
  ...MEDICAL_WELFARE_EXAMPLES,
  ...SERVICE_EXAMPLES,
];

/**
 * 個別URL・文書番号・確認日と各記述の支持関係を追跡できないため、全件を
 * syntheticモデルケースとして公開する。元データに残る機関名ラベルは、
 * 個別資料を確認できるまで公開出典にもAI groundingにも使用しない。
 */
export const KY_EXAMPLES: KyExample[] = RAW_KY_EXAMPLES.map((example) => ({
  ...example,
  source: {
    category: "general",
    label: "サイト独自のsyntheticモデルケース（一次資料未確認）",
    provenance: "synthetic",
    verification: "unverified",
    useForAiGrounding: false,
  },
}));

export const KY_EXAMPLES_DATA_STATUS = {
  total: KY_EXAMPLES.length,
  verifiedPrimarySourceCount: 0,
  aiGroundingEligibleCount: 0,
  status: "quarantined-for-grounding",
  asOf: "2026-07-24",
} as const;

export function getKyExampleById(id: string): KyExample | undefined {
  return KY_EXAMPLES.find((e) => e.id === id);
}

export function filterKyExamples(filters: {
  industry?: KyIndustryId;
  workType?: KyWorkTypeId;
}): KyExample[] {
  return KY_EXAMPLES.filter((e) => {
    if (filters.industry && e.industry !== filters.industry) return false;
    if (filters.workType && e.workType !== filters.workType) return false;
    return true;
  });
}
