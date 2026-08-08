-- MANUAL ROLLBACK ONLY.
-- First disable every route using the gap-closure shared/governance tables.
-- The production rollback runbook treats application and database rollback
-- separately and requires an export/schema restore point before execution.

DROP TABLE IF EXISTS "AutomationConsultTicket";
DROP TABLE IF EXISTS "SignageFleetAcknowledgement";
DROP TABLE IF EXISTS "SignageFleetHeartbeat";
DROP TABLE IF EXISTS "SignageFleetRollout";
DROP TABLE IF EXISTS "SignageFleetConfiguration";
DROP TABLE IF EXISTS "SignageFleetDevice";
DROP TABLE IF EXISTS "TrainingCompletion";
DROP TABLE IF EXISTS "TrainingAssessment";
DROP TABLE IF EXISTS "TrainingAttendance";
DROP TABLE IF EXISTS "TrainingEnrollment";
DROP TABLE IF EXISTS "TrainingCourseVersion";
DROP TABLE IF EXISTS "TrainingCourse";
DROP TABLE IF EXISTS "TrainingLearner";
DROP TABLE IF EXISTS "ChemicalReassessmentTrigger";
DROP TABLE IF EXISTS "ChemicalRaApproval";
DROP TABLE IF EXISTS "ChemicalRaReviewDecision";
DROP TABLE IF EXISTS "ChemicalRaVersion";
DROP TABLE IF EXISTS "ChemicalSdsRecord";
DROP TABLE IF EXISTS "ChemicalRaAssessment";
DROP TABLE IF EXISTS "GovernanceAuditLog";
DROP TABLE IF EXISTS "SafetyMembership";
DROP TABLE IF EXISTS "SafetySite";
DROP TABLE IF EXISTS "SafetyOrganization";
DROP TABLE IF EXISTS "SharedIdempotency";
DROP TABLE IF EXISTS "SharedRateBucket";
