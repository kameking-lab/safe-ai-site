import { describe, expect, it } from "vitest";
import {
  defaultOutputSize,
  getSafetySignOutputSize,
  outputSizePixels,
  SAFETY_SIGN_OUTPUT_SIZES,
} from "./sizes";

describe("safety sign output sizes", () => {
  it("offers A4/A3 and the requested market formats without duplicates", () => {
    expect(SAFETY_SIGN_OUTPUT_SIZES).toHaveLength(13);
    expect(new Set(SAFETY_SIGN_OUTPUT_SIZES.map((size) => size.id)).size).toBe(13);
    expect(getSafetySignOutputSize("banner-450x1800")).toMatchObject({ widthMm: 450, heightMm: 1800 });
    expect(getSafetySignOutputSize("flat-450x600")).toMatchObject({ widthMm: 450, heightMm: 600 });
    expect(getSafetySignOutputSize("stand-550x1400")).toMatchObject({ widthMm: 550, heightMm: 1400 });
  });

  it("converts physical sizes to 300dpi pixels", () => {
    expect(outputSizePixels("a4-portrait")).toEqual({ width: 2480, height: 3508 });
    expect(outputSizePixels("flat-450x300")).toEqual({ width: 5315, height: 3543 });
  });

  it("maps a theme's recommended size to a supported output", () => {
    expect(defaultOutputSize("450×1800mm", "portrait")).toBe("banner-450x1800");
    expect(defaultOutputSize("1400×550mm", "portrait")).toBe("stand-550x1400");
    expect(defaultOutputSize("450×450mm", "square")).toBe("square-450");
    expect(defaultOutputSize("A4相当", "landscape")).toBe("a4-landscape");
  });
});
