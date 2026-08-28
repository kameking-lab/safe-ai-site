import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import generationLedgerRaw from "./generation-ledger.json";
import generatedManifestRaw from "./generated-manifest.json";
import layoutsRaw from "./layouts.json";
import marketRegistry from "./market-themes.json";
import qaRaw from "./qa.json";
import texts from "./texts.json";
import translationRegistry from "./translation-registry.json";
import {
  SAFETY_IMAGE_CATEGORIES,
  SAFETY_IMAGE_LANGUAGES,
  SAFETY_IMAGE_THEMES,
} from "./index";
import {
  LEGACY_SAFETY_IMAGE_REDIRECTS,
  LEGACY_SAFETY_IMAGE_SLUGS,
} from "./legacy";

type GenerationLedger = {
  schemaVersion: string;
  summary: { totalGenerationCalls: number };
  items: Array<{
    slug: string;
    sourceFile: string;
    checksum: string;
    prompt: string;
    generationCount: number;
    exceptionalRegenerationApproved?: true;
    generationMethod: string;
    rightsStatus: string;
  }>;
};
type GeneratedManifest = {
  summary: {
    generatedCleanMasters: number;
    generatedPreviews: number;
    uniqueChecksums: number;
    embeddedTextPolicy: string;
  };
  items: Array<{ published: boolean }>;
};
type QaRegistry = {
  schemaVersion: string;
  items: Array<{
    slug: string;
    result: string;
    anatomyQa: string;
    ppeQa: string;
    equipmentQa: string;
    marketFitQa: string;
    textFreeQa: string;
    stickFigureQa: string;
    svgPersonQa: string;
    externalLogoQa: string;
    themeMatchQa: string;
    textSpaceQa: string;
    rightsStatus: string;
  }>;
};

const generationLedger = generationLedgerRaw as unknown as GenerationLedger;
const generatedManifest = generatedManifestRaw as unknown as GeneratedManifest;
const qa = qaRaw as unknown as QaRegistry;
const layouts = layoutsRaw as unknown as { themes: Record<string, unknown> };

const originalsDirectory = join(process.cwd(), "public", "safety-images", "library", "originals");
const previewsDirectory = join(process.cwd(), "public", "safety-images", "library", "previews");

describe("market-grounded safety sign library", () => {
  it("publishes exactly 100 distinct themes in the approved market split", () => {
    expect(SAFETY_IMAGE_THEMES).toHaveLength(100);
    expect(new Set(SAFETY_IMAGE_THEMES.map((theme) => theme.slug)).size).toBe(100);
    expect(new Set(SAFETY_IMAGE_THEMES.map((theme) => theme.title)).size).toBe(100);
    expect(Object.fromEntries(SAFETY_IMAGE_CATEGORIES.map((category) => [
      category.id,
      SAFETY_IMAGE_THEMES.filter((theme) => theme.category === category.id).length,
    ]))).toEqual({
      "protective-equipment": 15,
      "entry-prohibition": 15,
      "hazard-warning": 25,
      "work-status": 15,
      "traffic-guidance": 10,
      "editable-numeric": 10,
      "heat-emergency": 10,
    });
    expect(marketRegistry.inventoryCount).toBe(100);
    expect(marketRegistry.productObservationCount).toBeGreaterThanOrEqual(120);
    expect(marketRegistry.vendorCount).toBeGreaterThanOrEqual(8);
    expect(marketRegistry.multiVendorThemeCount).toBeGreaterThanOrEqual(80);
  });

  it("retains exactly 100 unique raster masters and 100 optimized previews", () => {
    const originalFiles = readdirSync(originalsDirectory).filter((file) => file.endsWith(".png"));
    const previewFiles = readdirSync(previewsDirectory).filter((file) => file.endsWith(".webp"));
    const expectedPngs = SAFETY_IMAGE_THEMES.map((theme) => `${theme.slug}.png`).sort();
    const expectedWebps = SAFETY_IMAGE_THEMES.map((theme) => `${theme.slug}.webp`).sort();
    expect(originalFiles.sort()).toEqual(expectedPngs);
    expect(previewFiles.sort()).toEqual(expectedWebps);
    expect(generatedManifest.summary.generatedCleanMasters).toBe(100);
    expect(generatedManifest.summary.generatedPreviews).toBe(100);
    expect(generatedManifest.summary.uniqueChecksums).toBe(100);
    expect(generatedManifest.items).toHaveLength(100);
    expect(generatedManifest.items.every((item) => item.published)).toBe(true);
  });

  it("binds every master to a short image-generation prompt and immutable checksum", () => {
    expect(generationLedger.schemaVersion).toBe("safety-sign-generation-ledger-v2");
    expect(generationLedger.items).toHaveLength(100);
    const checksums = new Set<string>();
    for (const item of generationLedger.items) {
      const source = join(process.cwd(), item.sourceFile);
      expect(existsSync(source), item.slug).toBe(true);
      const checksum = createHash("sha256").update(readFileSync(source)).digest("hex");
      expect(checksum, item.slug).toBe(item.checksum);
      expect(item.prompt.length, item.slug).toBeLessThanOrEqual(250);
      expect(item.prompt.split(/[。！？!?]/u).filter(Boolean).length, item.slug).toBeLessThanOrEqual(3);
      expect(item.generationCount, item.slug).toBeGreaterThanOrEqual(1);
      expect(item.generationCount, item.slug).toBeLessThanOrEqual(3);
      expect(
        item.generationCount === 3 ? item.exceptionalRegenerationApproved : true,
        item.slug,
      ).toBe(true);
      expect(item.generationMethod).toBe("OpenAI image generation");
      expect(item.rightsStatus).toBe("portal-owned-commercial-editable");
      checksums.add(checksum);
    }
    expect(checksums.size).toBe(100);
    expect(generationLedger.summary.totalGenerationCalls).toBe(
      generationLedger.items.reduce((sum, item) => sum + item.generationCount, 0),
    );
  });

  it("records pass results for anatomy, PPE, equipment, market fit, text and rights QA", () => {
    expect(qa.schemaVersion).toBe("safety-sign-qa-v2");
    expect(qa.items).toHaveLength(100);
    for (const item of qa.items) {
      expect(item.result, item.slug).toBe("pass");
      expect(["pass", "not-applicable"]).toContain(item.anatomyQa);
      expect(["pass", "not-applicable"]).toContain(item.ppeQa);
      expect(["pass", "not-applicable"]).toContain(item.equipmentQa);
      expect(item.marketFitQa).toBe("pass");
      expect(item.textFreeQa).toBe("pass");
      expect(item.stickFigureQa).toBe("pass");
      expect(item.svgPersonQa).toBe("pass");
      expect(item.externalLogoQa).toBe("pass");
      expect(item.themeMatchQa).toBe("pass");
      expect(item.textSpaceQa).toBe("pass");
      expect(item.rightsStatus).toBe("portal-owned-commercial-editable");
    }
    expect(generatedManifest.summary.embeddedTextPolicy).toBe("none");
  });

  it("provides five post-production language layers and exactly ten numeric templates", () => {
    expect(SAFETY_IMAGE_LANGUAGES).toEqual(["ja", "en", "vi", "zh-CN", "id"]);
    for (const theme of SAFETY_IMAGE_THEMES) {
      expect(Object.keys(theme.texts)).toEqual(SAFETY_IMAGE_LANGUAGES);
      const sourceTexts = texts[theme.slug as keyof typeof texts];
      if (theme.editableNumber) {
        expect(Object.values(sourceTexts).every((value) => value.includes("{value}"))).toBe(true);
      } else {
        expect(sourceTexts).toEqual(theme.texts);
      }
      expect(Object.values(theme.texts).every((value) => value.trim().length > 0)).toBe(true);
      expect(Object.values(theme.texts).every((value) => !value.includes("{value}"))).toBe(true);
    }
    expect(SAFETY_IMAGE_THEMES.filter((theme) => theme.editableNumber)).toHaveLength(10);
    expect(translationRegistry.summary.wordingRecords).toBe(500);
    expect(translationRegistry.summary.numericTemplates).toBe(10);
    expect(translationRegistry.nativeReviewClaimed).toBe(false);
    expect(layouts.themes).toHaveProperty("helmet-required");
    expect(Object.keys(layouts.themes)).toHaveLength(100);
  });

  it("has no legacy SVG-person output and explicitly handles all retired detail routes", () => {
    const files = [
      ...readdirSync(originalsDirectory),
      ...readdirSync(previewsDirectory),
    ];
    expect(files.some((file) => file.endsWith(".svg"))).toBe(false);
    expect(files.some((file) => /stick|stickman|棒人間/iu.test(file))).toBe(false);
    expect(LEGACY_SAFETY_IMAGE_SLUGS.size).toBe(86);
    for (const target of LEGACY_SAFETY_IMAGE_REDIRECTS.values()) {
      expect(SAFETY_IMAGE_THEMES.some((theme) => theme.slug === target), target).toBe(true);
    }
  });
});
