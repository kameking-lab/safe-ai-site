import { describe, expect, it } from "vitest";
import config from "../../next.config";
import { SERIOUS_CASES_META, filterSeriousCasesPage } from "@/lib/accident-news/serious-cases";
import { loadCombinedCases } from "@/lib/accidents-analytics/loader";
import { OFFICIAL_ACCIDENT_SNAPSHOT as snapshot } from "@/data/accidents/official-current";
import { buildHomeAccidentPreview } from "@/lib/home/effect-first-data";

describe("portal source and route consistency", () => {
  it("consolidates the hub while preserving legacy detail inputs and bookmarks", async () => {
    const redirects = (await config.redirects!()).filter((entry) => entry.source.startsWith("/construction-calc"));
    expect(redirects).toHaveLength(1);
    expect(redirects[0]?.destination).toBe("/tools/construction-calculators");
    expect(redirects[0]?.source).toBe("/construction-calc");
    expect(redirects[0]?.permanent).toBe(true);
    expect(redirects.some((entry) => entry.source.includes("sling"))).toBe(false);
  });
  it("uses the same official death-record IDs and years for search and analytics", () => {
    const search = filterSeriousCasesPage({ limit: 10_000 });
    const analysis = loadCombinedCases().filter((record) => record.source !== "curated");
    expect(new Set(search.cases.map((record) => record.id))).toEqual(new Set(analysis.map((record) => record.id)));
    expect(SERIOUS_CASES_META.total).toBe(4782);
    expect(SERIOUS_CASES_META.yearRange).toBe("2019〜2024年");
    expect(SERIOUS_CASES_META.sources.map((source) => source.total)).toEqual([4043, 739]);
    expect(SERIOUS_CASES_META.sources[1]?.url).toContain("anst00_r06.html");
    expect(SERIOUS_CASES_META.coverageNote).toContain("集計の仕組みが異なる");
    expect(filterSeriousCasesPage({ year: 2024 }).total).toBe(739);
    expect(search.cases[0]?.description).toBe("この収録データに発生状況の本文はありません。");
  });
  it("keeps homepage counts, source and verification date on the same monthly edition", () => {
    const preview = buildHomeAccidentPreview().featured;
    expect(preview.deaths).toBe(snapshot.deaths.total);
    expect(preview.injuries).toBe(snapshot.injuries.total);
    expect(preview.sourceUrl).toBe(snapshot.sourcePdfUrl);
    expect(preview.checkedAt).toBe(snapshot.verifiedAt);
    expect(snapshot.deaths.total - snapshot.deaths.previousYearSamePeriod).toBe(snapshot.deaths.change);
    expect(snapshot.injuries.total - snapshot.injuries.previousYearSamePeriod).toBe(snapshot.injuries.change);
  });
});
