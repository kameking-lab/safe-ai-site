import { readFile } from "node:fs/promises";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { encode as encodeJpeg } from "jpeg-js";
import {
  PILOT_LAYOUTS,
  PILOT_TEXTS,
  type PilotBrand,
  type PilotLanguage,
  type PilotPaper,
  type PilotVariant,
} from "../../data/safety-image-pilot/index.ts";

export type PilotPixelDimensions = { width: number; height: number };

export const PILOT_PRINT_DIMENSIONS: Record<PilotPaper, PilotPixelDimensions> = {
  A4: { width: 2480, height: 3508 },
  A3: { width: 3508, height: 4961 },
};

const PILOT_PDF_POINTS: Record<PilotPaper, PilotPixelDimensions> = {
  A4: { width: 595.276, height: 841.89 },
  A3: { width: 841.89, height: 1190.551 },
};

const binaryCache = new Map<string, Promise<Buffer>>();
let resvgInitialization: Promise<void> | undefined;

function cachedBinary(path: string): Promise<Buffer> {
  const cached = binaryCache.get(path);
  if (cached) return cached;
  const pending = readFile(path);
  binaryCache.set(path, pending);
  return pending;
}

async function ensureResvgInitialized(wasmPath: string): Promise<void> {
  resvgInitialization ??= cachedBinary(wasmPath).then(async (wasm) => {
    await initWasm(new Uint8Array(wasm));
  });
  try {
    await resvgInitialization;
  } catch (error) {
    resvgInitialization = undefined;
    throw error;
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function textElement(options: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}): string {
  return `<text x="${options.x}" y="${options.y}" fill="#082f49" font-family="Noto Sans JP, sans-serif" font-size="${options.fontSize}" font-weight="900" letter-spacing=".3" paint-order="stroke" stroke="#082f49" stroke-width=".8">${escapeXml(options.text)}</text>`;
}

function afterTextLayer(language: PilotLanguage): string {
  if (language === "all") {
    const lines = PILOT_LAYOUTS.all.lines.map((layout, index) =>
      textElement({
        text: PILOT_TEXTS.all[index],
        x: layout.x,
        y: layout.y,
        fontSize: layout.fontSize,
      }),
    );
    const panel = PILOT_LAYOUTS.all.panel;
    return `<g id="code-text-layer">
      <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" rx="${panel.radius}" fill="#ffffff" fill-opacity=".86" stroke="#0c4a6e" stroke-width="3"/>
      ${lines.join("\n")}
    </g>`;
  }

  const definition = PILOT_LAYOUTS.single[language];
  const panel = PILOT_LAYOUTS.single.panel;
  const lines = definition.lines.map((line, index) =>
    textElement({
      text: line,
      x: 62,
      y: definition.top + index * definition.lineHeight,
      fontSize: definition.fontSize,
    }),
  );
  return `<g id="code-text-layer">
    <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" rx="${panel.radius}" fill="#ffffff" fill-opacity=".88" stroke="#0c4a6e" stroke-width="3"/>
    ${lines.join("\n")}
  </g>`;
}

function brandLayer(options: {
  dimensions: PilotPixelDimensions;
  mascot: Buffer;
}): string {
  const paperScale = options.dimensions.width / PILOT_PRINT_DIMENSIONS.A4.width;
  const width = Math.round(520 * paperScale);
  const height = Math.round(132 * paperScale);
  const margin = Math.round(28 * paperScale);
  const x = options.dimensions.width - width - margin;
  const y = options.dimensions.height - height - margin;
  const mascotSize = Math.round(108 * paperScale);
  const mascotX = x + Math.round(14 * paperScale);
  const mascotY = y + Math.round(12 * paperScale);
  const fontSize = Math.round(34 * paperScale);
  const textX = x + Math.round(322 * paperScale);
  const textY = y + Math.round(70 * paperScale);
  const mascotData = `data:image/png;base64,${options.mascot.toString("base64")}`;
  return `<g id="brand-layer">
    <rect x="${x + 2}" y="${y + 2}" width="${width - 4}" height="${height - 4}" rx="${Math.round(26 * paperScale)}" fill="#ffffff" fill-opacity=".96" stroke="#0f766e" stroke-width="${Math.max(3, Math.round(4 * paperScale))}"/>
    <image href="${mascotData}" x="${mascotX}" y="${mascotY}" width="${mascotSize}" height="${mascotSize}" preserveAspectRatio="xMidYMid meet"/>
    <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-family="Noto Sans JP, sans-serif" font-size="${fontSize}" font-weight="800">© 安全AIポータル</text>
  </g>`;
}

function buildPosterSvg(options: {
  variant: PilotVariant;
  language: PilotLanguage;
  brand: PilotBrand;
  dimensions: PilotPixelDimensions;
  source: Buffer;
  mascot: Buffer;
}): string {
  const sourceWidth = PILOT_LAYOUTS.canvas.width;
  const sourceHeight = PILOT_LAYOUTS.canvas.height;
  const imageScale = options.dimensions.width / sourceWidth;
  const imageHeight = sourceHeight * imageScale;
  const imageTop = (options.dimensions.height - imageHeight) / 2;
  const sourceData = `data:image/png;base64,${options.source.toString("base64")}`;
  const codeText =
    options.variant === "a"
      ? `<g transform="translate(0 ${imageTop}) scale(${imageScale})">${afterTextLayer(options.language)}</g>`
      : "";
  const brand =
    options.brand === "branded"
      ? brandLayer({ dimensions: options.dimensions, mascot: options.mascot })
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${options.dimensions.width}" height="${options.dimensions.height}" viewBox="0 0 ${options.dimensions.width} ${options.dimensions.height}">
  <rect width="100%" height="100%" fill="#eaf6fd"/>
  <image href="${sourceData}" x="0" y="${imageTop}" width="${options.dimensions.width}" height="${imageHeight}" preserveAspectRatio="none"/>
  ${codeText}
  ${brand}
</svg>`;
}

function addJpegDensity(jpeg: Buffer, density = 300): Buffer {
  if (
    jpeg.length >= 18 &&
    jpeg[0] === 0xff &&
    jpeg[1] === 0xd8 &&
    jpeg[2] === 0xff &&
    jpeg[3] === 0xe0 &&
    jpeg.subarray(6, 11).toString("ascii") === "JFIF\0"
  ) {
    jpeg[13] = 1;
    jpeg.writeUInt16BE(density, 14);
    jpeg.writeUInt16BE(density, 16);
  }
  return jpeg;
}

export async function renderPilotJpeg(options: {
  variant: PilotVariant;
  language: PilotLanguage;
  brand: PilotBrand;
  paper: PilotPaper;
  cleanSourcePath: string;
  directTextSourcePath: string;
  mascotPath: string;
  fontPath: string;
  wasmPath: string;
  dimensions?: PilotPixelDimensions;
}): Promise<Buffer> {
  const dimensions = options.dimensions ?? PILOT_PRINT_DIMENSIONS[options.paper];
  const sourcePath =
    options.variant === "a" ? options.cleanSourcePath : options.directTextSourcePath;
  const [source, mascot, font] = await Promise.all([
    cachedBinary(sourcePath),
    cachedBinary(options.mascotPath),
    cachedBinary(options.fontPath),
    ensureResvgInitialized(options.wasmPath),
  ]);
  const svg = buildPosterSvg({
    variant: options.variant,
    language: options.variant === "b" ? "all" : options.language,
    brand: options.brand,
    dimensions,
    source,
    mascot,
  });
  const renderer = new Resvg(svg, {
    background: "#eaf6fd",
    dpi: 300,
    textRendering: 1,
    imageRendering: 0,
    font: {
      fontBuffers: [new Uint8Array(font)],
      defaultFontFamily: "Noto Sans JP",
      sansSerifFamily: "Noto Sans JP",
    },
  });
  const rendered = renderer.render();
  try {
    if (rendered.width !== dimensions.width || rendered.height !== dimensions.height) {
      throw new Error(`Unexpected pilot dimensions: ${rendered.width}x${rendered.height}`);
    }
    const encoded = encodeJpeg(
      {
        data: Buffer.from(rendered.pixels),
        width: rendered.width,
        height: rendered.height,
      },
      options.dimensions ? 89 : 94,
    );
    return addJpegDensity(Buffer.from(encoded.data));
  } finally {
    rendered.free();
    renderer.free();
  }
}

function ascii(value: string): Buffer {
  return Buffer.from(value, "ascii");
}

export function buildPilotPdf(options: {
  jpeg: Buffer;
  paper: PilotPaper;
}): Buffer {
  const pixels = PILOT_PRINT_DIMENSIONS[options.paper];
  const page = PILOT_PDF_POINTS[options.paper];
  const content = ascii(
    `q\n${page.width.toFixed(3)} 0 0 ${page.height.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`,
  );
  const objects: Buffer[] = [
    ascii("<< /Type /Catalog /Pages 2 0 R >>"),
    ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    ascii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width.toFixed(3)} ${page.height.toFixed(3)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`,
    ),
    Buffer.concat([
      ascii(`<< /Length ${content.length} >>\nstream\n`),
      content,
      ascii("endstream"),
    ]),
    Buffer.concat([
      ascii(
        `<< /Type /XObject /Subtype /Image /Width ${pixels.width} /Height ${pixels.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${options.jpeg.length} >>\nstream\n`,
      ),
      options.jpeg,
      ascii("\nendstream"),
    ]),
  ];
  const parts: Buffer[] = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let cursor = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(cursor);
    const wrapped = Buffer.concat([
      ascii(`${index + 1} 0 obj\n`),
      object,
      ascii("\nendobj\n"),
    ]);
    parts.push(wrapped);
    cursor += wrapped.length;
  });
  const xrefOffset = cursor;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ].join("\n");
  parts.push(ascii(xref));
  return Buffer.concat(parts);
}
