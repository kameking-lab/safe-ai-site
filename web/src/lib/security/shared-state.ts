import { createHash, createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RATE_HMAC_DOMAIN = "anzen-ai-portal:shared-rate-limit:v1";
const IDEMPOTENCY_KEY_DOMAIN = "anzen-ai-portal:shared-idempotency-key:v1";
const IDEMPOTENCY_LEASE_DOMAIN =
  "anzen-ai-portal:shared-idempotency-lease:v1";
const IDEMPOTENCY_REQUEST_DOMAIN =
  "anzen-ai-portal:shared-idempotency-request:v1";
const RATE_RETENTION_GRACE_MS = 5 * 60 * 1_000;
const DEVELOPMENT_SECRET =
  "safe-ai-local-test-shared-state-secret-20260731";

export type SharedStateDatabase = {
  $queryRawUnsafe<T = unknown>(
    query: string,
    ...values: unknown[]
  ): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

export type SharedRateLimitPolicy = {
  routeKey: string;
  limit: number;
  windowMs: number;
};

export type SharedRateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  backend: "postgres" | "development-memory";
  namespace: string;
};

export type SharedIdempotencyState<T> =
  | { state: "acquired"; leaseToken: string }
  | { state: "pending" }
  | { state: "conflict" }
  | { state: "replay"; response: T };

type RateRow = { count: number; retryAfterSeconds: number };
type IdempotencyRow = {
  requestHash: string;
  status: string;
  response: unknown;
  leaseToken: string;
};

type MemoryRateBucket = {
  count: number;
  windowStart: number;
  expiresAt: number;
};

const developmentRateBuckets = new Map<string, MemoryRateBucket>();
const developmentIdempotency = new Map<
  string,
  IdempotencyRow & { expiresAt: number }
>();

export class SharedStateUnavailableError extends Error {
  constructor(message = "shared_state_unavailable") {
    super(message);
    this.name = "SharedStateUnavailableError";
  }
}

function previewRateLimitFailureClass(error: unknown): string {
  if (error instanceof SharedStateUnavailableError) {
    if (error.message === "shared_hmac_unavailable") return "configuration";
    if (error.message === "shared_rate_result_invalid") return "result";
    return "shared-state";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  ) {
    return "database";
  }
  return "unexpected";
}

function cleanIdentifier(value: string, maxLength: number): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9._:/-]/g, "-");
  if (!cleaned || cleaned.length > maxLength) {
    throw new Error("shared_state_identifier_invalid");
  }
  return cleaned;
}

export function sharedStateNamespace(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") {
    const deployment =
      env.VERCEL_GIT_COMMIT_SHA?.replace(/[^A-Fa-f0-9]/g, "").slice(0, 12) ||
      "unversioned";
    return `preview-${deployment}`;
  }
  if (env.NODE_ENV === "test") return "test";
  return "development";
}

function allowDevelopmentMemoryFallback(env: NodeJS.ProcessEnv): boolean {
  return (
    env.VERCEL_ENV !== "production" &&
    env.VERCEL_ENV !== "preview" &&
    (env.NODE_ENV === "test" || env.NODE_ENV === "development")
  );
}

function sharedStateSecret(env: NodeJS.ProcessEnv): string | null {
  const configured =
    env.SHARED_STATE_HMAC_SECRET?.trim() ||
    env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (allowDevelopmentMemoryFallback(env)) return DEVELOPMENT_SECRET;
  return null;
}

function hmac(
  domain: string,
  value: string,
  env: NodeJS.ProcessEnv,
): string {
  const secret = sharedStateSecret(env);
  if (!secret) throw new SharedStateUnavailableError("shared_hmac_unavailable");
  return createHmac("sha256", secret)
    .update(domain)
    .update("\0")
    .update(value)
    .digest("base64url");
}

export function getRateLimitSubject(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",", 1)[0]?.trim();
  if (first) return first.slice(0, 128);
  return request.headers.get("x-real-ip")?.trim().slice(0, 128) || "unknown";
}

export function fingerprintSharedRequest(
  routeKey: string,
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalizedRoute = cleanIdentifier(routeKey, 96);
  return hmac(
    `${IDEMPOTENCY_REQUEST_DOMAIN}:${normalizedRoute}`,
    JSON.stringify(value),
    env,
  );
}

function defaultDatabase(): SharedStateDatabase | null {
  return prisma as unknown as SharedStateDatabase | null;
}

function consumeDevelopmentRateLimit(
  storageKey: string,
  policy: SharedRateLimitPolicy,
  namespace: string,
  now: number,
): SharedRateLimitResult {
  for (const [key, bucket] of developmentRateBuckets) {
    if (bucket.expiresAt <= now) developmentRateBuckets.delete(key);
  }
  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const current = developmentRateBuckets.get(storageKey);
  const bucket =
    current?.windowStart === windowStart
      ? { ...current, count: current.count + 1 }
      : {
          count: 1,
          windowStart,
          expiresAt: windowStart + policy.windowMs + RATE_RETENTION_GRACE_MS,
        };
  developmentRateBuckets.set(storageKey, bucket);
  const allowed = bucket.count <= policy.limit;
  return {
    allowed,
    retryAfterSec: allowed
      ? 0
      : Math.max(
          1,
          Math.ceil((windowStart + policy.windowMs - now) / 1_000),
        ),
    remaining: Math.max(0, policy.limit - bucket.count),
    backend: "development-memory",
    namespace,
  };
}

export async function consumeSharedRateLimit(
  input: {
    policy: SharedRateLimitPolicy;
    rawSubject: string;
    namespace?: string;
  },
  options: {
    database?: SharedStateDatabase | null;
    env?: NodeJS.ProcessEnv;
    now?: number;
    previewGlobalSubject?: boolean;
  } = {},
): Promise<SharedRateLimitResult> {
  const env = options.env ?? process.env;
  const namespace = cleanIdentifier(
    input.namespace ?? sharedStateNamespace(env),
    48,
  );
  const routeKey = cleanIdentifier(input.policy.routeKey, 96);
  if (
    !Number.isInteger(input.policy.limit) ||
    input.policy.limit < 1 ||
    !Number.isInteger(input.policy.windowMs) ||
    input.policy.windowMs < 1_000
  ) {
    throw new Error("shared_rate_policy_invalid");
  }
  // Preview is SSO-protected and has no analytics. Selected read-only/local
  // routes may opt into one deployment-wide subject so no IP-derived value is
  // needed there. Postgres remains preferred when available; when Preview's
  // credentialed-service boundary intentionally disables Prisma, the same
  // global subject uses the bounded process-local bucket below. Production can
  // never enter either Preview path.
  const previewGlobalSubject =
    options.previewGlobalSubject === true && env.VERCEL_ENV === "preview";
  const subjectHash =
    previewGlobalSubject
      ? createHash("sha256")
          .update(
            `${RATE_HMAC_DOMAIN}\0${namespace}\0${routeKey}\0preview-protected-global`,
          )
          .digest("hex")
      : hmac(
          `${RATE_HMAC_DOMAIN}:${namespace}:${routeKey}`,
          input.rawSubject || "unknown",
          env,
        );
  const database =
    options.database === undefined ? defaultDatabase() : options.database;
  if (!database || typeof database.$queryRawUnsafe !== "function") {
    if (!allowDevelopmentMemoryFallback(env) && !previewGlobalSubject) {
      throw new SharedStateUnavailableError();
    }
    return consumeDevelopmentRateLimit(
      `${namespace}:${routeKey}:${subjectHash}`,
      input.policy,
      namespace,
      options.now ?? Date.now(),
    );
  }

  // DB clock defines the fixed window, so Vercel instance clock skew cannot
  // create parallel buckets. The upsert is one atomic PostgreSQL statement.
  const rows = await database.$queryRawUnsafe<RateRow[]>(
    `
      WITH db_clock AS MATERIALIZED (
        SELECT clock_timestamp() AS now
      ),
      bounds AS (
        SELECT
          now,
          to_timestamp(
            floor(extract(epoch FROM now) * 1000 / $4::double precision)
            * $4::double precision / 1000
          ) AS window_start
        FROM db_clock
      ),
      consumed AS (
        INSERT INTO "SharedRateBucket" (
          "namespace", "routeKey", "subjectHash", "windowStart",
          "count", "expiresAt", "createdAt", "updatedAt"
        )
        SELECT
          $1, $2, $3, window_start, 1,
          window_start
            + (($4::bigint + $5::bigint) * interval '1 millisecond'),
          now, now
        FROM bounds
        ON CONFLICT ("namespace", "routeKey", "subjectHash", "windowStart")
        DO UPDATE SET
          "count" = "SharedRateBucket"."count" + 1,
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "count", "windowStart"
      )
      SELECT
        consumed."count"::int AS "count",
        GREATEST(
          1,
          CEIL(
            EXTRACT(
              epoch FROM (
                consumed."windowStart"
                  + ($4::bigint * interval '1 millisecond')
                  - bounds.now
              )
            )
          )::int
        ) AS "retryAfterSeconds"
      FROM consumed
      CROSS JOIN bounds
    `,
    namespace,
    routeKey,
    subjectHash,
    input.policy.windowMs,
    RATE_RETENTION_GRACE_MS,
  );
  const row = rows[0];
  if (!row || !Number.isInteger(row.count)) {
    throw new SharedStateUnavailableError("shared_rate_result_invalid");
  }
  const allowed = row.count <= input.policy.limit;
  return {
    allowed,
    retryAfterSec: allowed ? 0 : Math.max(1, row.retryAfterSeconds),
    remaining: Math.max(0, input.policy.limit - row.count),
    backend: "postgres",
    namespace,
  };
}

export async function consumeRequestRateLimit(
  request: Request,
  policy: SharedRateLimitPolicy,
  options: {
    database?: SharedStateDatabase | null;
    env?: NodeJS.ProcessEnv;
    subject?: string;
    previewGlobalSubject?: boolean;
  } = {},
): Promise<SharedRateLimitResult> {
  return consumeSharedRateLimit(
    {
      policy,
      rawSubject: options.subject ?? getRateLimitSubject(request),
    },
    options,
  );
}

export async function sharedRateLimitGuard(
  request: Request,
  policy: SharedRateLimitPolicy,
  options: {
    database?: SharedStateDatabase | null;
    env?: NodeJS.ProcessEnv;
    subject?: string;
    previewGlobalSubject?: boolean;
  } = {},
): Promise<Response | null> {
  try {
    const result = await consumeRequestRateLimit(request, policy, options);
    if (result.allowed) return null;
    return Response.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "短時間にアクセスが集中しました。時間をおいて再試行してください。",
        },
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store",
          "Retry-After": String(result.retryAfterSec),
        },
      },
    );
  } catch (error) {
    const env = options.env ?? process.env;
    const preview =
      env.VERCEL_ENV === "preview" ||
      env.SAFE_AI_STAGING_MODE?.trim().toLowerCase() === "true";
    return Response.json(
      {
        ok: false,
        error: {
          code: "shared_rate_limit_unavailable",
          message:
            "混雑防止機能を確認できないため、この操作を一時停止しています。",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
          "Retry-After": "60",
          ...(preview
            ? {
                "X-Safe-AI-Preview-Rate-Limit-Failure":
                  previewRateLimitFailureClass(error),
              }
            : {}),
        },
      },
    );
  }
}

export async function beginSharedIdempotency<T>(
  input: {
    routeKey: string;
    key: string;
    requestHash: string;
    ttlMs: number;
  },
  options: {
    database?: SharedStateDatabase | null;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<SharedIdempotencyState<T>> {
  const env = options.env ?? process.env;
  const namespace = cleanIdentifier(sharedStateNamespace(env), 48);
  const routeKey = cleanIdentifier(input.routeKey, 96);
  if (
    !/^[A-Za-z0-9._:-]{8,200}$/.test(input.key) ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(input.requestHash) ||
    !Number.isInteger(input.ttlMs) ||
    input.ttlMs < 10_000
  ) {
    throw new Error("shared_idempotency_input_invalid");
  }
  const database =
    options.database === undefined ? defaultDatabase() : options.database;
  const keyHash = hmac(
    `${IDEMPOTENCY_KEY_DOMAIN}:${namespace}:${routeKey}`,
    input.key,
    env,
  );
  const leaseToken = hmac(
    `${IDEMPOTENCY_LEASE_DOMAIN}:${namespace}:${routeKey}`,
    `${randomUUID()}:${input.key}`,
    env,
  );
  const developmentKey = `${namespace}:${routeKey}:${keyHash}`;
  if (!database || typeof database.$queryRawUnsafe !== "function") {
    if (!allowDevelopmentMemoryFallback(env)) {
      throw new SharedStateUnavailableError();
    }
    const now = Date.now();
    const current = developmentIdempotency.get(developmentKey);
    if (!current || current.expiresAt <= now) {
      developmentIdempotency.set(developmentKey, {
        requestHash: input.requestHash,
        status: "pending",
        response: null,
        leaseToken,
        expiresAt: now + input.ttlMs,
      });
      return { state: "acquired", leaseToken };
    }
    if (current.requestHash !== input.requestHash) return { state: "conflict" };
    if (current.status === "succeeded") {
      return { state: "replay", response: current.response as T };
    }
    return { state: "pending" };
  }
  const rows = await database.$queryRawUnsafe<IdempotencyRow[]>(
    `
      WITH db_clock AS MATERIALIZED (
        SELECT clock_timestamp() AS now
      ),
      claimed AS (
        INSERT INTO "SharedIdempotency" (
          "namespace", "routeKey", "keyHash", "requestHash", "status",
          "response", "leaseToken", "expiresAt", "createdAt", "updatedAt"
        )
        SELECT
          $1, $2, $3, $4, 'pending', NULL, $5,
          now + ($6::bigint * interval '1 millisecond'), now, now
        FROM db_clock
        ON CONFLICT ("namespace", "routeKey", "keyHash")
        DO UPDATE SET
          "requestHash" = EXCLUDED."requestHash",
          "status" = 'pending',
          "response" = NULL,
          "leaseToken" = EXCLUDED."leaseToken",
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = EXCLUDED."updatedAt"
        WHERE "SharedIdempotency"."expiresAt" <= (SELECT now FROM db_clock)
        RETURNING "requestHash", "status", "response", "leaseToken"
      )
      SELECT "requestHash", "status", "response", "leaseToken"
      FROM claimed
      UNION ALL
      SELECT "requestHash", "status", "response", "leaseToken"
      FROM "SharedIdempotency"
      WHERE "namespace" = $1
        AND "routeKey" = $2
        AND "keyHash" = $3
        AND NOT EXISTS (SELECT 1 FROM claimed)
      LIMIT 1
    `,
    namespace,
    routeKey,
    keyHash,
    input.requestHash,
    leaseToken,
    input.ttlMs,
  );
  const row = rows[0];
  if (!row) throw new SharedStateUnavailableError("idempotency_result_invalid");
  if (row.leaseToken === leaseToken) return { state: "acquired", leaseToken };
  if (row.requestHash !== input.requestHash) return { state: "conflict" };
  if (row.status === "succeeded") {
    return { state: "replay", response: row.response as T };
  }
  return { state: "pending" };
}

export async function completeSharedIdempotency<T>(
  input: {
    routeKey: string;
    key: string;
    requestHash: string;
    leaseToken: string;
    response: T;
    retentionMs: number;
  },
  options: {
    database?: SharedStateDatabase | null;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const namespace = cleanIdentifier(sharedStateNamespace(env), 48);
  const routeKey = cleanIdentifier(input.routeKey, 96);
  const database =
    options.database === undefined ? defaultDatabase() : options.database;
  const keyHash = hmac(
    `${IDEMPOTENCY_KEY_DOMAIN}:${namespace}:${routeKey}`,
    input.key,
    env,
  );
  if (!database || typeof database.$executeRawUnsafe !== "function") {
    if (!allowDevelopmentMemoryFallback(env)) {
      throw new SharedStateUnavailableError();
    }
    const developmentKey = `${namespace}:${routeKey}:${keyHash}`;
    const current = developmentIdempotency.get(developmentKey);
    if (
      !current ||
      current.requestHash !== input.requestHash ||
      current.leaseToken !== input.leaseToken ||
      current.status !== "pending"
    ) {
      throw new SharedStateUnavailableError("idempotency_completion_rejected");
    }
    developmentIdempotency.set(developmentKey, {
      ...current,
      status: "succeeded",
      response: input.response,
      expiresAt: Date.now() + input.retentionMs,
    });
    return;
  }
  const changed = await database.$executeRawUnsafe(
    `
      UPDATE "SharedIdempotency"
      SET
        "status" = 'succeeded',
        "response" = $6::jsonb,
        "expiresAt" =
          clock_timestamp() + ($7::bigint * interval '1 millisecond'),
        "updatedAt" = clock_timestamp()
      WHERE "namespace" = $1
        AND "routeKey" = $2
        AND "keyHash" = $3
        AND "requestHash" = $4
        AND "leaseToken" = $5
        AND "status" = 'pending'
    `,
    namespace,
    routeKey,
    keyHash,
    input.requestHash,
    input.leaseToken,
    JSON.stringify(input.response),
    input.retentionMs,
  );
  if (changed !== 1) {
    throw new SharedStateUnavailableError("idempotency_completion_rejected");
  }
}

export async function releaseSharedIdempotency(
  input: {
    routeKey: string;
    key: string;
    requestHash: string;
    leaseToken: string;
  },
  options: {
    database?: SharedStateDatabase | null;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<boolean> {
  const env = options.env ?? process.env;
  const namespace = cleanIdentifier(sharedStateNamespace(env), 48);
  const routeKey = cleanIdentifier(input.routeKey, 96);
  const database =
    options.database === undefined ? defaultDatabase() : options.database;
  const keyHash = hmac(
    `${IDEMPOTENCY_KEY_DOMAIN}:${namespace}:${routeKey}`,
    input.key,
    env,
  );
  if (!database || typeof database.$executeRawUnsafe !== "function") {
    if (!allowDevelopmentMemoryFallback(env)) {
      throw new SharedStateUnavailableError();
    }
    const developmentKey = `${namespace}:${routeKey}:${keyHash}`;
    const current = developmentIdempotency.get(developmentKey);
    if (
      current?.requestHash === input.requestHash &&
      current.leaseToken === input.leaseToken &&
      current.status === "pending"
    ) {
      developmentIdempotency.delete(developmentKey);
      return true;
    }
    return false;
  }
  const changed = await database.$executeRawUnsafe(
    `
      DELETE FROM "SharedIdempotency"
      WHERE "namespace" = $1
        AND "routeKey" = $2
        AND "keyHash" = $3
        AND "requestHash" = $4
        AND "leaseToken" = $5
        AND "status" = 'pending'
    `,
    namespace,
    routeKey,
    keyHash,
    input.requestHash,
    input.leaseToken,
  );
  return changed === 1;
}

export async function deleteExpiredSharedState(
  database: SharedStateDatabase | null = defaultDatabase(),
): Promise<{ rateBuckets: number; idempotency: number }> {
  if (!database) throw new SharedStateUnavailableError();
  const [rateBuckets, idempotency] = await Promise.all([
    database.$executeRawUnsafe(
      'DELETE FROM "SharedRateBucket" WHERE "expiresAt" <= clock_timestamp()',
    ),
    database.$executeRawUnsafe(
      'DELETE FROM "SharedIdempotency" WHERE "expiresAt" <= clock_timestamp()',
    ),
  ]);
  return { rateBuckets, idempotency };
}

export function __resetDevelopmentSharedStateForTests(): void {
  developmentRateBuckets.clear();
  developmentIdempotency.clear();
}
