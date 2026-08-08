import { NextResponse, type NextRequest } from "next/server";
import { runProductionSearchConsoleOperations } from "@/lib/search-console/production-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (
    process.env.VERCEL_ENV !== "preview" ||
    !hostname.endsWith(".vercel.app") ||
    request.nextUrl.search
  ) {
    return new NextResponse(null, { status: 404, headers: HEADERS });
  }
  if (
    process.env.SEARCH_CONSOLE_OPERATIONS_ENABLED?.trim().toLowerCase() !==
    "true"
  ) {
    return NextResponse.json(
      {
        ok: true,
        mode: "preview-read-only",
        productionMutations: 0,
        previewUrlsSubmitted: 0,
        searchConsole: {
          access: "blocked-external",
          probe: "disabled-until-property-access",
        },
      },
      { status: 200, headers: HEADERS },
    );
  }

  const searchConsole = await runProductionSearchConsoleOperations({
    allowMutations: false,
    inspectUrls: false,
  });
  return NextResponse.json(
    {
      ok: true,
      mode: "preview-read-only",
      productionMutations: 0,
      previewUrlsSubmitted: 0,
      searchConsole,
    },
    { status: 200, headers: HEADERS },
  );
}
