BEGIN;

CREATE TABLE IF NOT EXISTS "AutomationConsultState" (
  "key" VARCHAR(128) PRIMARY KEY,
  "fingerprint" VARCHAR(128) NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "response" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationConsultState_status_check"
    CHECK ("status" IN ('pending', 'success'))
);

CREATE INDEX IF NOT EXISTS "AutomationConsultState_expiresAt_idx"
  ON "AutomationConsultState"("expiresAt");

CREATE TABLE IF NOT EXISTS "AutomationConsultRateBucket" (
  "clientKey" VARCHAR(128) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationConsultRateBucket_pkey"
    PRIMARY KEY ("clientKey", "windowStart"),
  CONSTRAINT "AutomationConsultRateBucket_count_check"
    CHECK ("count" >= 1)
);

CREATE INDEX IF NOT EXISTS "AutomationConsultRateBucket_expiresAt_idx"
  ON "AutomationConsultRateBucket"("expiresAt");

CREATE TABLE IF NOT EXISTS "RumMetric" (
  "id" BIGSERIAL PRIMARY KEY,
  "routeTemplate" VARCHAR(120) NOT NULL,
  "metric" VARCHAR(8) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "rating" VARCHAR(24) NOT NULL,
  "navigationType" VARCHAR(24) NOT NULL,
  "deviceClass" VARCHAR(12) NOT NULL,
  "connectionClass" VARCHAR(12) NOT NULL,
  "buildId" VARCHAR(80) NOT NULL,
  "anonymousBucket" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RumMetric_value_check"
    CHECK ("value" >= 0)
);

CREATE INDEX IF NOT EXISTS "RumMetric_expiresAt_idx"
  ON "RumMetric"("expiresAt");

CREATE INDEX IF NOT EXISTS "RumMetric_routeTemplate_metric_createdAt_idx"
  ON "RumMetric"("routeTemplate", "metric", "createdAt");

CREATE TABLE IF NOT EXISTS "RumRateBucket" (
  "clientKey" VARCHAR(128) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RumRateBucket_pkey"
    PRIMARY KEY ("clientKey", "windowStart"),
  CONSTRAINT "RumRateBucket_count_check"
    CHECK ("count" >= 1)
);

CREATE INDEX IF NOT EXISTS "RumRateBucket_expiresAt_idx"
  ON "RumRateBucket"("expiresAt");

COMMIT;
