import { createHmac } from "node:crypto";
import {
  beginAutomationConsultIdempotency,
  completeAutomationConsultIdempotency,
  failAutomationConsultIdempotency,
  type AutomationConsultSuccess,
} from "./idempotency";
import {
  checkAutomationConsultRateLimit,
  type AutomationConsultRateLimitResult,
} from "./rate-limit";
import { isPreviewSafetyMode } from "@/lib/server/deployment-safety";
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

const SUCCESS_TTL_SECONDS = 24 * 60 * 60;
const PENDING_TTL_SECONDS = 5 * 60;
const RATE_WINDOW_SECONDS = 10 * 60;
const RATE_MAX_REQUESTS = 5;
const REQUEST_TIMEOUT_MS = 2_000;
const UPSTASH_HOST_SUFFIX = ".upstash.io";

export type AutomationConsultIdempotencyBeginResult =
  | { state: "new" }
  | { state: "replay"; response: AutomationConsultSuccess }
  | { state: "pending" }
  | { state: "conflict" };

export interface AutomationConsultStateStore {
  readonly backend: "memory" | "upstash" | "postgres";
  beginIdempotency(
    key: string,
    fingerprint: string,
  ): Promise<AutomationConsultIdempotencyBeginResult>;
  completeIdempotency(
    key: string,
    fingerprint: string,
    response: AutomationConsultSuccess,
  ): Promise<boolean>;
  releaseIdempotency(key: string, fingerprint: string): Promise<void>;
  consumeRateLimit(
    anonymousClientKey: string,
  ): Promise<AutomationConsultRateLimitResult>;
}

export type AutomationConsultStateStoreResolution =
  | { ok: true; store: AutomationConsultStateStore }
  | {
      ok: false;
      reason:
        | "production_shared_store_required"
        | "invalid_backend"
        | "incomplete_upstash_configuration"
        | "incomplete_postgres_configuration";
    };

class MemoryAutomationConsultStateStore
  implements AutomationConsultStateStore
{
  readonly backend = "memory" as const;

  async beginIdempotency(
    key: string,
    fingerprint: string,
  ): Promise<AutomationConsultIdempotencyBeginResult> {
    return beginAutomationConsultIdempotency(key, fingerprint);
  }

  async completeIdempotency(
    key: string,
    _fingerprint: string,
    response: AutomationConsultSuccess,
  ): Promise<boolean> {
    completeAutomationConsultIdempotency(key, response);
    return true;
  }

  async releaseIdempotency(key: string): Promise<void> {
    failAutomationConsultIdempotency(key);
  }

  async consumeRateLimit(
    anonymousClientKey: string,
  ): Promise<AutomationConsultRateLimitResult> {
    return checkAutomationConsultRateLimit(anonymousClientKey);
  }
}

type UpstashResult = { result?: unknown; error?: unknown };

const BEGIN_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  redis.call("SET", KEYS[1], "p|" .. ARGV[1], "EX", ARGV[2], "NX")
  return "new"
end
if current == "p|" .. ARGV[1] then return "pending" end
local successPrefix = "s|" .. ARGV[1] .. "|"
if string.sub(current, 1, string.len(successPrefix)) == successPrefix then
  return "replay|" .. string.sub(current, string.len(successPrefix) + 1)
end
return "conflict"
`.trim();

const COMPLETE_SCRIPT = `
local pending = "p|" .. ARGV[1]
if redis.call("GET", KEYS[1]) ~= pending then return 0 end
redis.call("SET", KEYS[1], "s|" .. ARGV[1] .. "|" .. ARGV[2], "EX", ARGV[3])
return 1
`.trim();

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == "p|" .. ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`.trim();

const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`.trim();

function encodeSuccess(response: AutomationConsultSuccess): string {
  return Buffer.from(JSON.stringify(response), "utf8").toString("base64url");
}

function decodeSuccess(value: string): AutomationConsultSuccess | null {
  try {
    return parseSuccess(
      JSON.parse(
        Buffer.from(value, "base64url").toString("utf8"),
      ) as unknown,
    );
  } catch {
    // Malformed shared state must never be treated as a successful replay.
  }
  return null;
}

function parseSuccess(value: unknown): AutomationConsultSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = value as Partial<AutomationConsultSuccess>;
  if (
    parsed.ok !== true ||
    typeof parsed.referenceId !== "string" ||
    typeof parsed.receivedAt !== "string"
  ) {
    return null;
  }
  return {
    ok: true,
    referenceId: parsed.referenceId,
    receivedAt: parsed.receivedAt,
    ...(parsed.deliveryMode === "dry-run" || parsed.deliveryMode === "queued"
      ? { deliveryMode: parsed.deliveryMode }
      : {}),
  };
}

export class UpstashAutomationConsultStateStore
  implements AutomationConsultStateStore
{
  readonly backend = "upstash" as const;

  constructor(
    private readonly restUrl: string,
    private readonly restToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async command(command: readonly unknown[]): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(this.restUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.restToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(command),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("shared_state_http_error");
      const body = (await response.json()) as UpstashResult;
      if (
        !body ||
        typeof body !== "object" ||
        "error" in body ||
        !("result" in body)
      ) {
        throw new Error("shared_state_invalid_response");
      }
      return body.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async beginIdempotency(
    key: string,
    fingerprint: string,
  ): Promise<AutomationConsultIdempotencyBeginResult> {
    const value = await this.command([
      "EVAL",
      BEGIN_SCRIPT,
      1,
      `automation-consult:idempotency:${key}`,
      fingerprint,
      PENDING_TTL_SECONDS,
    ]);
    if (value === "new" || value === "pending" || value === "conflict") {
      return { state: value };
    }
    if (typeof value === "string" && value.startsWith("replay|")) {
      const response = decodeSuccess(value.slice("replay|".length));
      return response ? { state: "replay", response } : { state: "conflict" };
    }
    throw new Error("shared_state_invalid_idempotency_result");
  }

  async completeIdempotency(
    key: string,
    fingerprint: string,
    response: AutomationConsultSuccess,
  ): Promise<boolean> {
    const value = await this.command([
      "EVAL",
      COMPLETE_SCRIPT,
      1,
      `automation-consult:idempotency:${key}`,
      fingerprint,
      encodeSuccess(response),
      SUCCESS_TTL_SECONDS,
    ]);
    return value === 1;
  }

  async releaseIdempotency(
    key: string,
    fingerprint: string,
  ): Promise<void> {
    await this.command([
      "EVAL",
      RELEASE_SCRIPT,
      1,
      `automation-consult:idempotency:${key}`,
      fingerprint,
    ]);
  }

  async consumeRateLimit(
    anonymousClientKey: string,
  ): Promise<AutomationConsultRateLimitResult> {
    const window = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1_000));
    const value = await this.command([
      "EVAL",
      RATE_LIMIT_SCRIPT,
      1,
      `automation-consult:rate:${anonymousClientKey}:${window}`,
      RATE_WINDOW_SECONDS,
    ]);
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      typeof value[0] !== "number" ||
      typeof value[1] !== "number"
    ) {
      throw new Error("shared_state_invalid_rate_result");
    }
    const [count, ttl] = value;
    return count <= RATE_MAX_REQUESTS
      ? { allowed: true }
      : { allowed: false, retryAfterSeconds: Math.max(1, ttl) };
  }
}

export class PostgresAutomationConsultStateStore
  implements AutomationConsultStateStore
{
  readonly backend = "postgres" as const;

  constructor(private readonly database: PrismaClient) {}

  private async withIdempotencyLock<T>(
    key: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${"automation-consult:idempotency:" + key}, 0)
        )::text AS "lock"
      `;
      return operation(transaction);
    });
  }

  private async pruneExpired(now: Date): Promise<void> {
    await Promise.all([
      this.database.automationConsultState.deleteMany({
        where: { expiresAt: { lte: now } },
      }),
      this.database.automationConsultRateBucket.deleteMany({
        where: { expiresAt: { lte: now } },
      }),
    ]);
  }

  async beginIdempotency(
    key: string,
    fingerprint: string,
  ): Promise<AutomationConsultIdempotencyBeginResult> {
    const now = new Date();
    await this.pruneExpired(now);
    return this.withIdempotencyLock(key, async (transaction) => {
      const current = await transaction.automationConsultState.findUnique({
        where: { key },
      });
      if (!current) {
        await transaction.automationConsultState.create({
          data: {
            key,
            fingerprint,
            status: "pending",
            expiresAt: new Date(now.getTime() + PENDING_TTL_SECONDS * 1_000),
          },
        });
        return { state: "new" };
      }
      if (current.fingerprint !== fingerprint) return { state: "conflict" };
      if (current.status === "pending") return { state: "pending" };
      if (current.status === "success") {
        const response = parseSuccess(current.response);
        return response
          ? { state: "replay", response }
          : { state: "conflict" };
      }
      throw new Error("shared_state_invalid_idempotency_result");
    });
  }

  async completeIdempotency(
    key: string,
    fingerprint: string,
    response: AutomationConsultSuccess,
  ): Promise<boolean> {
    return this.withIdempotencyLock(key, async (transaction) => {
      const updated = await transaction.automationConsultState.updateMany({
        where: { key, fingerprint, status: "pending" },
        data: {
          status: "success",
          response,
          expiresAt: new Date(Date.now() + SUCCESS_TTL_SECONDS * 1_000),
        },
      });
      return updated.count === 1;
    });
  }

  async releaseIdempotency(
    key: string,
    fingerprint: string,
  ): Promise<void> {
    await this.withIdempotencyLock(key, async (transaction) => {
      await transaction.automationConsultState.deleteMany({
        where: { key, fingerprint, status: "pending" },
      });
    });
  }

  async consumeRateLimit(
    anonymousClientKey: string,
  ): Promise<AutomationConsultRateLimitResult> {
    const now = Date.now();
    const windowStartMs =
      Math.floor(now / (RATE_WINDOW_SECONDS * 1_000)) *
      RATE_WINDOW_SECONDS *
      1_000;
    const windowStart = new Date(windowStartMs);
    const expiresAt = new Date(
      windowStartMs + (RATE_WINDOW_SECONDS + 60) * 1_000,
    );
    const bucket = await this.database.automationConsultRateBucket.upsert({
      where: {
        clientKey_windowStart: {
          clientKey: anonymousClientKey,
          windowStart,
        },
      },
      create: {
        clientKey: anonymousClientKey,
        windowStart,
        count: 1,
        expiresAt,
      },
      update: {
        count: { increment: 1 },
        expiresAt,
      },
      select: { count: true },
    });
    if (bucket.count <= RATE_MAX_REQUESTS) return { allowed: true };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (windowStartMs + RATE_WINDOW_SECONDS * 1_000 - now) / 1_000,
        ),
      ),
    };
  }
}

const memoryStore = new MemoryAutomationConsultStateStore();

/**
 * Preview dry-runだけで使うprocess-local state。外部KVへ書き込まず、
 * productionや利用者入力からは取得できない。
 */
export function getAutomationConsultPreviewDryRunStateStore(
  env: NodeJS.ProcessEnv = process.env,
): AutomationConsultStateStore | null {
  return isPreviewSafetyMode(env) ? memoryStore : null;
}

function validUpstashUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      (!parsed.hostname.endsWith(UPSTASH_HOST_SUFFIX) &&
        parsed.hostname !== "upstash.io") ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveAutomationConsultStateStore(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
  database: PrismaClient | null = prisma,
): AutomationConsultStateStoreResolution {
  const backend = env.AUTOMATION_CONSULT_STATE_BACKEND?.trim().toLowerCase();
  if (
    backend &&
    backend !== "memory" &&
    backend !== "upstash" &&
    backend !== "postgres"
  ) {
    return { ok: false, reason: "invalid_backend" };
  }

  if (backend === "upstash") {
    const restUrl = validUpstashUrl(
      env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL,
    );
    const restToken =
      env.UPSTASH_REDIS_REST_TOKEN?.trim() ??
      env.KV_REST_API_TOKEN?.trim() ??
      "";
    if (!restUrl || restToken.length < 16) {
      return { ok: false, reason: "incomplete_upstash_configuration" };
    }
    return {
      ok: true,
      store: new UpstashAutomationConsultStateStore(
        restUrl,
        restToken,
        fetchImpl,
      ),
    };
  }

  if (backend === "postgres") {
    if (!env.DATABASE_URL?.trim() || !database) {
      return { ok: false, reason: "incomplete_postgres_configuration" };
    }
    return {
      ok: true,
      store: new PostgresAutomationConsultStateStore(database),
    };
  }

  if (env.NODE_ENV === "production") {
    return { ok: false, reason: "production_shared_store_required" };
  }
  return { ok: true, store: memoryStore };
}

export function anonymizeAutomationConsultClient(
  clientIp: string,
  secret: string | undefined = process.env.AUTOMATION_CONSULT_STATE_HASH_SECRET,
): string | null {
  const normalizedSecret = secret?.trim();
  if (!normalizedSecret || normalizedSecret.length < 32) return null;
  return createHmac("sha256", normalizedSecret)
    .update(clientIp)
    .digest("base64url");
}
