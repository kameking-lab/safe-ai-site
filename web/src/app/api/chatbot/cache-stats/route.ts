import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/chatbot-cache";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = verifyBearerSecret(request, process.env.ADMIN_HEALTH_KEY);
  if (!access.ok) return bearerAuthError(access);

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
