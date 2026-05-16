import { describe, expect, it } from "vitest";
import {
  SAFETY_SIGNS,
  SIGN_CATEGORIES,
  SIGN_COUNT_BY_CATEGORY,
  SIGN_TOTAL_COUNT,
  getCategoryDescriptor,
  getSignById,
  getSignsByCategory,
  getSignsForIndustry,
} from ".";
import { INDUSTRIES, getIndustrySigns } from "./industry-usage";
import type { SignCategory } from "@/types/safety-sign";

describe("safety sign catalogue", () => {
  it("reaches the documented total of 110 signs", () => {
    expect(SIGN_TOTAL_COUNT).toBe(110);
    expect(SAFETY_SIGNS).toHaveLength(110);
  });

  it("matches the per-category breakdown in the spec", () => {
    expect(SIGN_COUNT_BY_CATEGORY.prohibition).toBe(30);
    expect(SIGN_COUNT_BY_CATEGORY.warning).toBe(30);
    expect(SIGN_COUNT_BY_CATEGORY.mandatory).toBe(20);
    expect(SIGN_COUNT_BY_CATEGORY["safe-condition"]).toBe(20);
    expect(SIGN_COUNT_BY_CATEGORY["fire-safety"]).toBe(10);
  });

  it("has unique sign ids", () => {
    const ids = SAFETY_SIGNS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique pictogram ids", () => {
    const ids = SAFETY_SIGNS.map((s) => s.pictogramId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns descriptors for every category", () => {
    for (const c of SIGN_CATEGORIES) {
      expect(getCategoryDescriptor(c.id).id).toBe(c.id);
    }
  });

  it("filters signs by category correctly", () => {
    for (const c of SIGN_CATEGORIES) {
      const signs = getSignsByCategory(c.id);
      expect(signs.length).toBe(SIGN_COUNT_BY_CATEGORY[c.id]);
      expect(signs.every((s) => s.category === c.id)).toBe(true);
    }
  });

  it("resolves individual signs by id", () => {
    expect(getSignById("no-entry")?.name).toBe("立入禁止");
    expect(getSignById("does-not-exist")).toBeUndefined();
  });

  it("aligns the visual category convention with sign records", () => {
    const SHAPE_BY_CATEGORY: Record<SignCategory, string[]> = {
      prohibition: ["circle-bar"],
      warning: ["triangle"],
      mandatory: ["circle"],
      "safe-condition": ["square"],
      "fire-safety": ["square"],
    };
    for (const sign of SAFETY_SIGNS) {
      expect(
        SHAPE_BY_CATEGORY[sign.category],
        `${sign.id} shape ${sign.shape} not allowed for ${sign.category}`,
      ).toContain(sign.shape);
    }
  });

  it("cites at least one related law for every sign", () => {
    for (const sign of SAFETY_SIGNS) {
      expect(sign.relatedLaws.length, `${sign.id} has no related laws`).toBeGreaterThan(0);
      for (const law of sign.relatedLaws) {
        expect(law.statute.length).toBeGreaterThan(0);
        expect(law.note.length).toBeGreaterThan(0);
      }
    }
  });

  it("cites at least one source standard per sign", () => {
    for (const sign of SAFETY_SIGNS) {
      expect(sign.references.length, `${sign.id} references`).toBeGreaterThan(0);
      expect(sign.references[0]?.standard).toMatch(/JIS|ISO/);
    }
  });

  it("has industry usage for every sign", () => {
    for (const sign of SAFETY_SIGNS) {
      expect(sign.industryUsage.length, `${sign.id} industry usage`).toBeGreaterThan(0);
    }
  });

  it("places sign mounting heights in a plausible range", () => {
    for (const sign of SAFETY_SIGNS) {
      const { min, max } = sign.placement.heightMm;
      expect(min, sign.id).toBeGreaterThanOrEqual(600);
      expect(max, sign.id).toBeLessThanOrEqual(2700);
      expect(max, sign.id).toBeGreaterThanOrEqual(min);
    }
  });
});

describe("industry-sign matrix", () => {
  it("returns entries for every declared industry", () => {
    for (const ind of INDUSTRIES) {
      const entries = getIndustrySigns(ind.id);
      expect(entries.length, ind.id).toBeGreaterThan(0);
    }
  });

  it("getSignsForIndustry mirrors getIndustrySigns", () => {
    for (const ind of INDUSTRIES) {
      const a = getSignsForIndustry(ind.id).map((s) => s.id).sort();
      const b = getIndustrySigns(ind.id).map((e) => e.signId).sort();
      expect(a).toEqual(b);
    }
  });

  it("every required entry refers to a sign that exists", () => {
    for (const ind of INDUSTRIES) {
      const entries = getIndustrySigns(ind.id);
      for (const e of entries) {
        expect(getSignById(e.signId), `${ind.id}: ${e.signId}`).toBeDefined();
      }
    }
  });

  it("flags construction as a required user of fall-arrest harness signs", () => {
    const entries = getIndustrySigns("construction");
    const harness = entries.find((e) => e.signId === "mand-harness");
    expect(harness?.requirement).toBe("required");
  });
});
