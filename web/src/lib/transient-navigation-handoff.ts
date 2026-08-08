/**
 * One-shot, same-tab handoffs for sensitive form state.
 *
 * Deliberately module-memory only: never serialise these values into URLs,
 * history.state, Web Storage, analytics, or server requests.
 */
import type {
  IndustryId as HealthIndustryId,
  SubstanceId,
  WorkConditionId,
} from "@/types/health-checkup";
import type {
  MeasureCategory,
  OverworkPriority,
  SpecialWorkId,
} from "@/types/safety-plan";

export type SafetyPlanHandoff = {
  templateId: string;
  fiscalYear: number;
  organizationName: string;
  focusAreas: MeasureCategory[];
  specialWork: SpecialWorkId[];
  hasOverseasAssignment: boolean;
  overworkPriority: OverworkPriority;
  notes: string;
};

export type HealthCheckupHandoff = {
  industry: HealthIndustryId;
  jobIds: string[];
  substances: SubstanceId[];
  workConditions: WorkConditionId[];
  hireDate: string;
};

let safetyPlanHandoff: SafetyPlanHandoff | null = null;
let healthCheckupHandoff: HealthCheckupHandoff | null = null;

export function putSafetyPlanHandoff(value: SafetyPlanHandoff): void {
  safetyPlanHandoff = structuredClone(value);
}

export function consumeSafetyPlanHandoff(
  templateId: string,
): SafetyPlanHandoff | null {
  if (!safetyPlanHandoff || safetyPlanHandoff.templateId !== templateId) {
    return null;
  }
  const value = safetyPlanHandoff;
  safetyPlanHandoff = null;
  return structuredClone(value);
}

export function putHealthCheckupHandoff(value: HealthCheckupHandoff): void {
  healthCheckupHandoff = structuredClone(value);
}

export function consumeHealthCheckupHandoff(): HealthCheckupHandoff | null {
  if (!healthCheckupHandoff) return null;
  const value = healthCheckupHandoff;
  healthCheckupHandoff = null;
  return structuredClone(value);
}

export function clearTransientNavigationHandoffsForTest(): void {
  safetyPlanHandoff = null;
  healthCheckupHandoff = null;
}
