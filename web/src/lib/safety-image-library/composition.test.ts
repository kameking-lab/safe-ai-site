import { describe, expect, it } from "vitest";
import { SAFETY_SIGN_OUTPUT_SIZES, outputSizePixels } from "@/data/safety-image-library/sizes";
import { getSafetyImageComposition } from "./composition";

describe("multilingual sign composition", () => {
  it("keeps artwork and translations in separate, nonzero regions for every size and text position", () => {
    for (const size of SAFETY_SIGN_OUTPUT_SIZES) {
      const dimensions = outputSizePixels(size.id);
      for (const position of ["top", "center", "bottom"] as const) {
        for (const brand of [true, false]) {
          const { artwork, text } = getSafetyImageComposition(dimensions, {
            mode: "edited", languages: ["ja", "vi", "zh-CN", "en", "id"], position, brand,
          });
          for (const region of [artwork, text]) {
            expect(region.width).toBeGreaterThan(0);
            expect(region.height).toBeGreaterThan(0);
            expect(region.x).toBeGreaterThanOrEqual(0);
            expect(region.y).toBeGreaterThanOrEqual(0);
            expect(region.x + region.width).toBeLessThanOrEqual(dimensions.width);
            expect(region.y + region.height).toBeLessThanOrEqual(dimensions.height);
          }
          const overlapWidth = Math.max(0, Math.min(artwork.x + artwork.width, text.x + text.width) - Math.max(artwork.x, text.x));
          const overlapHeight = Math.max(0, Math.min(artwork.y + artwork.height, text.y + text.height) - Math.max(artwork.y, text.y));
          expect(overlapWidth * overlapHeight, `${size.id}/${position}`).toBe(0);
          expect(artwork.width * artwork.height / (dimensions.width * dimensions.height)).toBeGreaterThan(0.35);
          expect(text.width * text.height / (dimensions.width * dimensions.height)).toBeGreaterThan(0.35);
        }
      }
    }
  });

  it("preserves the complete original canvas for Japanese-only and clean exports", () => {
    const dimensions = outputSizePixels("a4-landscape");
    for (const options of [{ mode: "edited" as const, languages: ["ja"] }, { mode: "clean" as const, languages: ["ja", "en"] }]) {
      const regions = getSafetyImageComposition(dimensions, { ...options, position: "top", brand: true });
      expect(regions.artwork).toEqual({ x: 0, y: 0, ...dimensions });
      expect(regions.text).toEqual(regions.artwork);
    }
  });
});
