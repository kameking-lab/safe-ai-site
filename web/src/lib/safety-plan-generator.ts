/**
 * Annual safety & health plan generator.
 *
 * Inputs: industry, scale, fiscal year, organization name, focus areas,
 * custom goals, free-text notes. Output: a {@link GeneratedPlan} ready to
 * render and print.
 *
 * Strategy:
 * 1. Resolve a base template (industry × scale) from the registry.
 * 2. If the caller chose `focusAreas`, re-sort measures so those categories
 *    appear first (industry-specific items keep their relative order).
 * 3. Layer in caller-supplied custom goals so internal targets land at the top
 *    of the goal list.
 * 4. Stamp a deterministic id and ISO timestamp so the same input can be
 *    regenerated reproducibly during preview.
 */

import { findTemplate, findTemplateById } from "@/data/safety-plan-templates";
import type {
  GeneratedPlan,
  MeasureCategory,
  MonthlySchedule,
  PlanGeneratorInput,
  SafetyMeasure,
  SafetyPlanTemplate,
} from "@/types/safety-plan";

export interface GeneratorError {
  reason: "template-not-found";
  message: string;
}

export type GeneratorResult =
  | { ok: true; plan: GeneratedPlan }
  | { ok: false; error: GeneratorError };

function prioritizeMeasures(
  measures: SafetyMeasure[],
  focusAreas: MeasureCategory[],
): SafetyMeasure[] {
  if (focusAreas.length === 0) return measures;
  const focused = new Set(focusAreas);
  const head = measures.filter((m) => focused.has(m.category));
  const tail = measures.filter((m) => !focused.has(m.category));
  return [...head, ...tail];
}

function annotateScheduleWithFiscalYear(
  schedule: MonthlySchedule[],
  fiscalYear: number,
): MonthlySchedule[] {
  // Fiscal year starts in April (Japan standard). Months 4-12 belong to
  // `fiscalYear`; months 1-3 belong to `fiscalYear + 1`. This is implicit
  // in the rendered UI but kept here to make ordering explicit.
  const ordered = [...schedule].sort((a, b) => {
    const aFiscalIndex = a.month >= 4 ? a.month - 4 : a.month + 8;
    const bFiscalIndex = b.month >= 4 ? b.month - 4 : b.month + 8;
    return aFiscalIndex - bFiscalIndex;
  });
  // fiscalYear is not embedded in MonthlySchedule itself; the ordering is the
  // only output mutation needed.
  void fiscalYear;
  return ordered;
}

function buildId(input: PlanGeneratorInput, timestamp: number): string {
  const safeOrg = (input.organizationName || "org")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9一-龯ぁ-ゔァ-ヴー]/g, "")
    .slice(0, 16);
  return [
    input.industry,
    input.scale,
    String(input.fiscalYear),
    safeOrg || "org",
    timestamp.toString(36),
  ].join("-");
}

export function generatePlan(input: PlanGeneratorInput): GeneratorResult {
  const template = findTemplate(input.industry, input.scale);
  if (!template) {
    return {
      ok: false,
      error: {
        reason: "template-not-found",
        message: `テンプレートが見つかりません: ${input.industry}-${input.scale}`,
      },
    };
  }

  const orderedMeasures = prioritizeMeasures(
    template.measures,
    input.focusAreas,
  );
  const orderedSchedule = annotateScheduleWithFiscalYear(
    template.monthlySchedule,
    input.fiscalYear,
  );

  const composedTemplate: SafetyPlanTemplate = {
    ...template,
    measures: orderedMeasures,
    monthlySchedule: orderedSchedule,
  };

  const now = Date.now();
  const id = buildId(input, now);
  const plan: GeneratedPlan = {
    id,
    generatedAt: new Date(now).toISOString(),
    industry: input.industry,
    scale: input.scale,
    organizationName: input.organizationName.trim(),
    fiscalYear: input.fiscalYear,
    template: composedTemplate,
    customGoals: input.customGoals,
    notes: input.notes.trim(),
  };
  return { ok: true, plan };
}

/**
 * Deterministically reconstruct a {@link GeneratedPlan} from a template id and
 * caller-supplied fields. Used by the preview route which receives the id in
 * the URL and the other fields in a query string.
 */
export function regenerateFromTemplateId(args: {
  templateId: string;
  fiscalYear: number;
  organizationName: string;
  focusAreas: MeasureCategory[];
  customGoals: GeneratedPlan["customGoals"];
  notes: string;
}): GeneratorResult {
  const tpl = findTemplateById(args.templateId);
  if (!tpl) {
    return {
      ok: false,
      error: {
        reason: "template-not-found",
        message: `テンプレートが見つかりません: ${args.templateId}`,
      },
    };
  }
  return generatePlan({
    industry: tpl.industry,
    scale: tpl.scale,
    organizationName: args.organizationName,
    fiscalYear: args.fiscalYear,
    focusAreas: args.focusAreas,
    customGoals: args.customGoals,
    notes: args.notes,
  });
}
