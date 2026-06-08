import { describe, expect, it } from "vitest";
import {
  asbestosScopeFromParams,
  asbestosScopeToQuery,
  hasAsbestosScopeParams,
  type AsbestosScopeFormValues,
} from "./asbestos-scope-query";

const DEFAULTS: AsbestosScopeFormValues = {
  buildingCategory: "non-residential",
  projectCategory: "demolition",
  constructionStartYear: 1995,
  contractValueJpyMan: 500,
  workAreaSqm: 150,
  asbestosKnownPresent: false,
  workLevel: "level-2",
};

/** Helper: build a getter from a query string. */
function getterFor(query: string): (k: string) => string | null {
  const params = new URLSearchParams(query);
  return (k) => params.get(k);
}

describe("asbestosScopeToQuery", () => {
  it("emits all scalar fields and the level/known flags when set", () => {
    const q = asbestosScopeToQuery({
      buildingCategory: "residential-multi",
      projectCategory: "renovation",
      constructionStartYear: 1990,
      contractValueJpyMan: 800,
      workAreaSqm: 300,
      asbestosKnownPresent: true,
      workLevel: "level-1",
    });
    const params = new URLSearchParams(q);
    expect(params.get("b")).toBe("residential-multi");
    expect(params.get("p")).toBe("renovation");
    expect(params.get("y")).toBe("1990");
    expect(params.get("c")).toBe("800");
    expect(params.get("a")).toBe("300");
    expect(params.get("k")).toBe("1");
    expect(params.get("l")).toBe("level-1");
  });

  it("omits k when not known and l when level is unset", () => {
    const q = asbestosScopeToQuery({
      buildingCategory: "non-residential",
      projectCategory: "demolition",
      constructionStartYear: 1995,
      contractValueJpyMan: 500,
      workAreaSqm: 150,
      asbestosKnownPresent: false,
      workLevel: "",
    });
    const params = new URLSearchParams(q);
    expect(params.has("k")).toBe(false);
    expect(params.has("l")).toBe(false);
    expect(params.get("b")).toBe("non-residential");
  });
});

describe("asbestosScopeFromParams", () => {
  it("round-trips the exact scope a user entered in Step 1", () => {
    const original = {
      buildingCategory: "residential-multi" as const,
      projectCategory: "renovation" as const,
      constructionStartYear: 1990,
      contractValueJpyMan: 800,
      workAreaSqm: 300,
      asbestosKnownPresent: true,
      workLevel: "level-1" as const,
    };
    const parsed = asbestosScopeFromParams(
      getterFor(asbestosScopeToQuery(original)),
      DEFAULTS,
    );
    expect(parsed).toEqual(original);
  });

  it("falls back to defaults when no params are present (direct visit)", () => {
    const parsed = asbestosScopeFromParams(getterFor(""), DEFAULTS);
    expect(parsed).toEqual(DEFAULTS);
  });

  it("rejects unknown enum values and keeps defaults", () => {
    const parsed = asbestosScopeFromParams(
      getterFor("b=mansion&p=teardown&l=level-9"),
      DEFAULTS,
    );
    expect(parsed.buildingCategory).toBe(DEFAULTS.buildingCategory);
    expect(parsed.projectCategory).toBe(DEFAULTS.projectCategory);
    expect(parsed.workLevel).toBe(DEFAULTS.workLevel);
  });

  it("falls back to default numbers when fields are non-numeric", () => {
    const parsed = asbestosScopeFromParams(
      getterFor("y=abc&c=&a=NaN"),
      DEFAULTS,
    );
    expect(parsed.constructionStartYear).toBe(DEFAULTS.constructionStartYear);
    expect(parsed.contractValueJpyMan).toBe(DEFAULTS.contractValueJpyMan);
    expect(parsed.workAreaSqm).toBe(DEFAULTS.workAreaSqm);
  });

  it("clamps out-of-range numbers instead of crashing", () => {
    const parsed = asbestosScopeFromParams(
      getterFor("y=1200&c=-50&a=-3"),
      DEFAULTS,
    );
    expect(parsed.constructionStartYear).toBe(1900); // clamped to YEAR_MIN
    expect(parsed.contractValueJpyMan).toBe(0); // clamped to 0
    expect(parsed.workAreaSqm).toBe(0);
  });

  it("treats k=1 as known and any other value as not known", () => {
    expect(
      asbestosScopeFromParams(getterFor("k=1"), DEFAULTS).asbestosKnownPresent,
    ).toBe(true);
    expect(
      asbestosScopeFromParams(getterFor("k=0"), DEFAULTS).asbestosKnownPresent,
    ).toBe(false);
    expect(
      asbestosScopeFromParams(getterFor("k=true"), DEFAULTS)
        .asbestosKnownPresent,
    ).toBe(false);
  });
});

describe("hasAsbestosScopeParams", () => {
  it("is true when at least one scope key carries a value", () => {
    expect(hasAsbestosScopeParams(getterFor("p=renovation"))).toBe(true);
    expect(hasAsbestosScopeParams(getterFor("c=800"))).toBe(true);
  });

  it("is false for an empty query or unrelated keys", () => {
    expect(hasAsbestosScopeParams(getterFor(""))).toBe(false);
    expect(hasAsbestosScopeParams(getterFor("foo=bar"))).toBe(false);
    expect(hasAsbestosScopeParams(getterFor("b="))).toBe(false);
  });
});
