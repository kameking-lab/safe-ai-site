import { join } from "node:path";
import {
  DIRECT_TEXT_IS_EXACT,
  isPilotLanguage,
  type PilotBrand,
  type PilotFormat,
  type PilotPaper,
  type PilotVariant,
} from "@/data/safety-image-pilot";
import {
  buildPilotPdf,
  renderPilotJpeg,
} from "@/lib/safety-image-pilot/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VARIANTS = new Set<PilotVariant>(["a", "b"]);
const PAPERS = new Set<PilotPaper>(["A4", "A3"]);
const FORMATS = new Set<PilotFormat>(["jpeg", "pdf"]);
const BRANDS = new Set<PilotBrand>(["branded", "clean"]);

function badRequest(message: string): Response {
  return Response.json(
    { error: message },
    {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const variant = (search.get("variant") ?? "a") as PilotVariant;
  const language = search.get("lang") ?? "all";
  const brand = (search.get("brand") ?? "branded") as PilotBrand;
  const paper = (search.get("paper")?.toUpperCase() ?? "A4") as PilotPaper;
  const format = (search.get("format")?.toLowerCase() ?? "jpeg") as PilotFormat;

  if (!VARIANTS.has(variant)) return badRequest("variant must be a or b");
  if (!isPilotLanguage(language)) return badRequest("unsupported language");
  if (!BRANDS.has(brand)) return badRequest("brand must be branded or clean");
  if (!PAPERS.has(paper)) return badRequest("paper must be A4 or A3");
  if (!FORMATS.has(format)) return badRequest("format must be jpeg or pdf");
  if (variant === "b" && language !== "all") {
    return badRequest("variant b contains the fixed five-language text only");
  }
  if (variant === "b" && !DIRECT_TEXT_IS_EXACT) {
    return Response.json(
      { error: "The direct-text comparison is not approved for download" },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  }

  const pilotAssetRoot = join(process.cwd(), "src", "assets", "safety-image-pilot");
  const jpeg = await renderPilotJpeg({
    variant,
    language,
    brand,
    paper,
    cleanSourcePath: join(
      pilotAssetRoot,
      "originals",
      "helmet-required-clean-original.png",
    ),
    directTextSourcePath: join(
      pilotAssetRoot,
      "originals",
      "helmet-required-direct-text-original.png",
    ),
    mascotPath: join(process.cwd(), "public", "mascot", "mascot-head-256.png"),
    fontPath: join(pilotAssetRoot, "fonts", "NotoSansJP-Bold.ttf"),
    wasmPath: join(
      process.cwd(),
      "node_modules",
      "@resvg",
      "resvg-wasm",
      "index_bg.wasm",
    ),
  });
  const body = format === "pdf" ? buildPilotPdf({ jpeg, paper }) : jpeg;
  const extension = format === "pdf" ? "pdf" : "jpg";
  const fileName = `helmet-required-${variant}-${language.toLowerCase()}-${brand}-${paper.toLowerCase()}-portrait.${extension}`;

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "image/jpeg",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
