import { NextResponse } from "next/server";
import { getRumServerReadiness } from "@/lib/rum/server-readiness";
import { rumPayloadSchema } from "@/lib/rum/schema";
import {
  anonymizeRumClient,
  consumeRumRateLimit,
  getRumClientIp,
  persistRumMetric,
} from "@/lib/rum/postgres-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const FORWARD_TIMEOUT_MS = 4_000;

function errorResponse(status: number, code: string) {
  return NextResponse.json(
    { ok: false, error: { code } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}

function rateLimitedResponse(retryAfterSeconds: number) {
  const response = errorResponse(429, "rate_limited");
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function POST(request: Request) {
  const readiness = getRumServerReadiness();
  if (!readiness.ready || !readiness.sinkBackend) {
    return errorResponse(503, "rum_unavailable");
  }

  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return errorResponse(403, "invalid_origin");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse(415, "unsupported_media_type");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large");
  }

  if (readiness.sinkBackend === "postgres") {
    const anonymousClientKey = anonymizeRumClient(getRumClientIp(request));
    if (!anonymousClientKey) return errorResponse(503, "rum_unavailable");
    try {
      const rateLimit = await consumeRumRateLimit(anonymousClientKey);
      if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit.retryAfterSeconds);
      }
    } catch {
      return errorResponse(503, "sink_unavailable");
    }
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
  const parsed = rumPayloadSchema.safeParse(input);
  if (!parsed.success) return errorResponse(422, "invalid_payload");

  if (readiness.sinkBackend === "postgres") {
    if (!readiness.retentionDays) return errorResponse(503, "rum_unavailable");
    try {
      await persistRumMetric(parsed.data, readiness.retentionDays);
    } catch {
      return errorResponse(503, "sink_unavailable");
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  if (!readiness.sinkEndpoint) return errorResponse(503, "rum_unavailable");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "safe-ai-portal-rum/1",
  };
  const sinkToken = process.env.RUM_SINK_AUTH_TOKEN?.trim();
  if (sinkToken) headers.Authorization = `Bearer ${sinkToken}`;

  try {
    const response = await fetch(readiness.sinkEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    if (!response.ok) return errorResponse(503, "sink_unavailable");
  } catch {
    return errorResponse(503, "sink_unavailable");
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export function GET() {
  return errorResponse(405, "method_not_allowed");
}
