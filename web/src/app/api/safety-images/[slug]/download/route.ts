import { join } from "node:path";
import {
  getSafetyImageTheme,
  SAFETY_IMAGE_LANGUAGES,
  type SafetyImageLanguage,
  type SafetyImageOrientation,
} from "@/data/safety-image-library";
import {
  renderSafetyImage,
  type SafetyImageDownloadMode,
  type SafetyImageFontSize,
  type SafetyImageFormat,
  type SafetyImagePadding,
  type SafetyImagePaper,
  type SafetyImageRenderSettings,
  type SafetyImageTextAlign,
  type SafetyImageTextPosition,
  type SafetyImageWritingMode,
} from "@/lib/safety-image-library/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAPERS = new Set<SafetyImagePaper>(["A4", "A3"]);
const ORIENTATIONS = new Set<SafetyImageOrientation>(["portrait", "landscape"]);
const FORMATS = new Set<SafetyImageFormat>(["jpeg", "pdf", "png"]);
const MODES = new Set<SafetyImageDownloadMode>(["clean", "default", "edited"]);
const FONT_SIZES = new Set<SafetyImageFontSize>(["small", "standard", "large"]);
const POSITIONS = new Set<SafetyImageTextPosition>(["top", "center", "bottom"]);
const ALIGNS = new Set<SafetyImageTextAlign>(["left", "center", "right"]);
const PADDINGS = new Set<SafetyImagePadding>(["small", "standard", "large"]);
const WRITING_MODES = new Set<SafetyImageWritingMode>(["horizontal", "vertical"]);
const LANGUAGES = new Set<string>(SAFETY_IMAGE_LANGUAGES);
const HEX_COLOR = /^#[0-9a-f]{6}$/iu;
const NUMERIC_VALUE = /^[0-9０-９○〇.＋+\-/() ]{0,24}$/u;
const UNIT = /^[a-zA-Z0-9%²³㎡㎥°℃/・\- ]{0,16}$/u;

type RouteContext = { params: Promise<{ slug: string }> };

function errorResponse(message: string, status = 400): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function isShortPlainText(value: unknown, maxLength: number, maxLines: number): value is string {
  if (typeof value !== "string" || value.length > maxLength) return false;
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");
  return lines.length <= maxLines && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function defaultSettings(options: {
  language: SafetyImageLanguage;
  mode: SafetyImageDownloadMode;
  text: string;
  orientation: SafetyImageOrientation;
  brand: boolean;
}): SafetyImageRenderSettings {
  return {
    mode: options.mode,
    language: options.language,
    text: options.text,
    fontSize: "standard",
    position: options.orientation === "portrait" ? "top" : "bottom",
    textColor: "#082f49",
    band: true,
    bandColor: "#ffffff",
    brand: options.mode === "clean" ? false : options.brand,
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

function parsePostSettings(
  input: unknown,
  defaults: SafetyImageRenderSettings,
): SafetyImageRenderSettings | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const body = input as Record<string, unknown>;
  if (!MODES.has(body.mode as SafetyImageDownloadMode)) return undefined;
  if (!LANGUAGES.has(String(body.language))) return undefined;
  if (!isShortPlainText(body.text, 180, 5)) return undefined;
  if (!FONT_SIZES.has(body.fontSize as SafetyImageFontSize)) return undefined;
  if (!POSITIONS.has(body.position as SafetyImageTextPosition)) return undefined;
  if (typeof body.textColor !== "string" || !HEX_COLOR.test(body.textColor)) return undefined;
  if (typeof body.bandColor !== "string" || !HEX_COLOR.test(body.bandColor)) return undefined;
  if (!ALIGNS.has(body.align as SafetyImageTextAlign)) return undefined;
  if (!PADDINGS.has(body.padding as SafetyImagePadding)) return undefined;
  if (!WRITING_MODES.has(body.writingMode as SafetyImageWritingMode)) return undefined;
  if (!isShortPlainText(body.subMessage, 72, 2)) return undefined;
  if (typeof body.numericValue !== "string" || !NUMERIC_VALUE.test(body.numericValue)) return undefined;
  if (typeof body.numericUnit !== "string" || !UNIT.test(body.numericUnit)) return undefined;
  const lineHeight = Number(body.lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight < 0.9 || lineHeight > 1.8) return undefined;
  return {
    ...defaults,
    mode: body.mode as SafetyImageDownloadMode,
    language: body.language as SafetyImageLanguage,
    text: body.text,
    fontSize: body.fontSize as SafetyImageFontSize,
    position: body.position as SafetyImageTextPosition,
    textColor: body.textColor,
    band: booleanValue(body.band, true),
    bandColor: body.bandColor,
    brand: body.mode === "clean" ? false : booleanValue(body.brand, true),
    lineHeight,
    align: body.align as SafetyImageTextAlign,
    border: booleanValue(body.border, true),
    padding: body.padding as SafetyImagePadding,
    writingMode: body.writingMode as SafetyImageWritingMode,
    subMessage: body.subMessage,
    numericValue: body.numericValue,
    numericUnit: body.numericUnit,
  };
}

function assetRequestHeaders(request: Request, accept: string): HeadersInit {
  const headers: Record<string, string> = { Accept: accept };
  const protectionBypass = request.headers.get("x-vercel-protection-bypass");
  const cookie = request.headers.get("cookie");
  // Preview protection is evaluated again when the function reads its own
  // same-origin public master. Forward only the incoming same-origin access
  // proof; never persist it, log it, or accept an alternate asset host.
  if (protectionBypass) headers["x-vercel-protection-bypass"] = protectionBypass;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

async function fetchCleanMaster(request: Request, originalPath: string): Promise<Buffer> {
  const sourceUrl = new URL(originalPath, request.url);
  const response = await fetch(sourceUrl, {
    // Public originals are already CDN-cacheable. Avoid Next's 2 MiB Data Cache
    // limit for generated PNG masters and keep server logs free of cache-write failures.
    cache: "no-store",
    headers: assetRequestHeaders(request, "image/png"),
  });
  if (!response.ok) throw new Error(`Clean master returned ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/png")) throw new Error("Clean master is not PNG");
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > 10 * 1024 * 1024) throw new Error("Clean master is too large");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024 || bytes.length > 10 * 1024 * 1024) {
    throw new Error("Clean master size is invalid");
  }
  return bytes;
}

function contentType(format: SafetyImageFormat): string {
  if (format === "pdf") return "application/pdf";
  if (format === "png") return "image/png";
  return "image/jpeg";
}

function extension(format: SafetyImageFormat): string {
  if (format === "pdf") return "pdf";
  if (format === "png") return "png";
  return "jpg";
}

async function renderResponse(options: {
  request: Request;
  slug: string;
  paper: SafetyImagePaper;
  orientation: SafetyImageOrientation;
  format: SafetyImageFormat;
  settings: SafetyImageRenderSettings;
  cacheControl: string;
}) {
  const theme = getSafetyImageTheme(options.slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  if (options.format === "png" && !theme.pngAvailable) {
    return errorResponse("PNG is available for construction-plan illustrations only");
  }
  let source: Buffer;
  try {
    source = await fetchCleanMaster(options.request, theme.originalPath);
  } catch {
    return errorResponse("Clean master could not be loaded", 502);
  }
  const assetRoot = join(process.cwd(), "src", "assets", "safety-image-pilot");
  let body: Buffer;
  try {
    body = await renderSafetyImage({
      theme,
      paper: options.paper,
      orientation: options.orientation,
      format: options.format,
      source,
      settings: options.settings,
      mascotPath: join(process.cwd(), "public", "mascot", "mascot-head-256.png"),
      fontPath: join(assetRoot, "fonts", "NotoSansJP-Bold.ttf"),
      latinFontPath: join(
        process.cwd(),
        "src",
        "assets",
        "safety-image-library",
        "fonts",
        "NotoSans-Bold.ttf",
      ),
      wasmPath: join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
    });
  } catch {
    return errorResponse("Download rendering failed", 500);
  }
  const fileName = `${theme.slug}-${options.settings.mode}-${options.settings.language.toLowerCase()}-${options.paper.toLowerCase()}-${options.orientation}.${extension(options.format)}`;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType(options.format),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(body.length),
      "Cache-Control": options.cacheControl,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "X-Safety-Image-Method": "generated-clean-master-plus-code-overlay",
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const search = new URL(request.url).searchParams;
  const paper = (search.get("paper")?.toUpperCase() ?? "A4") as SafetyImagePaper;
  const orientation = (search.get("orientation") ?? theme.orientation) as SafetyImageOrientation;
  const format = (search.get("format")?.toLowerCase() ?? "jpeg") as SafetyImageFormat;
  const mode = (search.get("mode") ?? "default") as SafetyImageDownloadMode;
  const language = (search.get("lang") ?? "ja") as SafetyImageLanguage;
  const brand = search.get("brand") !== "none";
  if (!PAPERS.has(paper)) return errorResponse("paper must be A4 or A3");
  if (!ORIENTATIONS.has(orientation)) return errorResponse("orientation is invalid");
  if (!FORMATS.has(format)) return errorResponse("format is invalid");
  if (mode !== "clean" && mode !== "default") return errorResponse("GET supports clean or default mode");
  if (!LANGUAGES.has(language)) return errorResponse("language is invalid");
  return renderResponse({
    request,
    slug,
    paper,
    orientation,
    format,
    settings: defaultSettings({
      language,
      mode,
      text: theme.texts[language],
      orientation,
      brand,
    }),
    cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
  });
}

export async function HEAD(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const search = new URL(request.url).searchParams;
  const paper = (search.get("paper")?.toUpperCase() ?? "A4") as SafetyImagePaper;
  const orientation = (search.get("orientation") ?? theme.orientation) as SafetyImageOrientation;
  const format = (search.get("format")?.toLowerCase() ?? "jpeg") as SafetyImageFormat;
  const mode = (search.get("mode") ?? "default") as SafetyImageDownloadMode;
  const language = (search.get("lang") ?? "ja") as SafetyImageLanguage;
  if (
    !PAPERS.has(paper) ||
    !ORIENTATIONS.has(orientation) ||
    !FORMATS.has(format) ||
    (mode !== "clean" && mode !== "default") ||
    !LANGUAGES.has(language) ||
    (format === "png" && !theme.pngAvailable)
  ) {
    return errorResponse("Unsupported download combination");
  }
  const sourceUrl = new URL(theme.originalPath, request.url);
  let sourceResponse: Response;
  try {
    sourceResponse = await fetch(sourceUrl, {
      method: "HEAD",
      cache: "force-cache",
      headers: assetRequestHeaders(request, "image/png"),
    });
  } catch {
    return errorResponse("Clean master could not be checked", 502);
  }
  if (!sourceResponse.ok) return errorResponse("Clean master could not be checked", 502);
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": contentType(format),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Safety-Image-Method": "generated-clean-master-plus-code-overlay",
      "X-Safety-Image-Dimensions": `${paper}-${orientation}-300dpi`,
      "X-Safety-Image-Source": "available",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16 * 1024) return errorResponse("Request body is too large", 413);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid JSON body");
  }
  const paper = String(body.paper ?? "A4").toUpperCase() as SafetyImagePaper;
  const orientation = String(body.orientation ?? theme.orientation) as SafetyImageOrientation;
  const format = String(body.format ?? "jpeg").toLowerCase() as SafetyImageFormat;
  if (!PAPERS.has(paper) || !ORIENTATIONS.has(orientation) || !FORMATS.has(format)) {
    return errorResponse("Invalid paper, orientation or format");
  }
  const defaults = defaultSettings({
    language: "ja",
    mode: "edited",
    text: theme.texts.ja,
    orientation,
    brand: true,
  });
  const settings = parsePostSettings(body.settings, defaults);
  if (!settings) return errorResponse("Invalid or unsafe edit settings");
  return renderResponse({
    request,
    slug,
    paper,
    orientation,
    format,
    settings,
    cacheControl: "private, no-store, max-age=0, must-revalidate",
  });
}
