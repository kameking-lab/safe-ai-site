-- MANUAL ROLLBACK ONLY.
-- Disable AUTOMATION_FUNNEL_COLLECTION_ENABLED before running.
-- This removes only the table introduced by the matching additive migration.
-- Export retained aggregate counts first if operations needs them.
BEGIN;

DROP TABLE IF EXISTS "AutomationFunnelEvent";

COMMIT;
