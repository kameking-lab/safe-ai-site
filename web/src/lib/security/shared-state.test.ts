import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetDevelopmentSharedStateForTests,
  beginSharedIdempotency,
  completeSharedIdempotency,
  consumeSharedRateLimit,
  deleteExpiredSharedState,
  SharedStateUnavailableError,
  sharedStateNamespace,
  type SharedStateDatabase,
} from "./shared-state";

const SECRET = "unit-test-shared-state-secret-at-least-32-characters";
const PRODUCTION_ENV = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  SHARED_STATE_HMAC_SECRET: SECRET,
} as NodeJS.ProcessEnv;

type StoredIdempotency = {
  requestHash: string;
  status: string;
  response: unknown;
  leaseToken: string;
};

function sharedFakeDatabase() {
  const rates = new Map<string, number>();
  const idempotency = new Map<string, StoredIdempotency>();
  const calls: { query: string; values: unknown[] }[] = [];

  function client(): SharedStateDatabase {
    return {
      async $queryRawUnsafe<T>(query: string, ...values: unknown[]) {
        calls.push({ query, values });
        if (query.includes('"SharedRateBucket"')) {
          const key = values.slice(0, 3).join(":");
          const count = (rates.get(key) ?? 0) + 1;
          rates.set(key, count);
          return [
            { count, retryAfterSeconds: 60 },
          ] as T;
        }
        const key = values.slice(0, 3).join(":");
        const current = idempotency.get(key);
        if (!current) {
          const created = {
            requestHash: String(values[3]),
            status: "pending",
            response: null,
            leaseToken: String(values[4]),
          };
          idempotency.set(key, created);
          return [created] as T;
        }
        return [current] as T;
      },
      async $executeRawUnsafe(query: string, ...values: unknown[]) {
        calls.push({ query, values });
        if (query.startsWith("\n      UPDATE")) {
          const key = values.slice(0, 3).join(":");
          const current = idempotency.get(key);
          if (
            !current ||
            current.requestHash !== values[3] ||
            current.leaseToken !== values[4] ||
            current.status !== "pending"
          ) {
            return 0;
          }
          idempotency.set(key, {
            ...current,
            status: "succeeded",
            response: JSON.parse(String(values[5])),
          });
          return 1;
        }
        if (query.includes('"SharedRateBucket"')) {
          const count = rates.size;
          rates.clear();
          return count;
        }
        const count = idempotency.size;
        idempotency.clear();
        return count;
      },
    };
  }

  return { client, rates, idempotency, calls };
}

beforeEach(() => {
  __resetDevelopmentSharedStateForTests();
});

describe("distributed shared rate limit", () => {
  it("uses an atomic DB-clock upsert across independent clients", async () => {
    const shared = sharedFakeDatabase();
    const clients = [shared.client(), shared.client()];
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        consumeSharedRateLimit(
          {
            policy: {
              routeKey: "chatbot",
              limit: 25,
              windowMs: 60_000,
            },
            rawSubject: "192.0.2.55",
          },
          {
            database: clients[index % 2],
            env: PRODUCTION_ENV,
            now: index % 2 ? 0 : Number.MAX_SAFE_INTEGER,
          },
        ),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(25);
    expect(results.filter((result) => !result.allowed)).toHaveLength(75);
    expect(shared.rates.size).toBe(1);
    const query = shared.calls[0]?.query ?? "";
    expect(query).toContain("clock_timestamp()");
    expect(query).toContain('ON CONFLICT ("namespace", "routeKey", "subjectHash", "windowStart")');
  });

  it("never passes a raw IP to Postgres and separates production/Preview", async () => {
    const shared = sharedFakeDatabase();
    const rawIp = "203.0.113.89";
    await consumeSharedRateLimit(
      {
        policy: { routeKey: "chemical-ra", limit: 5, windowMs: 60_000 },
        rawSubject: rawIp,
      },
      { database: shared.client(), env: PRODUCTION_ENV },
    );

    expect(shared.calls[0]?.values).not.toContain(rawIp);
    expect(shared.calls[0]?.values[0]).toBe("production");
    expect(
      sharedStateNamespace({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_SHA: "abcdef0123456789",
      }),
    ).toBe("preview-abcdef012345");
  });

  it("fails closed in production and permits memory only in dev/test", async () => {
    await expect(
      consumeSharedRateLimit(
        {
          policy: { routeKey: "auth", limit: 2, windowMs: 60_000 },
          rawSubject: "198.51.100.2",
        },
        {
          database: null,
          env: { NODE_ENV: "production", VERCEL_ENV: "production" },
        },
      ),
    ).rejects.toBeInstanceOf(SharedStateUnavailableError);

    const local = await consumeSharedRateLimit(
      {
        policy: { routeKey: "auth", limit: 1, windowMs: 60_000 },
        rawSubject: "198.51.100.2",
      },
      {
        database: null,
        env: { NODE_ENV: "test" },
        now: 1_000,
      },
    );
    expect(local).toMatchObject({
      allowed: true,
      backend: "development-memory",
    });
  });

  it("uses one explicit privacy-safe distributed subject for protected Preview reads", async () => {
    const shared = sharedFakeDatabase();
    const previewEnv = {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "abcdef0123456789",
    } as NodeJS.ProcessEnv;
    const policy = {
      routeKey: "chemical-search",
      limit: 1,
      windowMs: 60_000,
    };
    const first = await consumeSharedRateLimit(
      { policy, rawSubject: "192.0.2.1" },
      {
        database: shared.client(),
        env: previewEnv,
        previewGlobalSubject: true,
      },
    );
    const second = await consumeSharedRateLimit(
      { policy, rawSubject: "198.51.100.2" },
      {
        database: shared.client(),
        env: previewEnv,
        previewGlobalSubject: true,
      },
    );

    expect(first).toMatchObject({ allowed: true, backend: "postgres" });
    expect(second).toMatchObject({ allowed: false, backend: "postgres" });
    expect(shared.rates.size).toBe(1);
    expect(shared.calls[0]?.values).not.toContain("192.0.2.1");
    expect(shared.calls[1]?.values).not.toContain("198.51.100.2");
    expect(shared.calls[0]?.values[2]).toBe(shared.calls[1]?.values[2]);
    expect(String(shared.calls[0]?.values[2])).toHaveLength(64);
  });

  it("uses the same explicit global subject in memory when Preview disables Prisma", async () => {
    const previewEnv = {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "abcdef0123456789",
    } as NodeJS.ProcessEnv;
    const policy = {
      routeKey: "wbgt-read",
      limit: 1,
      windowMs: 60_000,
    };
    const first = await consumeSharedRateLimit(
      { policy, rawSubject: "192.0.2.11" },
      {
        database: null,
        env: previewEnv,
        previewGlobalSubject: true,
        now: 1_000,
      },
    );
    const second = await consumeSharedRateLimit(
      { policy, rawSubject: "198.51.100.22" },
      {
        database: null,
        env: previewEnv,
        previewGlobalSubject: true,
        now: 1_000,
      },
    );

    expect(first).toMatchObject({
      allowed: true,
      backend: "development-memory",
    });
    expect(second).toMatchObject({
      allowed: false,
      backend: "development-memory",
    });
  });
});

describe("distributed idempotency and cleanup", () => {
  it("atomically leases, rejects changed content, and replays completion", async () => {
    const shared = sharedFakeDatabase();
    const first = shared.client();
    const second = shared.client();
    const base = {
      routeKey: "chemical-ra-save",
      key: "request.20260731.example",
      requestHash: "abcdefghijklmnopqrstuvwxyzABCDEFGH123456789",
      ttlMs: 60_000,
    };

    const acquired = await beginSharedIdempotency<{ ok: boolean }>(base, {
      database: first,
      env: PRODUCTION_ENV,
    });
    expect(acquired.state).toBe("acquired");
    const pending = await beginSharedIdempotency(base, {
      database: second,
      env: PRODUCTION_ENV,
    });
    expect(pending.state).toBe("pending");
    const conflict = await beginSharedIdempotency(
      { ...base, requestHash: "ZYXWVUTSRQPONMLKJIHGFEDCBA9876543210abcde" },
      { database: second, env: PRODUCTION_ENV },
    );
    expect(conflict.state).toBe("conflict");

    if (acquired.state !== "acquired") throw new Error("lease not acquired");
    await completeSharedIdempotency(
      {
        ...base,
        leaseToken: acquired.leaseToken,
        response: { ok: true },
        retentionMs: 24 * 60 * 60 * 1_000,
      },
      { database: first, env: PRODUCTION_ENV },
    );
    const replay = await beginSharedIdempotency<{ ok: boolean }>(base, {
      database: second,
      env: PRODUCTION_ENV,
    });
    expect(replay).toEqual({ state: "replay", response: { ok: true } });
    expect(shared.calls.flatMap((call) => call.values)).not.toContain(base.key);
  });

  it("cleans expired shared rows without touching application data", async () => {
    const shared = sharedFakeDatabase();
    shared.rates.set("expired", 1);
    shared.idempotency.set("expired", {
      requestHash: "hash",
      status: "pending",
      response: null,
      leaseToken: "lease",
    });
    await expect(deleteExpiredSharedState(shared.client())).resolves.toEqual({
      rateBuckets: 1,
      idempotency: 1,
    });
    const cleanupQueries = shared.calls.slice(-2).map((call) => call.query);
    expect(cleanupQueries.every((query) => query.startsWith("DELETE FROM"))).toBe(
      true,
    );
  });
});
