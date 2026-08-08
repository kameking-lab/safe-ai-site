import "server-only";

import { NextResponse } from "next/server";

export type BearerAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; code: "unauthorized" | "auth_not_configured" };

/** Fail-closed bearer authentication for cron and administrative routes. */
export function verifyBearerSecret(request: Request, secret: string | undefined): BearerAuthResult {
  if (!secret?.trim()) {
    return { ok: false, status: 503, code: "auth_not_configured" };
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return { ok: false, status: 401, code: "unauthorized" };
  }
  return { ok: true };
}

export function bearerAuthError(result: Exclude<BearerAuthResult, { ok: true }>): NextResponse {
  return NextResponse.json(
    { error: result.code },
    { status: result.status, headers: { "Cache-Control": "no-store" } }
  );
}
