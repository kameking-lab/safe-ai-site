import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import generationLedger from "./generation-ledger.json";
import generatedManifest from "./generated-manifest.json";
import qa from "./qa.json";
import overlayQa from "./overlay-qa.json";
import texts from "./texts.json";
import {
  SAFETY_IMAGE_CATEGORIES,
  SAFETY_IMAGE_LANGUAGES,
  SAFETY_IMAGE_THEMES,
} from "./index";

const originalsDirectory = join(
  process.cwd(),
  "public",
  "safety-images",
  "library",
  "originals",
);
const previewsDirectory = join(
  process.cwd(),
  "public",
  "safety-images",
  "library",
  "previews",
);

describe("formal safety image library manifest", () => {
  it("publishes the fixed 100 unique themes in the approved category split", () => {
    expect(SAFETY_IMAGE_THEMES).toHaveLength(100);
    expect(new Set(SAFETY_IMAGE_THEMES.map((theme) => theme.slug)).size).toBe(100);
    expect(new Set(SAFETY_IMAGE_THEMES.map((theme) => theme.title)).size).toBe(100);
    expect(
      Object.fromEntries(
        SAFETY_IMAGE_CATEGORIES.map((category) => [
          category.id,
          SAFETY_IMAGE_THEMES.filter((theme) => theme.category === category.id).length,
        ]),
      ),
    ).toEqual({
      "safety-signs": 45,
      rules: 20,
      "construction-illustrations": 20,
      "heat-health": 10,
      general: 5,
    });
    expect(generatedManifest.summary.generatedCleanMasters).toBe(100);
    expect(generatedManifest.summary.uniqueChecksums).toBe(100);
  });

  it("retains 100 unmodified generated PNG masters and 100 optimized previews", () => {
    const originals = readdirSync(originalsDirectory).filter((file) => file.endsWith(".png"));
    const previews = readdirSync(previewsDirectory).filter((file) => file.endsWith(".webp"));
    expect(originals).toHaveLength(100);
    expect(previews).toHaveLength(100);
    const checksums = new Set<string>();
    for (const item of generationLedger.items) {
      const master = join(process.cwd(), item.sourceFile);
      expect(existsSync(master), item.slug).toBe(true);
      const checksum = createHash("sha256").update(readFileSync(master)).digest("hex");
      expect(checksum, item.slug).toBe(item.checksum);
      expect(item.sourceFileUnmodified).toBe(true);
      expect(item.generationMethod).toBe("OpenAI image generation");
      expect(item.rightsStatus).toBe("portal-owned-commercial-editable");
      checksums.add(checksum);
    }
    expect(checksums.size).toBe(100);
  });

  it("records all generation and enlarged anatomy/PPE QA results", () => {
    expect(generationLedger.summary.totalGenerationCalls).toBe(121);
    expect(generationLedger.summary.totalRegenerations).toBe(21);
    expect(qa.items).toHaveLength(100);
    expect(qa.items.every((item) => item.result === "pass")).toBe(true);
    expect(
      qa.items.every(
        (item) =>
          item.checks.anatomy === "pass" &&
          item.checks.limbsAndFingers === "pass" &&
          item.checks.ppeFit === "pass" &&
          item.checks.noEmbeddedTextOrDigits === "pass" &&
          item.checks.noExternalLogo === "pass" &&
          item.checks.themeMatch === "pass",
      ),
    ).toBe(true);
    expect(generatedManifest.summary.embeddedTextPolicy).toBe("none");
  });

  it("provides byte-stable five-language presets and editable numeric templates", () => {
    expect(SAFETY_IMAGE_LANGUAGES).toEqual(["ja", "en", "vi", "zh-CN", "id"]);
    for (const theme of SAFETY_IMAGE_THEMES) {
      expect(Object.keys(theme.texts)).toEqual(SAFETY_IMAGE_LANGUAGES);
      expect(texts[theme.slug as keyof typeof texts]).toEqual(theme.texts);
      expect(Object.values(theme.texts).every((value) => value.trim().length > 0)).toBe(true);
    }
    expect(SAFETY_IMAGE_THEMES.find((theme) => theme.slug === "floor-load-limit")?.numericTemplate).toEqual({
      label: "制限荷重",
      placeholder: "○○",
      unit: "t/㎡",
    });
    expect(overlayQa.result).toBe("pass");
    expect(overlayQa.checks.vietnameseLatinExtendedGlyphs).toBe("pass");
    expect(overlayQa.findingClosed.status).toBe("closed");
  });

  it("contains no legacy stick-figure asset or manifest names", () => {
    const libraryPaths = [
      ...readdirSync(originalsDirectory),
      ...readdirSync(previewsDirectory),
      ...SAFETY_IMAGE_THEMES.map((theme) => theme.slug),
    ];
    expect(libraryPaths.some((value) => /stick|stickman|棒人間/iu.test(value))).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "safety-images", "generated-manifest.json"))).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "safety-images", "overlays", "brand-overlay.svg"))).toBe(false);
  });
});
