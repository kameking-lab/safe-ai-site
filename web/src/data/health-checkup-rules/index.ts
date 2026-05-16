import type { CheckupRule, CheckupType } from "@/types/health-checkup";
import { GENERAL_CHECKUP_RULES } from "./general";
import { SPECIFIC_JOB_CHECKUP_RULES } from "./specific-job";
import { SPECIAL_CHECKUP_RULES } from "./special";
import { SPECIAL_SUBSTANCE_SPECIFIC_CHECKUP_RULES } from "./special-substance-specific";
import { SPECIAL_RARE_METAL_CHECKUP_RULES } from "./special-rare-metals";
import { SILICOSIS_CHECKUP_RULES } from "./silicosis";
import { DENTAL_SPECIAL_CHECKUP_RULES } from "./dental-special";
import { DENTAL_EXTENDED_CHECKUP_RULES } from "./dental-extended";
import { ELECTRON_RADIATION_CHECKUP_RULES } from "./electron-radiation";
import { OVERTIME_CHECKUP_RULES } from "./overtime";
import { OVERSEAS_CHECKUP_RULES } from "./overseas";

/**
 * Aggregated checkup rules. Order is the canonical display order in the UI
 * (general → specific-job → special → silicosis → dental → radiation →
 *   overtime → overseas). Within each category, the substance-specific and
 * rare-metal rows follow the generic row so the result page shows the
 * narrowest applicable rule near the top.
 */
export const ALL_CHECKUP_RULES: CheckupRule[] = [
  ...GENERAL_CHECKUP_RULES,
  ...SPECIFIC_JOB_CHECKUP_RULES,
  ...SPECIAL_CHECKUP_RULES,
  ...SPECIAL_SUBSTANCE_SPECIFIC_CHECKUP_RULES,
  ...SPECIAL_RARE_METAL_CHECKUP_RULES,
  ...SILICOSIS_CHECKUP_RULES,
  ...DENTAL_SPECIAL_CHECKUP_RULES,
  ...DENTAL_EXTENDED_CHECKUP_RULES,
  ...ELECTRON_RADIATION_CHECKUP_RULES,
  ...OVERTIME_CHECKUP_RULES,
  ...OVERSEAS_CHECKUP_RULES,
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
  SPECIAL_SUBSTANCE_SPECIFIC_CHECKUP_RULES,
  SPECIAL_RARE_METAL_CHECKUP_RULES,
  SILICOSIS_CHECKUP_RULES,
  DENTAL_SPECIAL_CHECKUP_RULES,
  DENTAL_EXTENDED_CHECKUP_RULES,
  ELECTRON_RADIATION_CHECKUP_RULES,
  OVERTIME_CHECKUP_RULES,
  OVERSEAS_CHECKUP_RULES,
};

export { ALL_JOB_PROFILES, getJobsByIndustry, getJobById } from "./jobs";
