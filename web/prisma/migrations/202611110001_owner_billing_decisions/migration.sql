ALTER TABLE "MobileBudgetMonth" ADD COLUMN "salesPausedAt" TIMESTAMP(3);
CREATE TABLE "MobileOperationsAlert" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MobileOperationsAlert_notifiedAt_nextAttempt_idx" ON "MobileOperationsAlert"("notifiedAt", "nextAttempt");
