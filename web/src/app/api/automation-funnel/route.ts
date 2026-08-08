import { NextResponse } from "next/server";
import { consumeRumRateLimit } from "@/lib/rum/postgres-store";
import { automationFunnelPayloadSchema } from "@/lib/automation-funnel/schema";
import { getAutomationFunnelServerReadiness } from "@/lib/automation-funnel/server-readiness";
import {
  anonymizeAutomationFunnelBucket,
  persistAutomationFunnelEvent,
} from "@/lib/automation-funnel/postgres-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function errorResponse(status: number, code: string) {
  return NextResponse.json(
    { ok: false, error: { code } },
    { status, headers: HEADERS },
  );
}

export async function POST(request: Request) {
  const readiness = getAutomationFunnelServerReadiness();
  if (!readiness.ready || !readiness.retentionDays) {
    return errorResponse(503, "funnel_unavailable");
  }
  const requestUrl = new URL(request.url);
  if (requestUrl.search) {
    return errorResponse(400, "invalid_request_url");
  }
  if (request.headers.get("origin") !== requestUrl.origin) {
    return errorResponse(403, "invalid_origin");
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return errorResponse(415, "unsupported_media_type");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large");
  }
  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "invalid_json");
  }
  const parsed = automationFunnelPayloadSchema.safeParse(input);
  if (!parsed.success) return errorResponse(422, "invalid_payload");

  // The rate key is derived only from the consented random bucket. Request IP,
  // exact user agent, query, cookies and form fields are never read or stored.
  const clientKey = anonymizeAutomationFunnelBucket(
    parsed.data.anonymous_bucket,
  );
  if (!clientKey) return errorResponse(503, "funnel_unavailable");
  try {
    const limit = await consumeRumRateLimit(clientKey);
    if (!limit.allowed) {
      const response = errorResponse(429, "rate_limited");
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }
  } catch {
    return errorResponse(503, "funnel_unavailable");
  }

  try {
    await persistAutomationFunnelEvent(parsed.data, readiness.retentionDays);
  } catch {
    return errorResponse(503, "funnel_unavailable");
  }
  return new Response(null, { status: 204, headers: HEADERS });
}

export function GET() {
  return errorResponse(405, "method_not_allowed");
}
