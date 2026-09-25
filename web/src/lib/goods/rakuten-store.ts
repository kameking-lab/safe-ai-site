import "server-only";
import { prisma } from "@/lib/prisma";
import type { ProductResult } from "./product-result";

type Db = Pick<NonNullable<typeof prisma>, "$queryRawUnsafe" | "$executeRawUnsafe">;
type CacheRow = { result: unknown; fresh: boolean; pending: boolean };

export interface RakutenGoodsStore {
  read(keyHash: string): Promise<{ result: ProductResult | null; pending: boolean }>;
  claim(keyHash: string, token: string): Promise<boolean>;
  complete(keyHash: string, token: string, result: ProductResult, ttlMs: number): Promise<void>;
  acquireGate(applicationHash: string, token: string): Promise<boolean>;
  releaseGate(applicationHash: string, token: string, cooldownMs: number): Promise<void>;
}

/** All keys are SHA-256 digests. SQL text is static; secrets never enter table keys or logs. */
export function createPostgresRakutenGoodsStore(db: Db | null = prisma): RakutenGoodsStore | null {
  if (!db) return null;
  return {
    async read(keyHash) {
      const rows = await db.$queryRawUnsafe<CacheRow[]>(`
        SELECT "result", "expiresAt" > clock_timestamp() AS fresh,
               "leaseUntil" > clock_timestamp() AS pending
        FROM "RakutenGoodsCache" WHERE "keyHash" = $1`, keyHash);
      const row = rows[0];
      return { result: row?.fresh ? row.result as ProductResult : null, pending: row?.pending ?? false };
    },
    async claim(keyHash, token) {
      // Remove at most one small batch of expired entries per cold miss.
      // Old affiliate/application IDs therefore disappear without a cron job.
      await db.$executeRawUnsafe(`
        DELETE FROM "RakutenGoodsCache" WHERE "keyHash" IN (
          SELECT "keyHash" FROM "RakutenGoodsCache"
          WHERE "expiresAt" < clock_timestamp() - interval '1 hour'
            AND ("leaseUntil" IS NULL OR "leaseUntil" <= clock_timestamp())
          ORDER BY "expiresAt" LIMIT 64
        )`);
      const rows = await db.$queryRawUnsafe<{ keyHash: string }[]>(`
        INSERT INTO "RakutenGoodsCache" ("keyHash", "result", "expiresAt", "leaseToken", "leaseUntil", "updatedAt")
        VALUES ($1, NULL, clock_timestamp() - interval '1 second', $2,
                clock_timestamp() + interval '15 seconds', clock_timestamp())
        ON CONFLICT ("keyHash") DO UPDATE SET
          "result" = NULL, "expiresAt" = clock_timestamp() - interval '1 second',
          "leaseToken" = EXCLUDED."leaseToken", "leaseUntil" = EXCLUDED."leaseUntil",
          "updatedAt" = clock_timestamp()
        WHERE "RakutenGoodsCache"."expiresAt" <= clock_timestamp()
          AND ("RakutenGoodsCache"."leaseUntil" IS NULL OR "RakutenGoodsCache"."leaseUntil" <= clock_timestamp())
        RETURNING "keyHash"`, keyHash, token);
      return rows.length === 1;
    },
    async complete(keyHash, token, result, ttlMs) {
      await db.$executeRawUnsafe(`
        UPDATE "RakutenGoodsCache" SET "result" = $3::jsonb,
          "expiresAt" = clock_timestamp() + ($4 * interval '1 millisecond'),
          "leaseToken" = NULL, "leaseUntil" = NULL, "updatedAt" = clock_timestamp()
        WHERE "keyHash" = $1 AND "leaseToken" = $2`,
        keyHash, token, JSON.stringify(result), ttlMs);
    },
    async acquireGate(applicationHash, token) {
      // The lease covers the entire upstream call. A crash keeps the gate closed
      // until the lease expires, plus one second, rather than allowing a burst.
      const rows = await db.$queryRawUnsafe<{ applicationHash: string }[]>(`
        INSERT INTO "RakutenApplicationGate"
          ("applicationHash", "leaseToken", "leaseUntil", "nextAllowedAt", "cooldownUntil", "updatedAt")
        VALUES ($1, $2, clock_timestamp() + interval '15 seconds',
                clock_timestamp() + interval '16 seconds', clock_timestamp() - interval '1 second', clock_timestamp())
        ON CONFLICT ("applicationHash") DO UPDATE SET
          "leaseToken" = EXCLUDED."leaseToken",
          "leaseUntil" = clock_timestamp() + interval '15 seconds',
          "nextAllowedAt" = clock_timestamp() + interval '16 seconds',
          "updatedAt" = clock_timestamp()
        WHERE ("RakutenApplicationGate"."leaseUntil" IS NULL OR "RakutenApplicationGate"."leaseUntil" <= clock_timestamp())
          AND "RakutenApplicationGate"."nextAllowedAt" <= clock_timestamp()
          AND "RakutenApplicationGate"."cooldownUntil" <= clock_timestamp()
        RETURNING "applicationHash"`, applicationHash, token);
      return rows.length === 1;
    },
    async releaseGate(applicationHash, token, cooldownMs) {
      await db.$executeRawUnsafe(`
        UPDATE "RakutenApplicationGate" SET "leaseToken" = NULL, "leaseUntil" = NULL,
          "cooldownUntil" = GREATEST("cooldownUntil", clock_timestamp() + ($3 * interval '1 millisecond')),
          "nextAllowedAt" = GREATEST(clock_timestamp() + interval '1100 milliseconds',
            clock_timestamp() + ($3 * interval '1 millisecond')),
          "updatedAt" = clock_timestamp()
        WHERE "applicationHash" = $1 AND "leaseToken" = $2`, applicationHash, token, cooldownMs);
    },
  };
}
