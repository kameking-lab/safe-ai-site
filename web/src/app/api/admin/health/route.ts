import { NextResponse } from "next/server";
import { checkAllServices } from "@/lib/external/health";

export const dynamic = "force-dynamic";

const VALID_KEY = "anzenai2026";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (key !== VALID_KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
