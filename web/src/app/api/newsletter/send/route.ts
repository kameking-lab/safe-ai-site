import { NextResponse } from "next/server";
import {
  bearerAuthError,
  verifyBearerSecret,
} from "@/lib/server/bearer-auth";

export async function POST(request: Request) {
  const auth = verifyBearerSecret(
    request,
    process.env.NEWSLETTER_ADMIN_TOKEN,
  );
  if (!auth.ok) return bearerAuthError(auth);

  return NextResponse.json(
    {
      ok: false,
      sent: 0,
      reason: "opaque_unsubscribe_flow_required",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
