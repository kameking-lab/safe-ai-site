import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  SAFETY_IMAGE_LANGUAGES,
  getSafetyImageTheme,
} from "@/data/safety-image-library";
import {
  buildSafetyImagePdf,
  renderSafetyImage,
  type SafetyImageRenderSettings,
} from "./renderer";

const helmet = getSafetyImageTheme("helmet-required")!;
const assetRoot = join(process.cwd(), "src", "assets", "safety-image-pilot");
const common = {
  theme: helmet,
  paper: "A4" as const,
  orientation: "portrait" as const,
  source: readFileSync(join(process.cwd(), "public", "safety-images", "library", "originals", "helmet-required.png")),
  mascotPath: join(process.cwd(), "public", "mascot", "mascot-head-256.png"),
  fontPath: join(assetRoot, "fonts", "NotoSansJP-Bold.ttf"),
  latinFontPath: join(process.cwd(), "src", "assets", "safety-image-library", "fonts", "NotoSans-Bold.ttf"),
  wasmPath: join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
  dimensions: { width: 480, height: 679 },
};

function settings(language: (typeof SAFETY_IMAGE_LANGUAGES)[number]): SafetyImageRenderSettings {
  return {
    mode: "default",
    language,
    text: helmet.texts[language],
    fontSize: "standard",
    position: "top",
    textColor: "#082f49",
    band: true,
    bandColor: "#ffffff",
    brand: true,
    lineHeight: 1.18,
    align: "center",
    border: true,
    padding: "standard",
    writingMode: "horizontal",
    subMessage: "",
    numericValue: "",
    numericUnit: "",
  };
}

describe("safety image library renderer", () => {
  it("renders all five exact language presets as openable 300dpi JPEG", async () => {
    for (const language of SAFETY_IMAGE_LANGUAGES) {
      const jpeg = await renderSafetyImage({
        ...common,
        format: "jpeg",
        settings: settings(language),
      });
      const metadata = await sharp(jpeg).metadata();
      expect(metadata.format).toBe("jpeg");
      expect([metadata.width, metadata.height]).toEqual([480, 679]);
      expect(metadata.density).toBe(300);
    }
  });

  it("renders clean, edited, vertical and brand-free modes independently", async () => {
    for (const renderSettings of [
      { ...settings("ja"), mode: "clean" as const, brand: false },
      {
        ...settings("ja"),
        mode: "edited" as const,
        text: "保護帽を必ず着用",
        writingMode: "vertical" as const,
        position: "center" as const,
        band: false,
        brand: false,
      },
    ]) {
      const jpeg = await renderSafetyImage({
        ...common,
        format: "jpeg",
        settings: renderSettings,
      });
      expect((await sharp(jpeg).metadata()).format).toBe("jpeg");
    }
  });

  it("creates an openable PNG with 300dpi pHYs metadata", async () => {
    const construction = getSafetyImageTheme("scaffold-work-illustration");
    if (!construction) throw new Error("construction theme missing");
    const png = await renderSafetyImage({
      ...common,
      theme: construction,
      source: readFileSync(join(process.cwd(), "public", "safety-images", "library", "originals", `${construction.slug}.png`)),
      orientation: "landscape",
      format: "png",
      dimensions: { width: 679, height: 480 },
      settings: { ...settings("ja"), text: construction.texts.ja, position: "bottom" },
    });
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect([metadata.width, metadata.height]).toEqual([679, 480]);
    expect(metadata.density).toBe(300);
  });

  it("builds an image-bearing A4/A3 portrait/landscape PDF envelope", async () => {
    const jpeg = await renderSafetyImage({
      ...common,
      format: "jpeg",
      settings: settings("vi"),
    });
    for (const paper of ["A4", "A3"] as const) {
      for (const orientation of ["portrait", "landscape"] as const) {
        const pdf = buildSafetyImagePdf({ jpeg, paper, orientation });
        expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
        expect(pdf.toString("latin1")).toContain("/Subtype /Image");
        expect(pdf.includes(jpeg)).toBe(true);
      }
    }
  });
});
