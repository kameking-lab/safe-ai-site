import { readFile } from "node:fs/promises";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import sharp from "sharp";
import type {
  SafetyImageLanguage,
  SafetyImageOrientation,
  SafetyImageTheme,
} from "@/data/safety-image-library";
import { resolveSafetyImageMessage } from "@/lib/safety-image-library/message";
import { fitSafetyImageText } from "@/lib/safety-image-library/text-fit";
import {
  outputSizePixels,
  outputSizePoints,
  type SafetySignOutputSize,
} from "@/data/safety-image-library/sizes";

// Print-size rendering is intentionally single-threaded and uses a small
// libvips cache. The route already serializes renders; these bounds prevent
// large market formats from multiplying decoder/encoder working sets.
sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 16 });

export type SafetyImagePaper = "A4" | "A3";
export type SafetyImageFormat = "jpeg" | "pdf" | "png";
export type SafetyImageDownloadMode = "clean" | "default" | "edited";
export type SafetyImageFontSize = "small" | "standard" | "large";
export type SafetyImageTextPosition = "top" | "center" | "bottom";
export type SafetyImageTextAlign = "left" | "center" | "right";
export type SafetyImagePadding = "small" | "standard" | "large";
export type SafetyImageWritingMode = "horizontal" | "vertical";

export type SafetyImageRenderSettings = {
  mode: SafetyImageDownloadMode;
  language: SafetyImageLanguage;
  text: string;
  fontSize: SafetyImageFontSize;
  position: SafetyImageTextPosition;
  textColor: string;
  band: boolean;
  bandColor: string;
  brand: boolean;
  lineHeight: number;
  align: SafetyImageTextAlign;
  border: boolean;
  padding: SafetyImagePadding;
  writingMode: SafetyImageWritingMode;
  subMessage: string;
  numericValue: string;
  numericUnit: string;
};

type Dimensions = { width: number; height: number };

export class SafetyImageTextOverflowError extends Error {
  constructor() {
    super("Editable text does not fit the selected output size");
    this.name = "SafetyImageTextOverflowError";
  }
}

const PORTRAIT_PIXELS: Record<SafetyImagePaper, Dimensions> = {
  A4: { width: 2480, height: 3508 },
  A3: { width: 3508, height: 4961 },
};

const PORTRAIT_POINTS: Record<SafetyImagePaper, Dimensions> = {
  A4: { width: 595.276, height: 841.89 },
  A3: { width: 841.89, height: 1190.551 },
};

// resvg owns an uncompressed RGBA canvas. Bound that canvas independently of
// the final print raster, then let libvips perform the final tiled resample.
// This keeps the largest 450x1800 mm output from allocating a 450+ MiB resvg
// canvas while retaining the exact 300 dpi output dimensions and metadata.
export const MAX_SAFETY_IMAGE_WORKING_PIXELS = 24_000_000;
export const MAX_SAFETY_IMAGE_OUTPUT_PIXELS = 113_000_000;

export function getSafetyImageWorkingDimensions(dimensions: Dimensions): Dimensions {
  const pixels = dimensions.width * dimensions.height;
  if (pixels <= MAX_SAFETY_IMAGE_WORKING_PIXELS) return dimensions;
  const scale = Math.sqrt(MAX_SAFETY_IMAGE_WORKING_PIXELS / pixels);
  return {
    width: Math.max(1, Math.floor(dimensions.width * scale)),
    height: Math.max(1, Math.floor(dimensions.height * scale)),
  };
}

const binaryCache = new Map<string, Promise<Buffer>>();
let wasmInitialization: Promise<void> | undefined;

function cachedBinary(filePath: string): Promise<Buffer> {
  const cached = binaryCache.get(filePath);
  if (cached) return cached;
  const pending = readFile(filePath);
  binaryCache.set(filePath, pending);
  return pending;
}

async function ensureWasm(wasmPath: string): Promise<void> {
  wasmInitialization ??= cachedBinary(wasmPath).then(async (wasm) => {
    await initWasm(new Uint8Array(wasm));
  });
  try {
    await wasmInitialization;
  } catch (error) {
    wasmInitialization = undefined;
    throw error;
  }
}

export function getSafetyImagePixelDimensions(
  paper: SafetyImagePaper,
  orientation: SafetyImageOrientation,
): Dimensions {
  const base = PORTRAIT_PIXELS[paper];
  return orientation === "portrait"
    ? base
    : { width: base.height, height: base.width };
}

function getPagePoints(
  paper: SafetyImagePaper,
  orientation: SafetyImageOrientation,
): Dimensions {
  const base = PORTRAIT_POINTS[paper];
  return orientation === "portrait"
    ? base
    : { width: base.height, height: base.width };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSafetyImageTextLayer(options: {
  theme: SafetyImageTheme;
  dimensions: Dimensions;
  settings: SafetyImageRenderSettings;
}): string {
  const { dimensions, settings } = options;
  const fontFamily = settings.language === "zh-CN"
    ? "Noto Sans CJK SC"
    : settings.language === "ja"
      ? "Noto Sans CJK JP"
      : "Noto Sans";
  const message = resolveSafetyImageMessage(options.theme, settings);
  if (!message) return "";
  const fit = fitSafetyImageText({ message, dimensions, settings });
  if (!fit) throw new SafetyImageTextOverflowError();
  const { margin, panelWidth, panelPadding, fontSize, brandClearance } = fit;

  if (fit.kind === "vertical") {
    const { columns, columnGap, verticalPanelWidth, verticalPanelHeight } = fit;
    const panelX = Math.round((dimensions.width - verticalPanelWidth) / 2);
    const panelY =
      settings.position === "top"
        ? margin
        : settings.position === "center"
          ? Math.round((dimensions.height - verticalPanelHeight) / 2)
          : dimensions.height - verticalPanelHeight - margin - brandClearance;
    const band = settings.band
      ? `<rect x="${panelX}" y="${panelY}" width="${verticalPanelWidth}" height="${verticalPanelHeight}" rx="${Math.round(fontSize * 0.22)}" fill="${settings.bandColor}" fill-opacity=".93"${
          settings.border ? ` stroke="#0f172a" stroke-width="${Math.max(3, Math.round(dimensions.width * 0.002))}"` : ""
        }/>`
      : "";
    const text = columns
      .map((column, columnIndex) =>
        column
          .map((character, characterIndex) => {
            const x = panelX + verticalPanelWidth - panelPadding - fontSize * 0.55 - columnIndex * columnGap;
            const y = panelY + panelPadding + fontSize * 0.88 + characterIndex * fontSize * settings.lineHeight;
            return `<text x="${x}" y="${y}" text-anchor="middle" fill="${settings.textColor}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="900" paint-order="stroke" stroke="${settings.band ? settings.textColor : "#ffffff"}" stroke-width="${settings.band ? 0.7 : Math.max(2, fontSize * 0.035)}">${escapeXml(character)}</text>`;
          })
          .join("\n"),
      )
      .join("\n");
    return `<g id="editable-text-layer">${band}${text}</g>`;
  }

  const { lines, panelHeight } = fit;
  const effectiveLineHeight = fontSize * settings.lineHeight;
  const y =
    settings.position === "top"
      ? margin
      : settings.position === "center"
        ? Math.round((dimensions.height - panelHeight) / 2)
        : dimensions.height - panelHeight - margin - brandClearance;
  const anchor = settings.align === "left" ? "start" : settings.align === "right" ? "end" : "middle";
  const x =
    settings.align === "left"
      ? margin + panelPadding
      : settings.align === "right"
        ? dimensions.width - margin - panelPadding
        : dimensions.width / 2;
  const band = settings.band
    ? `<rect x="${margin}" y="${y}" width="${panelWidth}" height="${panelHeight}" rx="${Math.round(fontSize * 0.22)}" fill="${settings.bandColor}" fill-opacity=".93"${
        settings.border ? ` stroke="#0f172a" stroke-width="${Math.max(3, Math.round(dimensions.width * 0.002))}"` : ""
      }/>`
    : "";
  const text = lines
    .map((line, index) => {
      const baseline = y + panelPadding + fontSize * 0.87 + index * effectiveLineHeight;
      return `<text x="${x}" y="${baseline}" text-anchor="${anchor}" fill="${settings.textColor}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="900" paint-order="stroke" stroke="${settings.band ? settings.textColor : "#ffffff"}" stroke-width="${settings.band ? 0.7 : Math.max(2, fontSize * 0.035)}" stroke-linejoin="round">${escapeXml(line)}</text>`;
    })
    .join("\n");
  return `<g id="editable-text-layer">${band}${text}</g>`;
}

function brandLayer(dimensions: Dimensions, mascot: Buffer): string {
  const scale = dimensions.width / 2480;
  const width = Math.round(510 * scale);
  const height = Math.round(128 * scale);
  const margin = Math.round(26 * scale);
  const x = dimensions.width - width - margin;
  const y = dimensions.height - height - margin;
  const mascotSize = Math.round(104 * scale);
  const data = `data:image/png;base64,${mascot.toString("base64")}`;
  return `<g id="brand-layer">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${Math.round(24 * scale)}" fill="#ffffff" fill-opacity=".95" stroke="#0f766e" stroke-width="${Math.max(3, Math.round(4 * scale))}"/>
    <image href="${data}" x="${x + Math.round(12 * scale)}" y="${y + Math.round(11 * scale)}" width="${mascotSize}" height="${mascotSize}" preserveAspectRatio="xMidYMid meet"/>
    <text x="${x + Math.round(318 * scale)}" y="${y + Math.round(68 * scale)}" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-family="Noto Sans CJK JP, sans-serif" font-size="${Math.round(33 * scale)}" font-weight="800">© 安全AIポータル</text>
  </g>`;
}

function posterSvg(options: {
  theme: SafetyImageTheme;
  dimensions: Dimensions;
  source: Buffer;
  mascot: Buffer;
  settings: SafetyImageRenderSettings;
  transparentCanvas?: boolean;
}): string {
  const sourceData = `data:image/png;base64,${options.source.toString("base64")}`;
  const text = buildSafetyImageTextLayer({
    theme: options.theme,
    dimensions: options.dimensions,
    settings: options.settings,
  });
  const brand =
    options.settings.mode !== "clean" && options.settings.brand
      ? brandLayer(options.dimensions, options.mascot)
      : "";
  const canvas = options.transparentCanvas
    ? ""
    : '<rect width="100%" height="100%" fill="#eef7f7"/>';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${options.dimensions.width}" height="${options.dimensions.height}" viewBox="0 0 ${options.dimensions.width} ${options.dimensions.height}">
  ${canvas}
  <image href="${sourceData}" x="0" y="0" width="${options.dimensions.width}" height="${options.dimensions.height}" preserveAspectRatio="xMidYMid meet"/>
  ${text}
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

export async function renderSafetyImage(options: {
  theme: SafetyImageTheme;
  paper: SafetyImagePaper;
  orientation: SafetyImageOrientation;
  outputSize?: SafetySignOutputSize;
  format: SafetyImageFormat;
  source: Buffer;
  mascotPath: string;
  fontPath: string;
  simplifiedChineseFontPath: string;
  latinFontPath: string;
  wasmPath: string;
  settings: SafetyImageRenderSettings;
  /** Small deterministic canvas used only by renderer tests; production omits it. */
  dimensions?: Dimensions;
}): Promise<Buffer> {
  const outputDimensions =
    options.dimensions ?? (options.outputSize
      ? outputSizePixels(options.outputSize)
      : getSafetyImagePixelDimensions(options.paper, options.orientation));
  const workingDimensions = options.dimensions
    ? outputDimensions
    : getSafetyImageWorkingDimensions(outputDimensions);
  if (outputDimensions.width * outputDimensions.height > MAX_SAFETY_IMAGE_OUTPUT_PIXELS) {
    throw new Error("Safety-image output exceeds the hard pixel boundary");
  }
  const [mascot, font, simplifiedChineseFont, latinFont] = await Promise.all([
    cachedBinary(options.mascotPath),
    cachedBinary(options.fontPath),
    cachedBinary(options.simplifiedChineseFontPath),
    cachedBinary(options.latinFontPath),
    ensureWasm(options.wasmPath),
  ]);
  const svg = posterSvg({
    theme: options.theme,
    dimensions: workingDimensions,
    source: options.source,
    mascot,
    settings: options.settings,
    transparentCanvas:
      options.format === "png" && options.settings.mode === "clean",
  });
  const renderer = new Resvg(svg, {
    ...(options.format === "png" && options.settings.mode === "clean"
      ? {}
      : { background: "#eef7f7" }),
    dpi: 300,
    textRendering: 1,
    imageRendering: 0,
    font: {
      fontBuffers: [
        new Uint8Array(font),
        new Uint8Array(simplifiedChineseFont),
        new Uint8Array(latinFont),
      ],
      defaultFontFamily: "Noto Sans CJK JP",
      sansSerifFamily: "Noto Sans CJK JP",
    },
  });
  const rendered = renderer.render();
  try {
    if (rendered.width !== workingDimensions.width || rendered.height !== workingDimensions.height) {
      throw new Error(`Unexpected output dimensions: ${rendered.width}x${rendered.height}`);
    }
    const raw = sharp(Buffer.from(rendered.pixels), {
      raw: { width: rendered.width, height: rendered.height, channels: 4 },
      limitInputPixels: MAX_SAFETY_IMAGE_WORKING_PIXELS,
      sequentialRead: true,
    }).resize(outputDimensions.width, outputDimensions.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
    if (options.format === "png") {
      return raw
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .withMetadata({ density: 300 })
        .toBuffer();
    }
    const jpeg = addJpegDensity(await raw
      .flatten({ background: "#eef7f7" })
      .jpeg({ quality: 90, chromaSubsampling: "4:2:0", mozjpeg: false })
      .withMetadata({ density: 300 })
      .toBuffer());
    return options.format === "pdf"
      ? buildSafetyImagePdf({
          jpeg,
          paper: options.paper,
          orientation: options.orientation,
          outputSize: options.outputSize,
        })
      : jpeg;
  } finally {
    rendered.free();
    renderer.free();
  }
}

function ascii(value: string): Buffer {
  return Buffer.from(value, "ascii");
}

export function buildSafetyImagePdf(options: {
  jpeg: Buffer;
  paper: SafetyImagePaper;
  orientation: SafetyImageOrientation;
  outputSize?: SafetySignOutputSize;
}): Buffer {
  const pixels = options.outputSize
    ? outputSizePixels(options.outputSize)
    : getSafetyImagePixelDimensions(options.paper, options.orientation);
  const page = options.outputSize
    ? outputSizePoints(options.outputSize)
    : getPagePoints(options.paper, options.orientation);
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
  parts.push(
    ascii(
      [
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
      ].join("\n"),
    ),
  );
  return Buffer.concat(parts);
}
