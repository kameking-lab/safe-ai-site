-- MANUAL ROLLBACK ONLY.
-- Disable automation intake and RUM in Vercel before running this file.
-- Confirm no active or retained rows are required, then execute as one
-- transaction. This file is never called by application code or deployment.
BEGIN;

DROP TABLE IF EXISTS "RumRateBucket";
DROP TABLE IF EXISTS "RumMetric";
DROP TABLE IF EXISTS "AutomationConsultRateBucket";
DROP TABLE IF EXISTS "AutomationConsultState";

COMMIT;
