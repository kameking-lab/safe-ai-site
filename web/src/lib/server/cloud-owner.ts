import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

export async function getCloudOwnerId(): Promise<string | null> {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: unknown } | undefined)?.id;
    if (typeof userId !== "string" || userId.trim().length === 0) return null;
    const digest = createHash("sha256").update(userId.trim(), "utf8").digest("base64url");
    return `user_${digest}`;
  } catch {
    return null;
  }
}

export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "payload_too_large" | "invalid_json" };

export async function readBoundedJson(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<BoundedJsonResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "payload_too_large" };
  }
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return { ok: false, reason: "payload_too_large" };
    }
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

export function privateJson(payload: unknown, status = 200): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function cloudAuthRequired(): NextResponse {
  return privateJson({ ok: false, reason: "authentication_required" }, 401);
}

/**
 * Browser-side opt-in is not an authorization boundary. Requiring a
 * versioned, purpose-specific proof on every cloud request makes accidental
 * calls fail closed before any body containing site or worker data is read.
 */
export function requireCloudConsent(
  request: Request,
  scope: "ky-v1" | "meeting-v1",
): NextResponse | null {
  return request.headers.get("x-cloud-consent") === scope
    ? null
    : privateJson({ ok: false, reason: "cloud_consent_required" }, 428);
}
