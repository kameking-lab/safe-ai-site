import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "../..");
const repositoryRoot = path.resolve(webRoot, "..");
const sourceRoot = path.join(
  repositoryRoot,
  "docs",
  "audits",
  "evidence",
  "visual-kyt-academy-2026-07-30",
  "images",
  "originals",
);
const publicRoot = path.join(
  webRoot,
  "public",
  "visual-ky",
  "scenarios",
);
const evidencePath = path.join(
  repositoryRoot,
  "docs",
  "audits",
  "evidence",
  "visual-kyt-academy-2026-07-30",
  "images",
  "generated-image-manifest.json",
);

const slugs = [
  "scaffold-fall",
  "aerial-lift-entrapment",
  "excavator-blind-spot",
  "rollbox-overturn",
  "tail-lift-loading",
  "stepladder-instability",
  "temporary-electric-shock",
  "hot-work-fire",
  "chemical-transfer-sds",
  "heat-stress-summer",
  "warehouse-trip",
  "lone-maintenance",
  "new-entrant-route",
  "night-roadwork",
  "rain-wind-delivery",
];

await mkdir(publicRoot, { recursive: true });
await mkdir(path.dirname(evidencePath), { recursive: true });

const manifest = [];

for (const slug of slugs) {
  const sourcePath = path.join(sourceRoot, `${slug}.png`);
  const destinationPath = path.join(publicRoot, `${slug}.webp`);
  const source = await readFile(sourcePath);
  const sourceMetadata = await sharp(source).metadata();

  await sharp(source)
    .resize(1600, 900, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destinationPath);

  const optimized = await readFile(destinationPath);
  const optimizedMetadata = await sharp(optimized).metadata();

  manifest.push({
    scenarioImageId: slug,
    rightsStatus: "generated-for-this-project",
    source: `docs/audits/evidence/visual-kyt-academy-2026-07-30/images/originals/${slug}.png`,
    publicPath: `/visual-ky/scenarios/${slug}.webp`,
    generatedBy: "OpenAI image generation through the Codex imagegen skill",
    generatedDate: "2026-07-30",
    styleReference:
      "web/public/visual-refresh/safety-operations-panorama.webp (palette and rendering density only)",
    sourceDimensions: `${sourceMetadata.width}x${sourceMetadata.height}`,
    sourceBytes: source.byteLength,
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    optimizedDimensions: `${optimizedMetadata.width}x${optimizedMetadata.height}`,
    optimizedBytes: optimized.byteLength,
    optimizedSha256: createHash("sha256")
      .update(optimized)
      .digest("hex"),
    publicFormat: "image/webp",
    negotiatedFormats:
      "Next.js Image Optimization: image/avif, image/webp",
    peoplePpeReview: "pass",
    machineryStructureReview: "pass",
    hazardCausalityReview: "pass",
    textLogoWatermarkReview: "pass",
    mobileHotspotReview: "pass",
    printReview: "pending-browser-gate",
    externalExpertReview: "not-reviewed",
  });
}

const ogSource = path.join(sourceRoot, "scaffold-fall.png");
const ogDestination = path.join(
  webRoot,
  "public",
  "visual-ky",
  "visual-ky-og.webp",
);
await mkdir(path.dirname(ogDestination), { recursive: true });
await sharp(ogSource)
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .webp({ quality: 84, effort: 6, smartSubsample: true })
  .toFile(ogDestination);

await writeFile(
  evidencePath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      imageCount: manifest.length,
      publicRightsStatus: "generated-for-this-project",
      unresolvedRightsPublished: 0,
      sourceInventoryImagesPublished: 0,
      outputPolicy:
        "WebP source assets are served through Next.js Image Optimization with AVIF/WebP negotiation.",
      images: manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `Optimized ${manifest.length} visual KYT images and wrote ${path.relative(
    repositoryRoot,
    evidencePath,
  )}\n`,
);
