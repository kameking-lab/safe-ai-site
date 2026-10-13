import {
  ALL_ACCIDENT_TYPES,
  type AccidentCase,
  type AccidentType,
} from "@/lib/types/domain";
import {
  ACCIDENT_TYPE_TO_HAZARD_SLUG,
  type HazardTypeSlug,
} from "@/lib/accidents/type-normalization";

export type CaseSearchFilters = {
  hazard: HazardTypeSlug | null;
  year: number | null;
  severity: AccidentCase["severity"] | null;
};

const SEARCHABLE_HAZARDS = new Set<HazardTypeSlug>(
  Object.values(ACCIDENT_TYPE_TO_HAZARD_SLUG),
);
const SEVERITIES: ReadonlyArray<AccidentCase["severity"]> = [
  "軽傷", "中等傷", "重傷", "死亡",
];

export function readCaseSearchFilters(params: URLSearchParams): CaseSearchFilters {
  const rawHazard = params.get("acc_hazard");
  const rawYear = params.get("acc_year");
  const rawSeverity = params.get("acc_severity");
  return {
    hazard: rawHazard && SEARCHABLE_HAZARDS.has(rawHazard as HazardTypeSlug)
      ? (rawHazard as HazardTypeSlug)
      : null,
    year: rawYear && /^(18|19|20)\d{2}$/.test(rawYear) ? Number(rawYear) : null,
    severity: rawSeverity && SEVERITIES.includes(rawSeverity as AccidentCase["severity"])
      ? (rawSeverity as AccidentCase["severity"])
      : null,
  };
}

/** A valid canonical hazard supersedes the legacy single-type filter. */
export function readAccidentTypeQuery(params: URLSearchParams): {
  selectedType: AccidentType | "すべて";
  clearLegacyType: boolean;
} {
  if (readCaseSearchFilters(params).hazard) {
    return { selectedType: "すべて", clearLegacyType: params.has("acc_type") };
  }
  const rawType = params.get("acc_type");
  return {
    selectedType: rawType && ALL_ACCIDENT_TYPES.includes(rawType as AccidentType)
      ? (rawType as AccidentType)
      : "すべて",
    clearLegacyType: false,
  };
}

export function filterCaseSearchResults(
  cases: readonly AccidentCase[],
  filters: CaseSearchFilters,
): AccidentCase[] {
  return cases.filter((item) => {
    if (filters.hazard && ACCIDENT_TYPE_TO_HAZARD_SLUG[item.type] !== filters.hazard) return false;
    if (filters.year !== null && !item.occurredOn.startsWith(`${filters.year}-`) && item.occurredOn !== String(filters.year)) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    return true;
  });
}
