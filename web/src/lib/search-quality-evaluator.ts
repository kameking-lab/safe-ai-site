import { searchItems, type SearchItem } from "./search-index";
import type { SearchGoldCase } from "@/data/search-quality-gold-2026-07-24";

export type SearchQualityInputCase = Omit<
  SearchGoldCase,
  "domain" | "reviewedAt"
> & {
  domain: string;
  reviewedAt: string;
  officialLanding?: string;
  officialBasis?: string;
};

export type SearchQualityCaseResult = {
  id: string;
  domain: string;
  query: string;
  returnedIds: string[];
  relevantAt5: number;
  relevantAt10: number;
  precisionAt5: number;
  precisionAt10: number;
  reciprocalRank: number;
  zeroExpected: boolean;
  zeroValid: boolean | null;
  dangerousMiss: boolean;
  missingPrimaryIds: string[];
  officialLandingExpected: string | null;
  officialLandingValid: boolean | null;
  officialLandingMatched: boolean | null;
  officialLandingMatchIds: string[];
  untrustedRelevantIds: string[];
};

export type SearchQualityResult = {
  evaluatedAt: string;
  cases: SearchQualityCaseResult[];
  precisionAt5: number;
  precisionAt10: number;
  mrr: number;
  zeroResultValidity: number;
  dangerousMisses: string[];
  officialLandingCoverage: number | null;
  precisionCeilingAt5: number;
  precisionCeilingAt10: number;
  eligiblePrecisionCeilingAt5: number;
  eligiblePrecisionCeilingAt10: number;
  precisionAt5TargetMet: boolean;
  precisionAt10TargetMet: boolean;
  byDomain: Record<
    string,
    { cases: number; precisionAt5: number; precisionAt10: number; mrr: number }
  >;
};

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function isOfficialDestination(value: string): boolean {
  const normalized = normalizedUrl(value);
  if (!normalized) return false;
  const hostname = new URL(normalized).hostname;
  return (
    hostname === "jisha.or.jp" ||
    hostname.endsWith(".jisha.or.jp") ||
    hostname === "jaish.gr.jp" ||
    hostname.endsWith(".jaish.gr.jp") ||
    hostname === "go.jp" ||
    hostname.endsWith(".go.jp")
  );
}

function itemOfficialDestinations(item: SearchItem): string[] {
  return [
    ...(item.officialDestinations ?? []),
    ...(item.sourceUrl ? [item.sourceUrl] : []),
  ];
}

export function evaluateSearchQuality(
  index: SearchItem[],
  gold: readonly SearchQualityInputCase[],
  evaluatedAt = new Date().toISOString(),
): SearchQualityResult {
  const cases = gold.map((goldCase): SearchQualityCaseResult => {
    const returned = searchItems(index, goldCase.query, "all", 10);
    const returnedIds = returned.map((item) => item.id);
    const relevant = new Set(goldCase.relevantIds);
    const relevantAt5 = returnedIds.slice(0, 5).filter((id) => relevant.has(id)).length;
    const relevantAt10 = returnedIds.filter((id) => relevant.has(id)).length;
    const firstRelevantIndex = returnedIds.findIndex((id) => relevant.has(id));
    const zeroValid = goldCase.zeroExpected ? returnedIds.length === 0 : null;
    const missingPrimaryIds = (goldCase.primaryRequiredIds ?? []).filter(
      (id) => !returnedIds.includes(id),
    );
    const officialLandingExpected = goldCase.officialLanding ?? null;
    const normalizedLanding = officialLandingExpected
      ? normalizedUrl(officialLandingExpected)
      : null;
    const officialLandingValid =
      officialLandingExpected && !goldCase.zeroExpected
        ? isOfficialDestination(officialLandingExpected)
        : null;
    const officialLandingMatchIds =
      normalizedLanding && !goldCase.zeroExpected
        ? returned
            .filter((item) => relevant.has(item.id))
            .filter((item) =>
              itemOfficialDestinations(item).some(
                (candidate) => normalizedUrl(candidate) === normalizedLanding,
              ),
            )
            .map((item) => item.id)
        : [];
    const officialLandingMatched =
      officialLandingValid === null
        ? null
        : officialLandingValid && officialLandingMatchIds.length > 0;
    const untrustedRelevantIds = returned
      .filter((item) => relevant.has(item.id))
      .filter(
        (item) =>
          item.verification === "quarantine" ||
          item.provenance === "synthetic" ||
          item.informationKind === "synthetic",
      )
      .map((item) => item.id);
    return {
      id: goldCase.id,
      domain: goldCase.domain,
      query: goldCase.query,
      returnedIds,
      relevantAt5,
      relevantAt10,
      precisionAt5: relevantAt5 / 5,
      precisionAt10: relevantAt10 / 10,
      reciprocalRank: firstRelevantIndex >= 0 ? 1 / (firstRelevantIndex + 1) : 0,
      zeroExpected: goldCase.zeroExpected ?? false,
      zeroValid,
      dangerousMiss:
        Boolean(goldCase.dangerousIfMissing) &&
        (firstRelevantIndex < 0 ||
          missingPrimaryIds.length > 0 ||
          officialLandingMatched === false ||
          untrustedRelevantIds.length > 0),
      missingPrimaryIds,
      officialLandingExpected,
      officialLandingValid,
      officialLandingMatched,
      officialLandingMatchIds,
      untrustedRelevantIds,
    };
  });

  const positiveCases = cases.filter((result) => !result.zeroExpected);
  const zeroCases = cases.filter((result) => result.zeroExpected);
  const domains = [...new Set(positiveCases.map((result) => result.domain))];
  const byDomain = Object.fromEntries(
    domains.map((domain) => {
      const domainCases = positiveCases.filter((result) => result.domain === domain);
      return [
        domain,
        {
          cases: domainCases.length,
          precisionAt5: mean(domainCases.map((result) => result.precisionAt5)),
          precisionAt10: mean(domainCases.map((result) => result.precisionAt10)),
          mrr: mean(domainCases.map((result) => result.reciprocalRank)),
        },
      ];
    }),
  );
  const officialCases = positiveCases.filter(
    (result) => result.officialLandingExpected !== null,
  );
  const precisionCeilingAt5 = mean(
    gold
      .filter((item) => !item.zeroExpected)
      .map((item) => Math.min(5, new Set(item.relevantIds).size) / 5),
  );
  const precisionCeilingAt10 = mean(
    gold
      .filter((item) => !item.zeroExpected)
      .map((item) => Math.min(10, new Set(item.relevantIds).size) / 10),
  );
  const eligibleIds = new Set(
    index
      .filter(
        (item) =>
          item.verification !== "quarantine" &&
          item.provenance !== "synthetic" &&
          item.informationKind !== "synthetic",
      )
      .map((item) => item.id),
  );
  const eligiblePrecisionCeilingAt5 = mean(
    gold
      .filter((item) => !item.zeroExpected)
      .map(
        (item) =>
          Math.min(
            5,
            new Set(item.relevantIds.filter((id) => eligibleIds.has(id))).size,
          ) / 5,
      ),
  );
  const eligiblePrecisionCeilingAt10 = mean(
    gold
      .filter((item) => !item.zeroExpected)
      .map(
        (item) =>
          Math.min(
            10,
            new Set(item.relevantIds.filter((id) => eligibleIds.has(id))).size,
          ) / 10,
      ),
  );
  const precisionAt5 = mean(
    positiveCases.map((result) => result.precisionAt5),
  );
  const precisionAt10 = mean(
    positiveCases.map((result) => result.precisionAt10),
  );

  return {
    evaluatedAt,
    cases,
    precisionAt5,
    precisionAt10,
    mrr: mean(positiveCases.map((result) => result.reciprocalRank)),
    zeroResultValidity: mean(zeroCases.map((result) => (result.zeroValid ? 1 : 0))),
    dangerousMisses: cases.filter((result) => result.dangerousMiss).map((result) => result.id),
    officialLandingCoverage:
      officialCases.length === 0
        ? null
        : mean(
            officialCases.map((result) =>
              result.officialLandingMatched ? 1 : 0,
            ),
          ),
    precisionCeilingAt5,
    precisionCeilingAt10,
    eligiblePrecisionCeilingAt5,
    eligiblePrecisionCeilingAt10,
    precisionAt5TargetMet: precisionAt5 >= 0.55,
    precisionAt10TargetMet: precisionAt10 >= 0.35,
    byDomain,
  };
}
