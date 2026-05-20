import { describe, expect, it } from "vitest";
import {
  describeActiveFilters,
  filterIndustries,
  parseAccidentTypeFilter,
  parseMonthFilter,
} from "./accidents-reports-filter";
import type { AllIndustriesSummary } from "@/lib/accident-analysis";

type Industry = AllIndustriesSummary["industries"][number];

function makeIndustry(overrides: Partial<Industry> = {}): Industry {
  return {
    slug: "construction",
    label: "建設業",
    icon: "🏗",
    tagline: "墜落・転落の多い業種",
    colorClass: "amber",
    total: 1000,
    fatal: 50,
    topType: "墜落、転落",
    topTypes: ["墜落、転落", "転倒", "はさまれ・巻き込まれ"],
    peakMonths: [6, 7, 8],
    ...overrides,
  };
}

describe("parseAccidentTypeFilter", () => {
  it("defaults to 'all' on empty/null", () => {
    expect(parseAccidentTypeFilter(null)).toBe("all");
    expect(parseAccidentTypeFilter("")).toBe("all");
    expect(parseAccidentTypeFilter(undefined)).toBe("all");
  });
  it("accepts the known values", () => {
    expect(parseAccidentTypeFilter("fall")).toBe("fall");
    expect(parseAccidentTypeFilter("caught")).toBe("caught");
    expect(parseAccidentTypeFilter("trip")).toBe("trip");
    expect(parseAccidentTypeFilter("shock")).toBe("shock");
    expect(parseAccidentTypeFilter("other")).toBe("other");
  });
  it("ignores junk values", () => {
    expect(parseAccidentTypeFilter("nope")).toBe("all");
  });
});

describe("parseMonthFilter", () => {
  it("returns 0 for missing/invalid", () => {
    expect(parseMonthFilter(null)).toBe(0);
    expect(parseMonthFilter("")).toBe(0);
    expect(parseMonthFilter("nope")).toBe(0);
    expect(parseMonthFilter("0")).toBe(0);
    expect(parseMonthFilter("13")).toBe(0);
  });
  it("returns 1-12 for valid input", () => {
    expect(parseMonthFilter("1")).toBe(1);
    expect(parseMonthFilter("12")).toBe(12);
    expect(parseMonthFilter("7")).toBe(7);
  });
});

describe("filterIndustries", () => {
  const ind = [
    makeIndustry({
      slug: "construction",
      label: "建設業",
      tagline: "高所作業が多い",
      topTypes: ["墜落、転落", "飛来落下"],
      peakMonths: [6, 7, 8],
    }),
    makeIndustry({
      slug: "manufacturing",
      label: "製造業",
      tagline: "機械災害多発",
      topTypes: ["はさまれ・巻き込まれ", "切れ・こすれ"],
      peakMonths: [9, 10, 11],
    }),
    makeIndustry({
      slug: "service",
      label: "サービス業",
      tagline: "屋内転倒が多い",
      topTypes: ["転倒"],
      peakMonths: [1, 2, 12],
    }),
  ];

  it("returns all when filter is empty", () => {
    const out = filterIndustries(ind, { q: "", type: "all", month: 0 });
    expect(out).toHaveLength(3);
  });

  it("filters by free-text query against label/tagline/topTypes", () => {
    expect(filterIndustries(ind, { q: "足場", type: "all", month: 0 })).toHaveLength(0);
    expect(filterIndustries(ind, { q: "建設", type: "all", month: 0 })).toHaveLength(1);
    expect(filterIndustries(ind, { q: "転倒", type: "all", month: 0 })[0]?.slug).toBe(
      "service",
    );
  });

  it("filters by accident-type group", () => {
    const fallOnly = filterIndustries(ind, { q: "", type: "fall", month: 0 });
    expect(fallOnly.map((i) => i.slug)).toEqual(["construction"]);
    const caughtOnly = filterIndustries(ind, { q: "", type: "caught", month: 0 });
    expect(caughtOnly.map((i) => i.slug)).toEqual(["manufacturing"]);
  });

  it("filters by peak month", () => {
    const summer = filterIndustries(ind, { q: "", type: "all", month: 7 });
    expect(summer.map((i) => i.slug)).toEqual(["construction"]);
    const winter = filterIndustries(ind, { q: "", type: "all", month: 12 });
    expect(winter.map((i) => i.slug)).toEqual(["service"]);
  });

  it("combines all three filters with AND semantics", () => {
    const out = filterIndustries(ind, { q: "転倒", type: "trip", month: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("service");
    const conflict = filterIndustries(ind, { q: "転倒", type: "trip", month: 7 });
    expect(conflict).toHaveLength(0);
  });

  it("classifies 'other' as no match against the known patterns", () => {
    const odd = [
      makeIndustry({
        slug: "service",
        topTypes: ["交通事故"],
        peakMonths: [3],
      }),
    ];
    const out = filterIndustries(odd, { q: "", type: "other", month: 0 });
    expect(out).toHaveLength(1);
  });
});

describe("describeActiveFilters", () => {
  it("emits no descriptor when empty", () => {
    expect(describeActiveFilters({ q: "", type: "all", month: 0 })).toEqual([]);
  });
  it("describes each active dimension", () => {
    expect(
      describeActiveFilters({ q: "足場", type: "fall", month: 7 }),
    ).toEqual([
      "検索「足場」",
      "事故型「墜落・転落」",
      "月「7月」",
    ]);
  });
});
