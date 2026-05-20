import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/chatbot-cache";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function extractProvidedKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() || null;
  }
  const url = new URL(request.url);
  return url.searchParams.get("key");
}

export async function GET(request: Request) {
  const expected = process.env.ADMIN_HEALTH_KEY;
  if (!expected) {
    return unauthorized();
  }
  const provided = extractProvidedKey(request);
  if (!provided || provided !== expected) {
    return unauthorized();
  }

  const stats = getCacheStats();
  const hitRate =
    stats.hits + stats.misses > 0
      ? stats.hits / (stats.hits + stats.misses)
      : 0;

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      stats,
      hitRate: Math.round(hitRate * 10000) / 10000,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, must-revalidate" },
    },
  );
}
