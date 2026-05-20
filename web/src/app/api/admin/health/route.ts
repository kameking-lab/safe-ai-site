import { NextResponse } from "next/server";
import { checkAllServices } from "@/lib/external/health";

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

  const services = await checkAllServices();
  const summary = {
    ok: services.filter((s) => s.status === "ok").length,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    notConfigured: services.filter((s) => s.status === "not_configured").length,
  };

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      summary,
      services,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
