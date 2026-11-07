-- Additive migration. Apply before deploying the goods-products route.
CREATE TABLE IF NOT EXISTS "RakutenGoodsCache" (
  "keyHash" VARCHAR(64) PRIMARY KEY,
  "result" JSONB,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "leaseToken" VARCHAR(36),
  "leaseUntil" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RakutenGoodsCache_expiresAt_idx" ON "RakutenGoodsCache"("expiresAt");
CREATE INDEX IF NOT EXISTS "RakutenGoodsCache_leaseUntil_idx" ON "RakutenGoodsCache"("leaseUntil");

CREATE TABLE IF NOT EXISTS "RakutenApplicationGate" (
  "applicationHash" VARCHAR(64) PRIMARY KEY,
  "leaseToken" VARCHAR(36),
  "leaseUntil" TIMESTAMPTZ(3),
  "nextAllowedAt" TIMESTAMPTZ(3) NOT NULL,
  "cooldownUntil" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
