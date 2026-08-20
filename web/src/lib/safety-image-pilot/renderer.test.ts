import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PILOT_LANGUAGES } from "@/data/safety-image-pilot";
import {
  PILOT_PRINT_DIMENSIONS,
  buildPilotPdf,
  renderPilotJpeg,
} from "./renderer";

const assetRoot = join(process.cwd(), "src", "assets", "safety-image-pilot");
const common = {
  cleanSourcePath: join(assetRoot, "originals", "helmet-required-clean-original.png"),
  directTextSourcePath: join(
    assetRoot,
    "originals",
    "helmet-required-direct-text-original.png",
  ),
  mascotPath: join(process.cwd(), "public", "mascot", "mascot-head-256.png"),
  fontPath: join(assetRoot, "fonts", "NotoSansJP-Bold.ttf"),
  wasmPath: join(
    process.cwd(),
    "node_modules",
    "@resvg",
    "resvg-wasm",
    "index_bg.wasm",
  ),
};

describe("safety image pilot renderer", () => {
  it("renders every method A language without clipping the canvas", async () => {
    for (const language of PILOT_LANGUAGES) {
      const jpeg = await renderPilotJpeg({
        ...common,
        variant: "a",
        language,
        brand: language === "all" ? "branded" : "clean",
        paper: "A4",
        dimensions: { width: 480, height: 679 },
      });
      const metadata = await sharp(jpeg).metadata();
      expect(metadata.format).toBe("jpeg");
      expect([metadata.width, metadata.height]).toEqual([480, 679]);
      expect(metadata.density).toBe(300);
    }
  });

  it("builds an image-bearing PDF", async () => {
    const jpeg = await renderPilotJpeg({
      ...common,
      variant: "a",
      language: "all",
      brand: "branded",
      paper: "A4",
      dimensions: { width: 480, height: 679 },
    });
    const pdf = buildPilotPdf({ jpeg, paper: "A4" });
    expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("/Subtype /Image");
    expect(pdf.includes(jpeg)).toBe(true);
  });

  it("persists openable A4/A3 JPEG and PDF derivatives for A and B", async () => {
    for (const variant of ["a", "b"] as const) {
      for (const paper of ["A4", "A3"] as const) {
        const stem = `helmet-required-${variant}-all-branded-${paper.toLowerCase()}-portrait`;
        const jpegPath = join(assetRoot, "derivatives", `${stem}.jpg`);
        const pdfPath = join(assetRoot, "derivatives", `${stem}.pdf`);
        expect(existsSync(jpegPath)).toBe(true);
        expect(existsSync(pdfPath)).toBe(true);
        const metadata = await sharp(jpegPath).metadata();
        expect([metadata.width, metadata.height]).toEqual([
          PILOT_PRINT_DIMENSIONS[paper].width,
          PILOT_PRINT_DIMENSIONS[paper].height,
        ]);
        expect(metadata.density).toBe(300);
        const pdf = readFileSync(pdfPath);
        expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
        expect(pdf.toString("latin1")).toContain("/Subtype /Image");
      }
    }
  });
});
