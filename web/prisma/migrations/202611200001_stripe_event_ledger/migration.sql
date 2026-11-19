-- StripeEvent (webhook idempotency ledger) exists in schema.prisma but was never created in
-- the production database (built with `db push` before this model). Owner approval 2026-11-20.
CREATE TABLE IF NOT EXISTS "StripeEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeEvent_stripeEventId_key" ON "StripeEvent"("stripeEventId");

CREATE INDEX IF NOT EXISTS "StripeEvent_stripeEventId_idx" ON "StripeEvent"("stripeEventId");
