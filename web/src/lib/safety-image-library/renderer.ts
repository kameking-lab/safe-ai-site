import { readFile } from "node:fs/promises";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { encode as encodeJpeg } from "jpeg-js";
import type {
  SafetyImageLanguage,
  SafetyImageOrientation,
  SafetyImageTheme,
} from "@/data/safety-image-library";

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

const PORTRAIT_PIXELS: Record<SafetyImagePaper, Dimensions> = {
  A4: { width: 2480, height: 3508 },
  A3: { width: 3508, height: 4961 },
};

const PORTRAIT_POINTS: Record<SafetyImagePaper, Dimensions> = {
  A4: { width: 595.276, height: 841.89 },
  A3: { width: 841.89, height: 1190.551 },
};

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

function normalizedText(value: string): string {
  return value.replace(/\r\n?/gu, "\n").trim();
}

function visualUnits(value: string): number {
  return Array.from(value).reduce((sum, character) => {
    if (/\s/u.test(character)) return sum + 0.34;
    if (/^[\u0000-\u024f]$/u.test(character)) {
      return sum + (/[A-Z0-9]/u.test(character) ? 0.68 : 0.57);
    }
    return sum + 1;
  }, 0);
}

function wrapText(value: string, maximumUnits: number, maximumLines = 4): string[] {
  const explicit = normalizedText(value).split("\n");
  const result: string[] = [];
  for (const paragraph of explicit) {
    if (!paragraph) {
      result.push("");
      continue;
    }
    const words = /\s/u.test(paragraph)
      ? paragraph.split(/\s+/u)
      : Array.from(paragraph);
    let line = "";
    for (const word of words) {
      const separator = line && /\s/u.test(paragraph) ? " " : "";
      const candidate = `${line}${separator}${word}`;
      if (line && visualUnits(candidate) > maximumUnits) {
        result.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) result.push(line);
  }
  if (result.length <= maximumLines) return result;
  const kept = result.slice(0, maximumLines - 1);
  kept.push(result.slice(maximumLines - 1).join(" "));
  return kept;
}

function resolvedMessage(theme: SafetyImageTheme, settings: SafetyImageRenderSettings): string {
  if (settings.mode === "clean") return "";
  const base = settings.mode === "default" ? theme.texts[settings.language] : settings.text;
  const numeric = settings.numericValue.trim();
  const unit = settings.numericUnit.trim();
  const numericLine = numeric ? `${numeric}${unit ? ` ${unit}` : ""}` : "";
  return [base, numericLine, settings.subMessage.trim()].filter(Boolean).join("\n");
}

function textLayer(options: {
  theme: SafetyImageTheme;
  dimensions: Dimensions;
  settings: SafetyImageRenderSettings;
}): string {
  const { dimensions, settings } = options;
  const fontFamily = ["en", "vi", "id"].includes(settings.language)
    ? "Noto Sans"
    : "Noto Sans JP";
  const message = resolvedMessage(options.theme, settings);
  if (!message) return "";

  const marginRatio = dimensions.width < dimensions.height ? 0.052 : 0.045;
  const margin = Math.round(dimensions.width * marginRatio);
  const panelWidth = dimensions.width - margin * 2;
  const paddingRatios = { small: 0.022, standard: 0.035, large: 0.05 } as const;
  const panelPadding = Math.round(panelWidth * paddingRatios[settings.padding]);
  const sizeRatios = { small: 0.041, standard: 0.052, large: 0.063 } as const;
  let fontSize = Math.round(dimensions.width * sizeRatios[settings.fontSize]);
  const brandClearance =
    settings.brand && settings.mode !== "clean" && settings.position === "bottom"
      ? Math.round(dimensions.width * 0.066)
      : 0;

  if (settings.writingMode === "vertical" && settings.language === "ja") {
    const characters = Array.from(normalizedText(message).replaceAll("\n", ""));
    const charactersPerColumn = Math.max(
      8,
      Math.min(15, Math.floor((dimensions.height * 0.48) / (fontSize * 1.08))),
    );
    const columns: string[][] = [];
    for (let index = 0; index < characters.length; index += charactersPerColumn) {
      columns.push(characters.slice(index, index + charactersPerColumn));
    }
    const columnGap = fontSize * 1.18;
    const verticalPanelWidth = Math.round(
      Math.min(panelWidth, panelPadding * 2 + Math.max(1, columns.length) * columnGap),
    );
    const longestColumn = Math.max(...columns.map((column) => column.length), 1);
    const verticalPanelHeight = Math.round(
      panelPadding * 2 + longestColumn * fontSize * settings.lineHeight,
    );
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

  const availableWidth = panelWidth - panelPadding * 2;
  let lines = wrapText(message, availableWidth / fontSize);
  const widest = Math.max(...lines.map(visualUnits), 1);
  const fittedSize = Math.floor(availableWidth / widest);
  fontSize = Math.max(Math.round(dimensions.width * 0.027), Math.min(fontSize, fittedSize));
  lines = wrapText(message, availableWidth / fontSize);

  const effectiveLineHeight = fontSize * settings.lineHeight;
  const panelHeight = Math.round(
    panelPadding * 2 + Math.max(fontSize, lines.length * effectiveLineHeight),
  );
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
    <text x="${x + Math.round(318 * scale)}" y="${y + Math.round(68 * scale)}" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-family="Noto Sans JP, sans-serif" font-size="${Math.round(33 * scale)}" font-weight="800">© 安全AIポータル</text>
  </g>`;
}

function posterSvg(options: {
  theme: SafetyImageTheme;
  dimensions: Dimensions;
  source: Buffer;
  mascot: Buffer;
  settings: SafetyImageRenderSettings;
}): string {
  const sourceData = `data:image/png;base64,${options.source.toString("base64")}`;
  const text = textLayer({
    theme: options.theme,
    dimensions: options.dimensions,
    settings: options.settings,
  });
  const brand =
    options.settings.mode !== "clean" && options.settings.brand
      ? brandLayer(options.dimensions, options.mascot)
      : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${options.dimensions.width}" height="${options.dimensions.height}" viewBox="0 0 ${options.dimensions.width} ${options.dimensions.height}">
  <rect width="100%" height="100%" fill="#eef7f7"/>
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

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function addPngDensity(png: Buffer): Buffer {
  const signatureLength = 8;
  const ihdrLength = 25;
  const insertion = signatureLength + ihdrLength;
  if (png.subarray(1, 4).toString("ascii") !== "PNG") return png;
  const type = Buffer.from("pHYs", "ascii");
  const data = Buffer.alloc(9);
  data.writeUInt32BE(11811, 0);
  data.writeUInt32BE(11811, 4);
  data[8] = 1;
  const chunk = Buffer.alloc(4 + type.length + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  type.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), 17);
  return Buffer.concat([png.subarray(0, insertion), chunk, png.subarray(insertion)]);
}

export async function renderSafetyImage(options: {
  theme: SafetyImageTheme;
  paper: SafetyImagePaper;
  orientation: SafetyImageOrientation;
  format: SafetyImageFormat;
  source: Buffer;
  mascotPath: string;
  fontPath: string;
  latinFontPath: string;
  wasmPath: string;
  settings: SafetyImageRenderSettings;
  /** Small deterministic canvas used only by renderer tests; production omits it. */
  dimensions?: Dimensions;
}): Promise<Buffer> {
  const dimensions =
    options.dimensions ?? getSafetyImagePixelDimensions(options.paper, options.orientation);
  const [mascot, font, latinFont] = await Promise.all([
    cachedBinary(options.mascotPath),
    cachedBinary(options.fontPath),
    cachedBinary(options.latinFontPath),
    ensureWasm(options.wasmPath),
  ]);
  const svg = posterSvg({
    theme: options.theme,
    dimensions,
    source: options.source,
    mascot,
    settings: options.settings,
  });
  const renderer = new Resvg(svg, {
    background: "#eef7f7",
    dpi: 300,
    textRendering: 1,
    imageRendering: 0,
    font: {
      fontBuffers: [new Uint8Array(font), new Uint8Array(latinFont)],
      defaultFontFamily: "Noto Sans JP",
      sansSerifFamily: "Noto Sans JP",
    },
  });
  const rendered = renderer.render();
  try {
    if (rendered.width !== dimensions.width || rendered.height !== dimensions.height) {
      throw new Error(`Unexpected output dimensions: ${rendered.width}x${rendered.height}`);
    }
    if (options.format === "png") {
      return addPngDensity(Buffer.from(rendered.asPng()));
    }
    const encoded = encodeJpeg(
      {
        data: Buffer.from(rendered.pixels),
        width: rendered.width,
        height: rendered.height,
      },
      92,
    );
    const jpeg = addJpegDensity(Buffer.from(encoded.data));
    return options.format === "pdf"
      ? buildSafetyImagePdf({
          jpeg,
          paper: options.paper,
          orientation: options.orientation,
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
}): Buffer {
  const pixels = getSafetyImagePixelDimensions(options.paper, options.orientation);
  const page = getPagePoints(options.paper, options.orientation);
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
