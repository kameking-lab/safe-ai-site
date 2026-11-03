-- Prepared offline only. No database has been changed by IOS3C.
ALTER TABLE "MobilePurchaseIntent" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'legacy_unknown',
 ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'prepared', ADD COLUMN "providerSessionId" TEXT,
 ADD COLUMN "checkoutUrl" TEXT, ADD COLUMN "providerRequest" JSONB;
CREATE UNIQUE INDEX "MobilePurchaseIntent_providerSessionId_key" ON "MobilePurchaseIntent"("providerSessionId");
ALTER TABLE "MobileUsageOperation" ADD COLUMN "providerStartedAt" TIMESTAMP(3);
-- Historic leases have no dispatch evidence: do not assume they are safe to release.
UPDATE "MobileUsageOperation" SET "providerStartedAt" = "createdAt" WHERE "status" = 'reserved';
ALTER TABLE "MobileAuthFlow" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "authenticatedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "billingHold" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "MobileAccountDeletion" (
 "id" TEXT NOT NULL, "userId" TEXT, "confirmationHash" TEXT NOT NULL, "receiptHash" TEXT NOT NULL,
 "sessionHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'prepared', "expiresAt" TIMESTAMP(3) NOT NULL,
 "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 "auditSubject" TEXT NOT NULL, "auditRetainUntil" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MobileAccountDeletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MobileAccountDeletion_userId_key" ON "MobileAccountDeletion"("userId");
CREATE UNIQUE INDEX "MobileAccountDeletion_receiptHash_key" ON "MobileAccountDeletion"("receiptHash");
CREATE INDEX "MobileAccountDeletion_status_requestedAt_idx" ON "MobileAccountDeletion"("status", "requestedAt");
