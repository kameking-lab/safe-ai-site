/** Browser Web Push subscription registration and removal API. */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/chatbot-rate-limit";
import { isMissingTableError, isWebPushConfigured } from "@/lib/notifications/push-server";
import {
  parsePushSubscriptionBody,
  validatePushEndpoint,
} from "@/lib/notifications/push-subscription-validation";
import { checkPushSubscriptionRateLimit } from "@/lib/notifications/push-subscription-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "push_subscriptions";
const MAX_BODY_BYTES = 16_384;
const PRIVATE_HEADERS = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...PRIVATE_HEADERS, ...headers },
  });
}

function notConfigured() {
  return json(
    {
      ok: false,
      reason: "not_configured",
      message: "プッシュ通知は現在利用できません。",
    },
    501,
  );
}

function cloudNotConfigured() {
  return json({ ok: false, reason: "cloud_not_configured" }, 503);
}

function tableNotReady() {
  return json(
    {
      ok: false,
      reason: "table_not_ready",
      message: "プッシュ通知は現在利用できません。",
    },
    501,
  );
}

type JsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid_json" | "payload_too_large" | "unsupported_media_type" };

async function readBoundedJson(request: Request): Promise<JsonReadResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.split(";", 1)[0]?.trim() !== "application/json") {
    return { ok: false, reason: "unsupported_media_type" };
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) return { ok: false, reason: "invalid_json" };
    if (Number(declaredLength) > MAX_BODY_BYTES) {
      return { ok: false, reason: "payload_too_large" };
    }
  }

  if (!request.body) return { ok: false, reason: "invalid_json" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "payload_too_large" };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  } finally {
    reader.releaseLock();
  }
}

async function rateLimitResponse(
  request: Request,
): Promise<NextResponse | null> {
  let result;
  try {
    result = await checkPushSubscriptionRateLimit(getClientIp(request));
  } catch {
    return json({ ok: false, reason: "shared_rate_limit_unavailable" }, 503, {
      "Retry-After": "60",
    });
  }
  if (result.allowed) return null;
  return json({ ok: false, reason: "rate_limited" }, 429, {
    "Retry-After": String(result.retryAfterSec),
  });
}

function bodyError(result: Extract<JsonReadResult, { ok: false }>) {
  const status = result.reason === "payload_too_large" ? 413 : result.reason === "unsupported_media_type" ? 415 : 400;
  return json({ ok: false, reason: result.reason }, status);
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;
  if (!isWebPushConfigured()) return notConfigured();

  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const body = await readBoundedJson(request);
  if (!body.ok) return bodyError(body);

  const subscription = parsePushSubscriptionBody(body.value);
  if (!subscription) {
    return json({ ok: false, reason: "invalid_subscription" }, 400);
  }

  const { error } = await supabase.from(TABLE).upsert(subscription, { onConflict: "endpoint" });
  if (error) {
    if (isMissingTableError(error)) return tableNotReady();
    return json({ ok: false, reason: "db_error" }, 502);
  }
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  const limited = await rateLimitResponse(request);
  if (limited) return limited;
  if (!isWebPushConfigured()) return notConfigured();

  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  if (!request.body) {
    return json({ ok: false, reason: "invalid_subscription" }, 400);
  }
  const body = await readBoundedJson(request);
  if (!body.ok) return bodyError(body);
  const endpointValue =
    typeof body.value === "object" && body.value !== null && !Array.isArray(body.value)
      ? (body.value as Record<string, unknown>).endpoint
      : null;

  const endpoint = validatePushEndpoint(endpointValue);
  if (!endpoint) {
    return json({ ok: false, reason: "invalid_subscription" }, 400);
  }

  const { error } = await supabase.from(TABLE).delete().eq("endpoint", endpoint);
  if (error) {
    if (isMissingTableError(error)) return tableNotReady();
    return json({ ok: false, reason: "db_error" }, 502);
  }
  return json({ ok: true });
}
