import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getSafetyImageTheme } from "@/data/safety-image-library";
import { outputSizePixels } from "@/data/safety-image-library/sizes";
import {
  buildSafetyImagePdf,
  renderSafetyImage,
  type SafetyImageRenderSettings,
} from "./renderer";

const theme = getSafetyImageTheme("helmet-required")!;
const assetRoot = join(process.cwd(), "src", "assets", "safety-image-library");
const common = {
  theme,
  paper: "A4" as const,
  orientation: "portrait" as const,
  source: readFileSync(join(process.cwd(), "public", "safety-images", "library", "originals", "helmet-required.png")),
  mascotPath: join(process.cwd(), "public", "mascot", "mascot-head-256.png"),
  fontPath: join(assetRoot, "fonts", "NotoSansCJKjp-Bold.otf"),
  simplifiedChineseFontPath: join(assetRoot, "fonts", "NotoSansCJKsc-Bold.otf"),
  latinFontPath: join(assetRoot, "fonts", "NotoSans-Bold.ttf"),
  wasmPath: join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
};
const settings: SafetyImageRenderSettings = {
  mode: "default",
  language: "ja",
  text: theme.texts.ja,
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
const VERCEL_STREAMING_CACHE_LIMIT_BYTES = 20_000_000;

describe("largest safety-sign renderer resource boundary", () => {
  it("emits the exact 450x1800mm 300dpi JPEG without an unbounded working canvas", async () => {
    const expected = outputSizePixels("banner-450x1800");
    const baseline = process.memoryUsage().rss;
    let peak = baseline;
    const sampler = setInterval(() => {
      peak = Math.max(peak, process.memoryUsage().rss);
    }, 10);
    try {
      const jpeg = await renderSafetyImage({
        ...common,
        outputSize: "banner-450x1800",
        format: "jpeg",
        settings,
      });
      const metadata = await sharp(jpeg).metadata();
      expect([metadata.width, metadata.height]).toEqual([expected.width, expected.height]);
      expect(metadata.density).toBe(300);
      expect(jpeg.byteLength).toBeGreaterThan(100_000);
      expect(jpeg.byteLength).toBeLessThanOrEqual(VERCEL_STREAMING_CACHE_LIMIT_BYTES);
      const pdf = buildSafetyImagePdf({
        jpeg,
        paper: "A4",
        orientation: "portrait",
        outputSize: "banner-450x1800",
      });
      expect(pdf.byteLength).toBeLessThanOrEqual(VERCEL_STREAMING_CACHE_LIMIT_BYTES);
      process.stdout.write(`max-output-bytes jpeg=${jpeg.byteLength} pdf=${pdf.byteLength}\n`);
    } finally {
      clearInterval(sampler);
    }
    // Vercel's current fixed function allocation is 2 GiB. Keep a measured
    // margin for runtime overhead while proving this exact maximum geometry.
    expect(peak - baseline).toBeLessThan(1_250 * 1024 * 1024);
    expect(peak).toBeLessThan(1_750 * 1024 * 1024);
  }, 180_000);

  it("emits the exact maximum 300dpi transparent PNG within the same hard boundary", async () => {
    const expected = outputSizePixels("banner-450x1800");
    const baseline = process.memoryUsage().rss;
    let peak = baseline;
    const sampler = setInterval(() => {
      peak = Math.max(peak, process.memoryUsage().rss);
    }, 10);
    try {
      const png = await renderSafetyImage({
        ...common,
        outputSize: "banner-450x1800",
        format: "png",
        settings: { ...settings, mode: "clean", brand: false },
      });
      const metadata = await sharp(png).metadata();
      expect([metadata.width, metadata.height]).toEqual([expected.width, expected.height]);
      expect(metadata.density).toBe(300);
      expect(png.byteLength).toBeGreaterThan(100_000);
      expect(png.byteLength).toBeLessThanOrEqual(VERCEL_STREAMING_CACHE_LIMIT_BYTES);
      process.stdout.write(`max-output-bytes png=${png.byteLength}\n`);
    } finally {
      clearInterval(sampler);
    }
    expect(peak - baseline).toBeLessThan(1_250 * 1024 * 1024);
    expect(peak).toBeLessThan(1_850 * 1024 * 1024);
  }, 240_000);
});
