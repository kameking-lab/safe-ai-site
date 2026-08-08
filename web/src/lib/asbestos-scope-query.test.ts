import { describe, expect, it } from "vitest";
import {
  asbestosScopeFromParams,
  clearAsbestosScopeHandoffForTest,
  consumeAsbestosScopeHandoff,
  hasAsbestosScopeParams,
  putAsbestosScopeHandoff,
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

describe("asbestos scope transient handoff", () => {
  it("carries the scope once without creating a query string", () => {
    clearAsbestosScopeHandoffForTest();
    const scope: AsbestosScopeFormValues = {
      buildingCategory: "residential-multi",
      projectCategory: "renovation",
      constructionStartYear: 1990,
      contractValueJpyMan: 800,
      workAreaSqm: 300,
      asbestosKnownPresent: true,
      workLevel: "level-1",
    };
    putAsbestosScopeHandoff(scope);
    expect(consumeAsbestosScopeHandoff()).toEqual(scope);
    expect(consumeAsbestosScopeHandoff()).toBeNull();
  });
});

describe("asbestosScopeFromParams", () => {
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
