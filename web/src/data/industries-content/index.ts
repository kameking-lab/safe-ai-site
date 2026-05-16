/**
 * Industry landing content registry.
 *
 * Indexed by IndustrySlug — matches the 5 buckets covered by the
 * accident-analysis data layer at /accidents-reports.
 */

import type { IndustrySlug } from "@/lib/accident-analysis";
import type { IndustryContent } from "@/types/industry-content";
import { constructionContent } from "./construction";
import { manufacturingContent } from "./manufacturing";
import { transportContent } from "./transport";
import { healthcareContent } from "./healthcare";
import { serviceContent } from "./service";

const ALL: Record<IndustrySlug, IndustryContent> = {
  construction: constructionContent,
  manufacturing: manufacturingContent,
  transport: transportContent,
  healthcare: healthcareContent,
  service: serviceContent,
};

export function getIndustryContent(slug: string): IndustryContent | undefined {
  return ALL[slug as IndustrySlug];
}

export function listIndustryContents(): readonly IndustryContent[] {
  return Object.values(ALL);
}

export const INDUSTRY_CONTENT_SLUGS: readonly IndustrySlug[] = [
  "construction",
  "manufacturing",
  "transport",
  "healthcare",
  "service",
];
