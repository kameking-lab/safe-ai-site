import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  authenticateSignageDevice,
  recordSignageHeartbeat,
} from "@/lib/signage/fleet-repository";
import {
  hashSignageDeviceToken,
  hashSignageHeartbeatNonce,
  heartbeatTimestampAllowed,
} from "@/lib/signage/fleet-governance";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const heartbeatSchema = z
  .object({
    nonce: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
    observedAt: z.string().datetime(),
    status: z.enum(["online", "degraded", "emergency"]),
    softwareVersion: z.string().trim().min(1).max(80),
    configurationVersion: z.number().int().positive().nullable(),
    configChecksum: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32,128}$/)
      .nullable(),
    diagnostics: z
      .record(
        z.string().regex(/^(display|network|weather|content|storage|clock)$/),
        z.union([z.string().max(120), z.number().finite(), z.boolean(), z.null()]),
      )
      .default({}),
  })
  .strict();

function tokenSecret(): string | null {
  const value =
    process.env.SIGNAGE_FLEET_TOKEN_SECRET?.trim() ||
    process.env.SHARED_STATE_HMAC_SECRET?.trim() ||
    process.env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{32,160})$/);
  return match?.[1] ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const rawToken = bearerToken(request);
  const secret = tokenSecret();
  if (!rawToken || !secret) {
    return privateJson({ ok: false, reason: "device_auth_unavailable" }, 401);
  }
  let tokenHash: string;
  try {
    tokenHash = hashSignageDeviceToken(rawToken, secret);
  } catch {
    return privateJson({ ok: false, reason: "device_auth_invalid" }, 401);
  }
  const rateLimit = await sharedRateLimitGuard(
    request,
    {
      routeKey: "signage.fleet.heartbeat",
      limit: 30,
      windowMs: 60_000,
    },
    { subject: tokenHash },
  );
  if (rateLimit) return rateLimit;
  if (!prisma) {
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  const device = await authenticateSignageDevice(
    prisma as unknown as GovernanceSql,
    tokenHash,
  ).catch(() => null);
  if (!device) {
    return privateJson({ ok: false, reason: "device_auth_invalid" }, 401);
  }

  const body = await readBoundedJson(request, 16 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = heartbeatSchema.safeParse(body.value);
  if (!parsed.success || Object.keys(parsed.data?.diagnostics ?? {}).length > 6) {
    return privateJson({ ok: false, reason: "invalid_heartbeat" }, 400);
  }
  const observedAt = new Date(parsed.data.observedAt);
  if (!heartbeatTimestampAllowed(observedAt)) {
    return privateJson({ ok: false, reason: "heartbeat_clock_skew" }, 409);
  }
  let nonceHash: string;
  try {
    nonceHash = hashSignageHeartbeatNonce(
      device.id,
      parsed.data.nonce,
      secret,
    );
  } catch {
    return privateJson({ ok: false, reason: "invalid_heartbeat" }, 400);
  }
  try {
    const result = await recordSignageHeartbeat(
      prisma as unknown as GovernanceDatabase,
      {
        deviceId: device.id,
        nonceHash,
        observedAt,
        status: parsed.data.status,
        softwareVersion: parsed.data.softwareVersion,
        configurationVersion: parsed.data.configurationVersion,
        configChecksum: parsed.data.configChecksum,
        diagnostics: parsed.data.diagnostics,
      },
    );
    if (!result.ok) {
      return privateJson(
        { ok: false, reason: result.reason },
        result.reason === "device_not_found" ? 401 : 409,
      );
    }
    return privateJson({
      ok: true,
      deviceId: device.id,
      state: result.state,
      acknowledged: result.acknowledged,
      configuration: result.configuration,
    });
  } catch {
    return privateJson({ ok: false, reason: "heartbeat_unavailable" }, 503);
  }
}
