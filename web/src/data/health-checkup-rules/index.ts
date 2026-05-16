import type { CheckupRule, CheckupType } from "@/types/health-checkup";
import { GENERAL_CHECKUP_RULES } from "./general";
import { SPECIFIC_JOB_CHECKUP_RULES } from "./specific-job";
import { SPECIAL_CHECKUP_RULES } from "./special";
import { SILICOSIS_CHECKUP_RULES } from "./silicosis";
import { DENTAL_SPECIAL_CHECKUP_RULES } from "./dental-special";
import { ELECTRON_RADIATION_CHECKUP_RULES } from "./electron-radiation";

/**
 * Aggregated checkup rules. The order here is the canonical display order in
 * the UI (general → specific-job → special → silicosis → dental → radiation).
 */
export const ALL_CHECKUP_RULES: CheckupRule[] = [
  ...GENERAL_CHECKUP_RULES,
  ...SPECIFIC_JOB_CHECKUP_RULES,
  ...SPECIAL_CHECKUP_RULES,
  ...SILICOSIS_CHECKUP_RULES,
  ...DENTAL_SPECIAL_CHECKUP_RULES,
  ...ELECTRON_RADIATION_CHECKUP_RULES,
];

export function getRuleById(id: string): CheckupRule | undefined {
  return ALL_CHECKUP_RULES.find((r) => r.id === id);
}

export function getRulesByType(type: CheckupType): CheckupRule[] {
  return ALL_CHECKUP_RULES.filter((r) => r.type === type);
}

export {
  GENERAL_CHECKUP_RULES,
  SPECIFIC_JOB_CHECKUP_RULES,
  SPECIAL_CHECKUP_RULES,
  SILICOSIS_CHECKUP_RULES,
  DENTAL_SPECIAL_CHECKUP_RULES,
  ELECTRON_RADIATION_CHECKUP_RULES,
};

export { ALL_JOB_PROFILES, getJobsByIndustry, getJobById } from "./jobs";
