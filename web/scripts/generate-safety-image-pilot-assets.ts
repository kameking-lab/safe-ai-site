import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import {
  buildPilotPdf,
  renderPilotJpeg,
} from "../src/lib/safety-image-pilot/renderer.ts";

const root = resolve(import.meta.dirname, "..");
const assetRoot = join(root, "src", "assets", "safety-image-pilot");
const originalRoot = join(assetRoot, "originals");
const derivativeRoot = join(assetRoot, "derivatives");
const publicRoot = join(root, "public", "safety-images", "pilot");
const cleanSourcePath = join(originalRoot, "helmet-required-clean-original.png");
const directTextSourcePath = join(
  originalRoot,
  "helmet-required-direct-text-original.png",
);
const mascotPath = join(root, "public", "mascot", "mascot-head-256.png");
const fontPath = join(assetRoot, "fonts", "NotoSansJP-Bold.ttf");
const wasmPath = join(
  root,
  "node_modules",
  "@resvg",
  "resvg-wasm",
  "index_bg.wasm",
);

await Promise.all(
  [derivativeRoot, publicRoot].map((directory) =>
    mkdir(directory, { recursive: true }),
  ),
);

await Promise.all([
  sharp(cleanSourcePath)
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 88, smartSubsample: true })
    .toFile(join(publicRoot, "helmet-required-clean.webp")),
  sharp(directTextSourcePath)
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 88, smartSubsample: true })
    .toFile(join(publicRoot, "helmet-required-direct-text.webp")),
]);

const derivativeFiles: Array<{
  file: string;
  sha256: string;
  bytes: number;
  variant: "a" | "b";
  paper: "A4" | "A3";
  format: "jpeg" | "pdf";
}> = [];

for (const variant of ["a", "b"] as const) {
  for (const paper of ["A4", "A3"] as const) {
    const jpeg = await renderPilotJpeg({
      variant,
      language: "all",
      brand: "branded",
      paper,
      cleanSourcePath,
      directTextSourcePath,
      mascotPath,
      fontPath,
      wasmPath,
    });
    const stem = `helmet-required-${variant}-all-branded-${paper.toLowerCase()}-portrait`;
    const jpegFile = `${stem}.jpg`;
    const pdfFile = `${stem}.pdf`;
    const pdf = buildPilotPdf({ jpeg, paper });
    await Promise.all([
      writeFile(join(derivativeRoot, jpegFile), jpeg),
      writeFile(join(derivativeRoot, pdfFile), pdf),
    ]);
    derivativeFiles.push(
      {
        file: jpegFile,
        sha256: createHash("sha256").update(jpeg).digest("hex"),
        bytes: jpeg.length,
        variant,
        paper,
        format: "jpeg",
      },
      {
        file: pdfFile,
        sha256: createHash("sha256").update(pdf).digest("hex"),
        bytes: pdf.length,
        variant,
        paper,
        format: "pdf",
      },
    );

    if (variant === "a" && paper === "A4") {
      await sharp(jpeg)
        .resize({ width: 720 })
        .webp({ quality: 88, smartSubsample: true })
        .toFile(join(publicRoot, "helmet-required-a-all-branded.webp"));
    }
  }
}

const originals = await Promise.all(
  [
    "helmet-required-clean-original.png",
    "helmet-required-direct-text-original.png",
  ].map(async (file) => {
    const binary = await readFile(join(originalRoot, file));
    return {
      file,
      sha256: createHash("sha256").update(binary).digest("hex"),
      bytes: binary.length,
    };
  }),
);

await writeFile(
  join(assetRoot, "derivatives-manifest.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sourceIntegrity: originals,
      derivativeCount: derivativeFiles.length,
      derivatives: derivativeFiles,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `Generated ${derivativeFiles.length} A4/A3 pilot derivatives and 3 WebP display assets.\n`,
);
