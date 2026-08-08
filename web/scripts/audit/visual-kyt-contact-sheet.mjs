import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDirectory = path.resolve(
  process.cwd(),
  "public",
  "visual-ky",
  "scenarios",
);
const output = path.resolve(
  process.cwd(),
  "..",
  "docs",
  "audits",
  "evidence",
  "visual-kyt-academy-2026-07-30",
  "images",
  "contact-sheet.webp",
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
const width = 480;
const height = 300;
const gap = 12;
const columns = 3;
const rows = Math.ceil(slugs.length / columns);
const composites = [];

for (const [index, slug] of slugs.entries()) {
  const image = await sharp(path.join(publicDirectory, `${slug}.webp`))
    .resize(width, 270, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="30"><rect width="100%" height="100%" fill="#0f172a"/><text x="10" y="21" fill="white" font-family="sans-serif" font-size="16">${index + 1}. ${slug}</text></svg>`,
        ),
        top: 270,
        left: 0,
      },
    ])
    .webp({ quality: 80 })
    .toBuffer();
  composites.push({
    input: image,
    left: (index % columns) * (width + gap),
    top: Math.floor(index / columns) * (height + gap),
  });
}

await mkdir(path.dirname(output), { recursive: true });
await sharp({
  create: {
    width: columns * width + (columns - 1) * gap,
    height: rows * height + (rows - 1) * gap,
    channels: 3,
    background: "#e2e8f0",
  },
})
  .composite(composites)
  .webp({ quality: 82 })
  .toFile(output);

process.stdout.write(`${output}\n`);
