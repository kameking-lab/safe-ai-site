import { z } from "zod";

export const VISUAL_KY_CATEGORIES = [
  "fall",
  "heavy-equipment",
  "load-handling",
  "electrical",
  "fire-explosion",
  "chemical",
  "heat",
  "trip",
  "high-work-platform",
  "scaffold",
  "stepladder",
  "lone-work",
  "newcomer",
  "night",
  "traffic",
] as const;

export const visualKyCategorySchema = z.enum(VISUAL_KY_CATEGORIES);

export const visualKySourceSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(5),
  organization: z.string().min(2),
  url: z.string().url().startsWith("https://"),
  locator: z.string().min(2),
  checkedDate: z.iso.date(),
  applicableScope: z.string().min(5),
  kind: z.enum(["primary", "official-guidance", "official-case"]),
});

export const visualKyHotspotSchema = z.object({
  id: z.string().regex(/^spot-[a-z0-9-]+$/),
  x: z.number().min(4).max(96),
  y: z.number().min(4).max(96),
  radius: z.number().min(2.5).max(9),
  label: z.string().min(2),
  hazardId: z.string().regex(/^haz-[a-z0-9-]+$/).nullable(),
});

export const visualKyHazardSchema = z.object({
  id: z.string().regex(/^haz-[a-z0-9-]+$/),
  hotspotId: z.string().regex(/^spot-[a-z0-9-]+$/),
  title: z.string().min(2),
  what: z.string().min(10),
  why: z.string().min(10),
  possibleAccident: z.string().min(10),
  firstAction: z.string().min(8),
  engineeringControls: z.array(z.string().min(5)).min(1),
  administrativeControls: z.array(z.string().min(5)).min(1),
  ppe: z.array(z.string().min(2)).min(1),
  stopEscalationConditions: z.array(z.string().min(5)).min(1),
  sourceIds: z.array(z.string().min(3)).min(1),
});

export const visualKyScenarioSchema = z
  .object({
    id: z.string().regex(/^vkyt-\d{3}$/),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(8),
    shortTitle: z.string().min(2).max(24),
    category: visualKyCategorySchema,
    categoryTags: z.array(visualKyCategorySchema).min(1),
    industry: z.array(z.string().min(2)).min(1),
    difficulty: z.enum(["入門", "標準", "応用"]),
    estimatedMinutes: z.number().int().min(3).max(15),
    image: z.object({
      src: z.string().startsWith("/visual-ky/scenarios/").endsWith(".webp"),
      width: z.literal(1600),
      height: z.literal(900),
      alt: z.string().min(20),
      fullDescription: z.string().min(80),
      rightsStatus: z.enum([
        "approved-user-owned",
        "generated-for-this-project",
      ]),
    }),
    hotspots: z.array(visualKyHotspotSchema).min(2),
    hazards: z.array(visualKyHazardSchema).min(2),
    distractor: z.object({
      hotspotId: z.string().regex(/^spot-[a-z0-9-]+$/),
      label: z.string().min(2),
      explanation: z.string().min(10),
    }),
    answerExplanation: z.string().min(30),
    preventionHierarchy: z.object({
      elimination: z.array(z.string().min(5)).min(1),
      substitution: z.array(z.string().min(5)).min(1),
      engineering: z.array(z.string().min(5)).min(1),
      administrative: z.array(z.string().min(5)).min(1),
      ppe: z.array(z.string().min(2)).min(1),
    }),
    countermeasureOptions: z
      .array(
        z.object({
          id: z.string().regex(/^measure-[a-z0-9-]+$/),
          label: z.string().min(5),
          hierarchy: z.enum([
            "elimination",
            "substitution",
            "engineering",
            "administrative",
            "ppe",
          ]),
          recommended: z.boolean(),
          rationale: z.string().min(10),
        }),
      )
      .min(4),
    officialSources: z.array(visualKySourceSchema).min(1),
    relatedAccidents: z
      .array(
        z.object({
          id: z.string().regex(/^mhlw-\d+$/),
          label: z.string().min(5),
          href: z.literal("/accidents"),
          sourceStatus: z.literal("curated"),
        }),
      )
      .min(1),
    relatedLaws: z
      .array(
        z.object({
          id: z.string().min(3),
          label: z.string().min(3),
          href: z.string().startsWith("/law-"),
          locator: z.string().min(2),
        }),
      )
      .min(1),
    relatedQualifications: z.array(
      z.object({
        id: z.string().min(3),
        label: z.string().min(3),
        href: z.literal("/education-certification/finder"),
        condition: z.string().min(5),
      }),
    ),
    kyPrefill: z.object({
      workDetail: z.string().min(5).max(160),
      risks: z
        .array(
          z.object({
            hazard: z.string().min(5).max(180),
            reduction: z.string().min(5).max(180),
          }),
        )
        .min(2)
        .max(6),
      humanReviewRequired: z.literal(true),
      notice: z.string().min(15),
    }),
    facilitator: z.object({
      learningObjectives: z.array(z.string().min(5)).min(2),
      openingQuestion: z.string().min(5),
      followUpQuestions: z.array(z.string().min(5)).min(2),
      revealCue: z.string().min(5),
      commonMistakes: z.array(z.string().min(5)).min(1),
      summary: z.string().min(15),
      coursePlans: z.object({
        five: z.array(z.string().min(3)).min(3),
        ten: z.array(z.string().min(3)).min(3),
        fifteen: z.array(z.string().min(3)).min(3),
      }),
    }),
    seasonalWeights: z.object({
      default: z.number().positive().max(8),
      summer: z.number().positive().max(8),
      rainy: z.number().positive().max(8),
      typhoon: z.number().positive().max(8),
      winter: z.number().positive().max(8),
    }),
    synthetic: z.literal(true),
    syntheticDisclosure: z.string().min(15),
    reviewedBy: z.string().min(3),
    reviewedDate: z.iso.date(),
    reviewStatus: z.enum(["reviewed", "draft"]),
    indexability: z.enum(["index", "noindex"]),
    rightsStatus: z.enum([
      "approved-user-owned",
      "generated-for-this-project",
    ]),
    updatedDate: z.iso.date(),
  })
  .superRefine((scenario, context) => {
    const hotspotIds = new Set(scenario.hotspots.map((hotspot) => hotspot.id));
    const hazardIds = new Set(scenario.hazards.map((hazard) => hazard.id));
    const sourceIds = new Set(
      scenario.officialSources.map((source) => source.id),
    );

    for (const hazard of scenario.hazards) {
      if (!hotspotIds.has(hazard.hotspotId)) {
        context.addIssue({
          code: "custom",
          path: ["hazards"],
          message: `${hazard.id} refers to a missing hotspot`,
        });
      }
      for (const sourceId of hazard.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: "custom",
            path: ["hazards"],
            message: `${hazard.id} refers to a missing source`,
          });
        }
      }
    }

    for (const hotspot of scenario.hotspots) {
      if (hotspot.hazardId !== null && !hazardIds.has(hotspot.hazardId)) {
        context.addIssue({
          code: "custom",
          path: ["hotspots"],
          message: `${hotspot.id} refers to a missing hazard`,
        });
      }
    }

    const distractor = scenario.hotspots.find(
      (hotspot) => hotspot.id === scenario.distractor.hotspotId,
    );
    if (!distractor || distractor.hazardId !== null) {
      context.addIssue({
        code: "custom",
        path: ["distractor"],
        message: "The distractor hotspot must exist and must not be a hazard",
      });
    }

    if (!scenario.categoryTags.includes(scenario.category)) {
      context.addIssue({
        code: "custom",
        path: ["categoryTags"],
        message: "categoryTags must include the primary category",
      });
    }

    if (
      scenario.reviewStatus === "reviewed" &&
      scenario.indexability !== "index"
    ) {
      context.addIssue({
        code: "custom",
        path: ["indexability"],
        message: "Reviewed public scenarios must be indexable",
      });
    }
  });

export type VisualKyCategory = z.infer<typeof visualKyCategorySchema>;
export type VisualKySource = z.infer<typeof visualKySourceSchema>;
export type VisualKyScenario = z.infer<typeof visualKyScenarioSchema>;
