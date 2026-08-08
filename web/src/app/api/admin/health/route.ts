import { NextResponse } from "next/server";
import { checkAllServices } from "@/lib/external/health";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = verifyBearerSecret(request, process.env.ADMIN_HEALTH_KEY);
  if (!access.ok) return bearerAuthError(access);

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
