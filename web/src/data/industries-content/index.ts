/**
 * Industry landing content registry.
 *
 * Indexed by IndustryContentSlug — 10 industries covering the full Japanese
 * OSH industry taxonomy (matches /strategy/plan-generator). Five of these
 * also align with the 5-bucket accident-statistics model.
 */

import type { IndustryContent, IndustryContentSlug } from "@/types/industry-content";
import { constructionContent } from "./construction";
import { manufacturingContent } from "./manufacturing";
import { transportContent } from "./transport";
import { healthcareContent } from "./healthcare";
import { serviceContent } from "./service";
import { retailContent } from "./retail";
import { foodContent } from "./food";
import { wholesaleContent } from "./wholesale";
import { warehouseContent } from "./warehouse";
import { officeContent } from "./office";

const ALL: Record<IndustryContentSlug, IndustryContent> = {
  construction: constructionContent,
  manufacturing: manufacturingContent,
  transport: transportContent,
  healthcare: healthcareContent,
  service: serviceContent,
  retail: retailContent,
  food: foodContent,
  wholesale: wholesaleContent,
  warehouse: warehouseContent,
  office: officeContent,
};

export function getIndustryContent(slug: string): IndustryContent | undefined {
  return ALL[slug as IndustryContentSlug];
}

export function listIndustryContents(): readonly IndustryContent[] {
  return Object.values(ALL);
}

export const INDUSTRY_CONTENT_SLUGS: readonly IndustryContentSlug[] = [
  "construction",
  "manufacturing",
  "transport",
  "healthcare",
  "service",
  "retail",
  "food",
  "wholesale",
  "warehouse",
  "office",
];
