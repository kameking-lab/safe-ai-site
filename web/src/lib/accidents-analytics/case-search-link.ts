import { ALL_ACCIDENT_CATEGORIES } from "@/lib/types/domain";
import {
  ACCIDENT_TYPE_TO_HAZARD_SLUG,
  normalizeHazardType,
  type HazardTypeSlug,
} from "@/lib/accidents/type-normalization";
import type { AnalyticsAggregates } from "./types";

type Filters = AnalyticsAggregates["meta"]["filters"];

const INDUSTRY_QUERY_KEYS: Readonly<Record<string, string>> = {
  建設業: "construction",
  製造業: "manufacturing",
  運輸交通業: "transport",
  林業: "forestry",
  小売業: "retail",
  化学: "chemical",
  電気業: "electrical",
};

const SEARCHABLE_HAZARDS = new Set<HazardTypeSlug>(
  Object.values(ACCIDENT_TYPE_TO_HAZARD_SLUG),
);

export type CaseSearchLink = {
  href: string;
  transferred: string[];
  omitted: string[];
};

/** Search links carry only predicates that the separate case database can evaluate. */
export function buildCaseSearchLink(filters: Filters): CaseSearchLink {
  const params = new URLSearchParams();
  const transferred: string[] = [];
  const omitted: string[] = [];

  if (filters.industry) {
    const key = ALL_ACCIDENT_CATEGORIES.includes(
      filters.industry as (typeof ALL_ACCIDENT_CATEGORIES)[number],
    )
      ? INDUSTRY_QUERY_KEYS[filters.industry]
      : undefined;
    if (key) {
      params.set("acc_industries", key);
      transferred.push(`業種: ${filters.industry}`);
    } else {
      omitted.push(`業種: ${filters.industry}`);
    }
  }

  if (filters.type) {
    const hazard = normalizeHazardType(filters.type);
    if (hazard && SEARCHABLE_HAZARDS.has(hazard) && hazard !== "other") {
      params.set("acc_hazard", hazard);
      transferred.push(`事故の型: ${filters.type}`);
    } else {
      omitted.push(`事故の型: ${filters.type}`);
    }
  }

  if (filters.year !== null) {
    params.set("acc_year", String(filters.year));
    transferred.push(`年: ${filters.year}年`);
  }
  if (filters.severity) {
    params.set("acc_severity", filters.severity);
    transferred.push(`重症度: ${filters.severity}`);
  }

  const otherFilters: Array<[string, string | number | null]> = [
    ["月", filters.month],
    ["業種中分類", filters.industryMedium],
    ["起因物", filters.cause],
    ["事業場規模", filters.workplaceSize],
    ["発生時間帯", filters.occurrenceTime],
    ["都道府県", filters.prefecture],
    ["年齢", filters.age],
    ["データ源", filters.source === "official" ? null : filters.source],
  ];
  for (const [label, value] of otherFilters) {
    if (value !== null) omitted.push(`${label}: ${value}`);
  }

  return {
    href: `/accidents${params.size ? `?${params.toString()}` : ""}#accident-results`,
    transferred,
    omitted,
  };
}
