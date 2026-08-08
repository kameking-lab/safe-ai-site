import { NextResponse } from "next/server";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export async function POST(req: Request) {
  const auth = verifyBearerSecret(req, process.env.CRON_SECRET);
  if (!auth.ok) return bearerAuthError(auth);

  // 旧実装は `audience:<id>` を通常メールの宛先として渡しており、Resendの
  // Audience配信にはならない。正しいBroadcast配信、重複防止台帳、JMAイベントID
  // 検証が揃うまでは誤配信・重複配信を避けるためfail-closedとする。
  return NextResponse.json(
    { success: false, delivered: false, reason: "delivery_unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
  );
}
