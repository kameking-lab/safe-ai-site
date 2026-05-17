import type {
  KyExample,
  KyIndustryId,
  KyWorkTypeId,
} from "@/types/ky-example";
import { CONSTRUCTION_EXAMPLES } from "./construction";
import { MANUFACTURING_EXAMPLES } from "./manufacturing";
import { TRANSPORT_EXAMPLES } from "./transport";
import { MEDICAL_WELFARE_EXAMPLES } from "./medical-welfare";
import { SERVICE_EXAMPLES } from "./service";

export const KY_EXAMPLES: KyExample[] = [
  ...CONSTRUCTION_EXAMPLES,
  ...MANUFACTURING_EXAMPLES,
  ...TRANSPORT_EXAMPLES,
  ...MEDICAL_WELFARE_EXAMPLES,
  ...SERVICE_EXAMPLES,
];

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
