/**
 * Pure filter helpers for the /accidents-reports hub.
 *
 * The hub lists 5 industry cards. Filters narrow the list:
 *   - q: free-text match against label / tagline / topType / topTypes / labelEn
 *   - type: accident-type group (matches any of topTypes via substring)
 *   - month: 1-12 — match if the month is among the industry's peak months
 *
 * Kept pure (no React) so it's testable in isolation.
 */

import type { AllIndustriesSummary } from "@/lib/accident-analysis";

export type AccidentTypeFilter =
  | "all"
  | "fall"
  | "caught"
  | "trip"
  | "shock"
  | "other";

/**
 * Substring patterns used to map a filter selection to the raw `type`
 * strings emitted by MHLW data ("墜落、転落", "はさまれ・巻き込まれ" 等).
 * Patterns are matched case-insensitively against `topTypes`.
 */
export const ACCIDENT_TYPE_PATTERNS: Record<
  Exclude<AccidentTypeFilter, "all" | "other">,
  string[]
> = {
  fall: ["墜落", "転落"],
  caught: ["はさまれ", "巻き込まれ", "巻き込", "挟まれ"],
  trip: ["転倒"],
  shock: ["感電"],
};

export const ACCIDENT_TYPE_LABELS: Record<AccidentTypeFilter, string> = {
  all: "全ての事故型",
  fall: "墜落・転落",
  caught: "はさまれ・巻き込まれ",
  trip: "転倒",
  shock: "感電",
  other: "その他",
};

export type HubFilterState = {
  q: string;
  type: AccidentTypeFilter;
  month: number; // 0 means "all months"
};

export function parseAccidentTypeFilter(raw: string | null | undefined): AccidentTypeFilter {
  if (!raw) return "all";
  const v = raw.toLowerCase();
  if (v === "fall" || v === "caught" || v === "trip" || v === "shock" || v === "other") {
    return v;
  }
  return "all";
}

export function parseMonthFilter(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  if (n < 1 || n > 12) return 0;
  return Math.floor(n);
}

function matchesType(
  topTypes: string[],
  filter: AccidentTypeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "other") {
    // "other" = no top type matches any of the known patterns.
    const knownPatterns = Object.values(ACCIDENT_TYPE_PATTERNS).flat();
    return !topTypes.some((t) =>
      knownPatterns.some((p) => t.includes(p)),
    );
  }
  const patterns = ACCIDENT_TYPE_PATTERNS[filter];
  return topTypes.some((t) => patterns.some((p) => t.includes(p)));
}

function matchesQuery(
  hay: { label: string; tagline: string; topTypes: string[] },
  q: string,
): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (hay.label.toLowerCase().includes(needle)) return true;
  if (hay.tagline.toLowerCase().includes(needle)) return true;
  return hay.topTypes.some((t) => t.toLowerCase().includes(needle));
}

function matchesMonth(peakMonths: number[], month: number): boolean {
  if (month === 0) return true;
  return peakMonths.includes(month);
}

export function filterIndustries(
  industries: AllIndustriesSummary["industries"],
  filter: HubFilterState,
): AllIndustriesSummary["industries"] {
  return industries.filter((it) => {
    if (!matchesQuery(it, filter.q)) return false;
    if (!matchesType(it.topTypes, filter.type)) return false;
    if (!matchesMonth(it.peakMonths, filter.month)) return false;
    return true;
  });
}

export function describeActiveFilters(filter: HubFilterState): string[] {
  const parts: string[] = [];
  if (filter.q.trim()) parts.push(`検索「${filter.q.trim()}」`);
  if (filter.type !== "all") parts.push(`事故型「${ACCIDENT_TYPE_LABELS[filter.type]}」`);
  if (filter.month !== 0) parts.push(`月「${filter.month}月」`);
  return parts;
}
