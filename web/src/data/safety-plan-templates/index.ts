/**
 * Registry composing 13 industries × 3 scales = 39 annual safety & health plan
 * templates from the building blocks under base/ and industries/.
 * Industries are listed in priority order (construction first, primary industries
 * before agricultural sectors) — this order is preserved through
 * INDUSTRY_BUNDLES, SAFETY_PLAN_TEMPLATES, listIndustries(), and INDUSTRY_LABELS.
 */

import {
  INDUSTRY_LABELS,
  SCALE_LABELS,
  type IndustryId,
  type MonthIndex,
  type MonthlyEvent,
  type MonthlySchedule,
  type SafetyMeasure,
  type SafetyPlanTemplate,
  type ScaleId,
} from "@/types/safety-plan";

import {
  baseSafetyMeasures,
  getScaleAdditions,
} from "./base/common-measures";
import { commonMonthlySchedule } from "./base/common-schedule";
import {
  commonLawReferences,
  commonCircularReferences,
  getScaleLawReferences,
  getScaleCircularReferences,
} from "./base/common-laws";
import { getBaseGoals } from "./base/common-goals";
import { getIndustryScaleOverlay } from "./base/industry-scale-overlays";
import { optimizeMonthlySchedule } from "./base/schedule-optimizer";

import {
  constructionBasicPolicy,
  constructionCircularReferences,
  constructionIndustryGoals,
  constructionIndustryMeasures,
  constructionLawReferences,
  constructionMonthlyExtras,
} from "./industries/construction";
import {
  manufacturingBasicPolicy,
  manufacturingCircularReferences,
  manufacturingIndustryGoals,
  manufacturingIndustryMeasures,
  manufacturingLawReferences,
  manufacturingMonthlyExtras,
} from "./industries/manufacturing";
import {
  transportationBasicPolicy,
  transportationCircularReferences,
  transportationIndustryGoals,
  transportationIndustryMeasures,
  transportationLawReferences,
  transportationMonthlyExtras,
} from "./industries/transportation";
import {
  medicalBasicPolicy,
  medicalCircularReferences,
  medicalIndustryGoals,
  medicalIndustryMeasures,
  medicalLawReferences,
  medicalMonthlyExtras,
} from "./industries/medical";
import {
  serviceBasicPolicy,
  serviceCircularReferences,
  serviceIndustryGoals,
  serviceIndustryMeasures,
  serviceLawReferences,
  serviceMonthlyExtras,
} from "./industries/service";
import {
  retailBasicPolicy,
  retailCircularReferences,
  retailIndustryGoals,
  retailIndustryMeasures,
  retailLawReferences,
  retailMonthlyExtras,
} from "./industries/retail";
import {
  foodBasicPolicy,
  foodCircularReferences,
  foodIndustryGoals,
  foodIndustryMeasures,
  foodLawReferences,
  foodMonthlyExtras,
} from "./industries/food";
import {
  wholesaleBasicPolicy,
  wholesaleCircularReferences,
  wholesaleIndustryGoals,
  wholesaleIndustryMeasures,
  wholesaleLawReferences,
  wholesaleMonthlyExtras,
} from "./industries/wholesale";
import {
  warehouseBasicPolicy,
  warehouseCircularReferences,
  warehouseIndustryGoals,
  warehouseIndustryMeasures,
  warehouseLawReferences,
  warehouseMonthlyExtras,
} from "./industries/warehouse";
import {
  officeBasicPolicy,
  officeCircularReferences,
  officeIndustryGoals,
  officeIndustryMeasures,
  officeLawReferences,
  officeMonthlyExtras,
} from "./industries/office";
import {
  agricultureBasicPolicy,
  agricultureCircularReferences,
  agricultureIndustryGoals,
  agricultureIndustryMeasures,
  agricultureLawReferences,
  agricultureMonthlyExtras,
} from "./industries/agriculture";
import {
  forestryBasicPolicy,
  forestryCircularReferences,
  forestryIndustryGoals,
  forestryIndustryMeasures,
  forestryLawReferences,
  forestryMonthlyExtras,
} from "./industries/forestry";
import {
  fisheryBasicPolicy,
  fisheryCircularReferences,
  fisheryIndustryGoals,
  fisheryIndustryMeasures,
  fisheryLawReferences,
  fisheryMonthlyExtras,
} from "./industries/fishery";

interface IndustryBundle {
  industry: IndustryId;
  basicPolicy: string;
  goals: typeof constructionIndustryGoals;
  measures: SafetyMeasure[];
  monthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>>;
  laws: typeof constructionLawReferences;
  circulars: typeof constructionCircularReferences;
}

const INDUSTRY_BUNDLES: IndustryBundle[] = [
  {
    industry: "construction",
    basicPolicy: constructionBasicPolicy,
    goals: constructionIndustryGoals,
    measures: constructionIndustryMeasures,
    monthlyExtras: constructionMonthlyExtras,
    laws: constructionLawReferences,
    circulars: constructionCircularReferences,
  },
  {
    industry: "manufacturing",
    basicPolicy: manufacturingBasicPolicy,
    goals: manufacturingIndustryGoals,
    measures: manufacturingIndustryMeasures,
    monthlyExtras: manufacturingMonthlyExtras,
    laws: manufacturingLawReferences,
    circulars: manufacturingCircularReferences,
  },
  {
    industry: "transportation",
    basicPolicy: transportationBasicPolicy,
    goals: transportationIndustryGoals,
    measures: transportationIndustryMeasures,
    monthlyExtras: transportationMonthlyExtras,
    laws: transportationLawReferences,
    circulars: transportationCircularReferences,
  },
  {
    industry: "medical",
    basicPolicy: medicalBasicPolicy,
    goals: medicalIndustryGoals,
    measures: medicalIndustryMeasures,
    monthlyExtras: medicalMonthlyExtras,
    laws: medicalLawReferences,
    circulars: medicalCircularReferences,
  },
  {
    industry: "service",
    basicPolicy: serviceBasicPolicy,
    goals: serviceIndustryGoals,
    measures: serviceIndustryMeasures,
    monthlyExtras: serviceMonthlyExtras,
    laws: serviceLawReferences,
    circulars: serviceCircularReferences,
  },
  {
    industry: "retail",
    basicPolicy: retailBasicPolicy,
    goals: retailIndustryGoals,
    measures: retailIndustryMeasures,
    monthlyExtras: retailMonthlyExtras,
    laws: retailLawReferences,
    circulars: retailCircularReferences,
  },
  {
    industry: "food",
    basicPolicy: foodBasicPolicy,
    goals: foodIndustryGoals,
    measures: foodIndustryMeasures,
    monthlyExtras: foodMonthlyExtras,
    laws: foodLawReferences,
    circulars: foodCircularReferences,
  },
  {
    industry: "wholesale",
    basicPolicy: wholesaleBasicPolicy,
    goals: wholesaleIndustryGoals,
    measures: wholesaleIndustryMeasures,
    monthlyExtras: wholesaleMonthlyExtras,
    laws: wholesaleLawReferences,
    circulars: wholesaleCircularReferences,
  },
  {
    industry: "warehouse",
    basicPolicy: warehouseBasicPolicy,
    goals: warehouseIndustryGoals,
    measures: warehouseIndustryMeasures,
    monthlyExtras: warehouseMonthlyExtras,
    laws: warehouseLawReferences,
    circulars: warehouseCircularReferences,
  },
  {
    industry: "office",
    basicPolicy: officeBasicPolicy,
    goals: officeIndustryGoals,
    measures: officeIndustryMeasures,
    monthlyExtras: officeMonthlyExtras,
    laws: officeLawReferences,
    circulars: officeCircularReferences,
  },
  {
    industry: "agriculture",
    basicPolicy: agricultureBasicPolicy,
    goals: agricultureIndustryGoals,
    measures: agricultureIndustryMeasures,
    monthlyExtras: agricultureMonthlyExtras,
    laws: agricultureLawReferences,
    circulars: agricultureCircularReferences,
  },
  {
    industry: "forestry",
    basicPolicy: forestryBasicPolicy,
    goals: forestryIndustryGoals,
    measures: forestryIndustryMeasures,
    monthlyExtras: forestryMonthlyExtras,
    laws: forestryLawReferences,
    circulars: forestryCircularReferences,
  },
  {
    industry: "fishery",
    basicPolicy: fisheryBasicPolicy,
    goals: fisheryIndustryGoals,
    measures: fisheryIndustryMeasures,
    monthlyExtras: fisheryMonthlyExtras,
    laws: fisheryLawReferences,
    circulars: fisheryCircularReferences,
  },
];

const SCALES: ScaleId[] = ["small", "medium", "large"];

function mergeMonthlySchedule(
  ...overlays: Array<Partial<Record<MonthIndex, MonthlyEvent[]>>>
): MonthlySchedule[] {
  return commonMonthlySchedule.map((entry) => {
    const extra: MonthlyEvent[] = overlays.flatMap(
      (overlay) => overlay[entry.month] ?? [],
    );
    return { month: entry.month, events: [...entry.events, ...extra] };
  });
}

function buildTemplate(
  bundle: IndustryBundle,
  scale: ScaleId,
): SafetyPlanTemplate {
  const scaleOverlay = getIndustryScaleOverlay(bundle.industry, scale);
  const merged = mergeMonthlySchedule(
    bundle.monthlyExtras,
    scaleOverlay.extraMonthlyEvents,
  );
  return {
    id: `${bundle.industry}-${scale}`,
    industry: bundle.industry,
    scale,
    industryLabel: INDUSTRY_LABELS[bundle.industry],
    scaleLabel: SCALE_LABELS[scale],
    basicPolicy: bundle.basicPolicy,
    goals: [
      ...getBaseGoals(scale),
      ...bundle.goals,
      ...scaleOverlay.extraGoals,
    ],
    measures: [
      ...baseSafetyMeasures,
      ...getScaleAdditions(scale),
      ...bundle.measures,
      ...scaleOverlay.extraMeasures,
    ],
    monthlySchedule: optimizeMonthlySchedule(merged, bundle.industry),
    relatedLaws: [
      ...commonLawReferences,
      ...getScaleLawReferences(scale),
      ...bundle.laws,
    ],
    relatedCirculars: [
      ...commonCircularReferences,
      ...getScaleCircularReferences(scale),
      ...bundle.circulars,
    ],
  };
}

/** All 39 templates: 13 industries × 3 scales. */
export const SAFETY_PLAN_TEMPLATES: readonly SafetyPlanTemplate[] =
  Object.freeze(
    INDUSTRY_BUNDLES.flatMap((bundle) =>
      SCALES.map((scale) => buildTemplate(bundle, scale)),
    ),
  );

export function findTemplate(
  industry: IndustryId,
  scale: ScaleId,
): SafetyPlanTemplate | undefined {
  return SAFETY_PLAN_TEMPLATES.find(
    (t) => t.industry === industry && t.scale === scale,
  );
}

export function findTemplateById(id: string): SafetyPlanTemplate | undefined {
  return SAFETY_PLAN_TEMPLATES.find((t) => t.id === id);
}

export function listIndustries(): IndustryId[] {
  return INDUSTRY_BUNDLES.map((b) => b.industry);
}
