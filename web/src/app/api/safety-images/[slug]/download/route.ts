import { join } from "node:path";
import {
  getSafetyImageTheme,
  SAFETY_IMAGE_LANGUAGES,
  type SafetyImageLanguage,
  type SafetyImageOrientation,
} from "@/data/safety-image-library";
import {
  defaultOutputSize,
  getSafetySignOutputSize,
  type SafetySignOutputSize,
} from "@/data/safety-image-library/sizes";
import {
  renderSafetyImage,
  SafetyImageTextOverflowError,
  type SafetyImageDownloadMode,
  type SafetyImageFontSize,
  type SafetyImageFormat,
  type SafetyImagePadding,
  type SafetyImageRenderSettings,
  type SafetyImageTextAlign,
  type SafetyImageTextPosition,
  type SafetyImageWritingMode,
} from "@/lib/safety-image-library/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FORMATS = new Set<SafetyImageFormat>(["jpeg", "pdf", "png"]);
const FONT_SIZES = new Set<SafetyImageFontSize>(["small", "standard", "large"]);
const POSITIONS = new Set<SafetyImageTextPosition>(["top", "center", "bottom"]);
const ALIGNS = new Set<SafetyImageTextAlign>(["left", "center", "right"]);
const PADDINGS = new Set<SafetyImagePadding>(["small", "standard", "large"]);
const WRITING_MODES = new Set<SafetyImageWritingMode>(["horizontal", "vertical"]);
const LANGUAGES = new Set<string>(SAFETY_IMAGE_LANGUAGES);
const HEX_COLOR = /^#[0-9a-f]{6}$/iu;
const UNIT = /^[\p{L}\p{N}%‰²³㎡㎥°℃/・.\- ]{0,16}$/u;
const DOWNLOAD_QUERY_KEYS = new Set(["brand", "format", "lang", "mode", "orientation", "paper", "size"]);
const RENDER_RATE_WINDOW_MS = 60_000;
const RENDER_RATE_LIMIT = 24;
const renderRateBuckets = new Map<string, { startedAt: number; count: number }>();
let activeRenderCount = 0;

type RouteContext = { params: Promise<{ slug: string }> };

function errorResponse(message: string, status = 400, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Content-Type-Options": "nosniff",
        ...extraHeaders,
      },
    },
  );
}

export function hasOnlyCanonicalQuery(search: URLSearchParams): boolean {
  for (const key of search.keys()) {
    if (!DOWNLOAD_QUERY_KEYS.has(key) || search.getAll(key).length !== 1) return false;
  }
  const hasLegacyPaper = search.has("paper");
  const hasLegacyOrientation = search.has("orientation");
  if (search.has("size") && (hasLegacyPaper || hasLegacyOrientation)) return false;
  if (hasLegacyPaper !== hasLegacyOrientation) return false;
  if (hasLegacyPaper) {
    if (!new Set(["A4", "A3"]).has(search.get("paper") ?? "")) return false;
    if (!new Set(["portrait", "landscape"]).has(search.get("orientation") ?? "")) return false;
  }
  const brand = search.get("brand");
  return brand === null || brand === "branded" || brand === "none";
}

function acquireRenderSlot(request: Request): (() => void) | Response {
  const now = Date.now();
  if (renderRateBuckets.size > 1_024) {
    for (const [key, bucket] of renderRateBuckets) {
      if (now - bucket.startedAt >= RENDER_RATE_WINDOW_MS) renderRateBuckets.delete(key);
    }
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const requestKey = forwarded || request.headers.get("x-real-ip")?.trim() || "local-request";
  const current = renderRateBuckets.get(requestKey);
  const bucket = !current || now - current.startedAt >= RENDER_RATE_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : current;
  bucket.count += 1;
  renderRateBuckets.set(requestKey, bucket);
  if (bucket.count > RENDER_RATE_LIMIT || activeRenderCount >= 1) {
    return errorResponse("Download renderer is busy. Please retry shortly.", 429, { "Retry-After": "5" });
  }
  activeRenderCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeRenderCount = Math.max(0, activeRenderCount - 1);
  };
}

function shortPlainText(value: unknown, maxLength: number, maxLines: number): value is string {
  if (typeof value !== "string" || value.length > maxLength) return false;
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");
  return lines.length <= maxLines && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

export function isSafeSafetyImageUnit(value: unknown): value is string {
  return typeof value === "string" && UNIT.test(value) && shortPlainText(value, 16, 1);
}

export function isSafeSafetyImageMainText(value: unknown): value is string {
  return shortPlainText(value, 180, 12);
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function renderOrientation(size: SafetySignOutputSize): SafetyImageOrientation {
  const definition = getSafetySignOutputSize(size);
  if (!definition) return "portrait";
  return definition.widthMm >= definition.heightMm ? "landscape" : "portrait";
}

function legacySize(search: URLSearchParams): SafetySignOutputSize | undefined {
  const paper = search.get("paper")?.toUpperCase();
  const orientation = search.get("orientation")?.toLowerCase();
  if (paper !== "A4" && paper !== "A3") return undefined;
  if (orientation !== "portrait" && orientation !== "landscape") return undefined;
  return `${paper.toLowerCase()}-${orientation}` as SafetySignOutputSize;
}

function requestedSize(value: unknown, fallback: SafetySignOutputSize) {
  if (value === undefined || value === null || value === "") return fallback;
  const size = String(value) as SafetySignOutputSize;
  return getSafetySignOutputSize(size) ? size : undefined;
}

function defaults(options: {
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

function parseSettings(input: unknown, fallback: SafetyImageRenderSettings) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const body = input as Record<string, unknown>;
  if (body.mode !== "edited" || !LANGUAGES.has(String(body.language))) return undefined;
  if (!isSafeSafetyImageMainText(body.text) || !shortPlainText(body.subMessage, 72, 2)) return undefined;
  if (!FONT_SIZES.has(body.fontSize as SafetyImageFontSize)) return undefined;
  if (!POSITIONS.has(body.position as SafetyImageTextPosition)) return undefined;
  if (!ALIGNS.has(body.align as SafetyImageTextAlign)) return undefined;
  if (!PADDINGS.has(body.padding as SafetyImagePadding)) return undefined;
  if (!WRITING_MODES.has(body.writingMode as SafetyImageWritingMode)) return undefined;
  if (typeof body.textColor !== "string" || !HEX_COLOR.test(body.textColor)) return undefined;
  if (typeof body.bandColor !== "string" || !HEX_COLOR.test(body.bandColor)) return undefined;
  if (!shortPlainText(body.numericValue, 24, 1)) return undefined;
  if (!isSafeSafetyImageUnit(body.numericUnit)) return undefined;
  const lineHeight = Number(body.lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight < 0.9 || lineHeight > 1.8) return undefined;
  return {
    ...fallback,
    mode: "edited" as const,
    language: body.language as SafetyImageLanguage,
    text: body.text,
    fontSize: body.fontSize as SafetyImageFontSize,
    position: body.position as SafetyImageTextPosition,
    textColor: body.textColor,
    band: bool(body.band, true),
    bandColor: body.bandColor,
    brand: bool(body.brand, true),
    lineHeight,
    align: body.align as SafetyImageTextAlign,
    border: bool(body.border, true),
    padding: body.padding as SafetyImagePadding,
    writingMode: body.writingMode as SafetyImageWritingMode,
    subMessage: body.subMessage,
    numericValue: body.numericValue,
    numericUnit: body.numericUnit,
  } satisfies SafetyImageRenderSettings;
}

function assetHeaders(request: Request): HeadersInit {
  const headers: Record<string, string> = { Accept: "image/png" };
  const bypass = request.headers.get("x-vercel-protection-bypass");
  const cookie = request.headers.get("cookie");
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

async function cleanMaster(request: Request, path: string) {
  const response = await fetch(new URL(path, request.url), { cache: "no-store", headers: assetHeaders(request) });
  if (!response.ok || !(response.headers.get("content-type") ?? "").startsWith("image/png")) {
    throw new Error("clean master unavailable");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024 || bytes.length > 10 * 1024 * 1024) throw new Error("invalid clean master");
  return bytes;
}

function typeFor(format: SafetyImageFormat) {
  return format === "pdf" ? "application/pdf" : format === "png" ? "image/png" : "image/jpeg";
}

function extensionFor(format: SafetyImageFormat) {
  return format === "jpeg" ? "jpg" : format;
}

async function renderResponse(options: {
  request: Request;
  slug: string;
  size: SafetySignOutputSize;
  format: SafetyImageFormat;
  settings: SafetyImageRenderSettings;
  cacheControl: string;
}) {
  const theme = getSafetyImageTheme(options.slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const slot = acquireRenderSlot(options.request);
  if (slot instanceof Response) return slot;
  let releaseWithFinally = true;
  try {
  let source: Buffer;
  try {
    source = await cleanMaster(options.request, theme.originalPath);
  } catch {
    return errorResponse("Clean master could not be loaded", 502);
  }
  const orientation = renderOrientation(options.size);
  const assetRoot = join(process.cwd(), "src", "assets", "safety-image-library");
  let body: Buffer;
  try {
    body = await renderSafetyImage({
      theme,
      paper: "A4",
      orientation,
      outputSize: options.size,
      format: options.format,
      source,
      settings: options.settings,
      mascotPath: join(process.cwd(), "public", "mascot", "mascot-head-256.png"),
      fontPath: join(assetRoot, "fonts", "NotoSansCJKjp-Bold.otf"),
      simplifiedChineseFontPath: join(assetRoot, "fonts", "NotoSansCJKsc-Bold.otf"),
      latinFontPath: join(process.cwd(), "src", "assets", "safety-image-library", "fonts", "NotoSans-Bold.ttf"),
      wasmPath: join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
    });
  } catch (error) {
    if (error instanceof SafetyImageTextOverflowError) {
      return errorResponse("Text does not fit the selected output size", 422);
    }
    return errorResponse("Download rendering failed", 500);
  }
  const fileName = `${theme.slug}-${options.settings.mode}-${options.settings.language.toLowerCase()}-${options.size}.${extensionFor(options.format)}`;
  // Vercel Functions have a 4.5 MB buffered-response limit. Large A3 and
  // market-size print files are therefore emitted as bounded stream chunks.
  // The custom text remains only in memory and is never used in the URL,
  // filename, logs, cache key, or analytics payload.
  const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        slot();
        return;
      }
      const end = Math.min(offset + 256 * 1024, bytes.byteLength);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
    cancel() {
      slot();
    },
  });
  releaseWithFinally = false;
  return new Response(stream, {
    headers: {
      "Content-Type": typeFor(options.format),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": options.cacheControl,
      ...(options.cacheControl.startsWith("public")
        ? {
            "CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
            "Vercel-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          }
        : {}),
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "X-Safety-Image-Method": "generated-clean-master-plus-code-overlay",
      "X-Safety-Image-Size": `${options.size}-300dpi`,
    },
  });
  } finally {
    if (releaseWithFinally) slot();
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const search = new URL(request.url).searchParams;
  if (!hasOnlyCanonicalQuery(search)) return errorResponse("Unsupported query parameter");
  const fallback = defaultOutputSize(theme.recommendedSize, theme.orientation);
  const size = requestedSize(search.get("size") ?? legacySize(search), fallback);
  const format = (search.get("format")?.toLowerCase() ?? "jpeg") as SafetyImageFormat;
  const mode = (search.get("mode") ?? "default") as SafetyImageDownloadMode;
  const language = (search.get("lang") ?? "ja") as SafetyImageLanguage;
  if (!size) return errorResponse("size is invalid");
  if (!FORMATS.has(format)) return errorResponse("format is invalid");
  if (mode !== "clean" && mode !== "default") return errorResponse("GET supports clean or default mode");
  if (!LANGUAGES.has(language)) return errorResponse("language is invalid");
  const orientation = renderOrientation(size);
  return renderResponse({
    request,
    slug,
    size,
    format,
    settings: defaults({
      language,
      mode,
      text: theme.texts[language],
      orientation,
      brand: search.get("brand") !== "none",
    }),
    cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
  });
}

export async function HEAD(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const search = new URL(request.url).searchParams;
  if (!hasOnlyCanonicalQuery(search)) return errorResponse("Unsupported query parameter");
  const size = requestedSize(
    search.get("size") ?? legacySize(search),
    defaultOutputSize(theme.recommendedSize, theme.orientation),
  );
  const format = (search.get("format")?.toLowerCase() ?? "jpeg") as SafetyImageFormat;
  const mode = search.get("mode") ?? "default";
  const language = search.get("lang") ?? "ja";
  if (!size || !FORMATS.has(format) || !["clean", "default"].includes(mode) || !LANGUAGES.has(language)) {
    return errorResponse("Unsupported download combination");
  }
  try {
    const response = await fetch(new URL(theme.originalPath, request.url), {
      method: "HEAD",
      cache: "no-store",
      headers: assetHeaders(request),
    });
    if (!response.ok) throw new Error("unavailable");
  } catch {
    return errorResponse("Clean master could not be checked", 502);
  }
  return new Response(null, {
    headers: {
      "Content-Type": typeFor(format),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Vercel-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Safety-Image-Size": `${size}-300dpi`,
      "X-Safety-Image-Source": "available",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return errorResponse("Safety image not found", 404);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== new URL(request.url).origin) || fetchSite === "cross-site") {
    return errorResponse("Cross-site rendering is not allowed", 403);
  }
  if (Number(request.headers.get("content-length") ?? "0") > 16 * 1024) {
    return errorResponse("Request body is too large", 413);
  }
  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 16 * 1024) {
      return errorResponse("Request body is too large", 413);
    }
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid JSON body");
  }
  const size = requestedSize(body.size, defaultOutputSize(theme.recommendedSize, theme.orientation));
  const format = String(body.format ?? "jpeg").toLowerCase() as SafetyImageFormat;
  if (!size || !FORMATS.has(format)) return errorResponse("Invalid size or format");
  const orientation = renderOrientation(size);
  const settings = parseSettings(
    body.settings,
    defaults({ language: "ja", mode: "edited", text: theme.texts.ja, orientation, brand: true }),
  );
  if (!settings) return errorResponse("Invalid or unsafe edit settings");
  return renderResponse({
    request,
    slug,
    size,
    format,
    settings,
    cacheControl: "private, no-store, max-age=0, must-revalidate",
  });
}
