-- CreateTable
CREATE TABLE "MobileIdentity" (
    "userId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "billingEnvironment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileIdentity_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MobileGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "originalTransactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MobileGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileBillingEvent" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT,
    "relatedAppUserIds" JSONB,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileBillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilePurchaseIntent" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilePurchaseIntent_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MobileAuthFlow" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "codeHash" TEXT,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "MobileAuthFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileSession" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "MobileWeatherLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileWeatherLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilePushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileWeatherState" (
    "area" TEXT NOT NULL,
    "alerts" JSONB NOT NULL,
    "sourceAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileWeatherState_pkey" PRIMARY KEY ("area")
);

-- CreateTable
CREATE TABLE "MobileUsageOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileUsageOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileBudgetMonth" (
    "month" TEXT NOT NULL,
    "committedYen" INTEGER NOT NULL DEFAULT 0,
    "reservedYen" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MobileBudgetMonth_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "MobileProviderReservation" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amountYen" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileProviderReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilePushOutbox" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePushOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileIdentity_appUserId_key" ON "MobileIdentity"("appUserId");

-- CreateIndex
CREATE INDEX "MobileGrant_userId_expiresAt_idx" ON "MobileGrant"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileGrant_provider_originalTransactionId_environment_key" ON "MobileGrant"("provider", "originalTransactionId", "environment");

-- CreateIndex
CREATE INDEX "MobileBillingEvent_status_nextAttempt_idx" ON "MobileBillingEvent"("status", "nextAttempt");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePurchaseIntent_id_key" ON "MobilePurchaseIntent"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MobileAuthFlow_codeHash_key" ON "MobileAuthFlow"("codeHash");

-- CreateIndex
CREATE INDEX "MobileSession_userId_idx" ON "MobileSession"("userId");

-- CreateIndex
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileWeatherLocation_userId_locationId_key" ON "MobileWeatherLocation"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushDevice_token_key" ON "MobilePushDevice"("token");

-- CreateIndex
CREATE INDEX "MobilePushDevice_userId_enabled_idx" ON "MobilePushDevice"("userId", "enabled");

-- CreateIndex
CREATE INDEX "MobileUsageOperation_userId_feature_day_status_idx" ON "MobileUsageOperation"("userId", "feature", "day", "status");

-- CreateIndex
CREATE INDEX "MobilePushOutbox_status_nextAttempt_idx" ON "MobilePushOutbox"("status", "nextAttempt");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushOutbox_deviceId_eventId_key" ON "MobilePushOutbox"("deviceId", "eventId");
