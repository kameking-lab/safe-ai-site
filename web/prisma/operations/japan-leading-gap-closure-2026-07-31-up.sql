-- Additive-only gap-closure migration. Existing tables, columns and rows are
-- not modified. The audited migration runner supplies the transaction.

CREATE TABLE IF NOT EXISTS "SharedRateBucket" (
  "namespace" VARCHAR(48) NOT NULL,
  "routeKey" VARCHAR(96) NOT NULL,
  "subjectHash" VARCHAR(64) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SharedRateBucket_pkey"
    PRIMARY KEY ("namespace", "routeKey", "subjectHash", "windowStart"),
  CONSTRAINT "SharedRateBucket_count_check" CHECK ("count" > 0)
);

CREATE INDEX IF NOT EXISTS "SharedRateBucket_expiresAt_idx"
  ON "SharedRateBucket"("expiresAt");

CREATE INDEX IF NOT EXISTS "SharedRateBucket_namespace_routeKey_windowStart_idx"
  ON "SharedRateBucket"("namespace", "routeKey", "windowStart");

CREATE TABLE IF NOT EXISTS "SharedIdempotency" (
  "namespace" VARCHAR(48) NOT NULL,
  "routeKey" VARCHAR(96) NOT NULL,
  "keyHash" VARCHAR(64) NOT NULL,
  "requestHash" VARCHAR(128) NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "response" JSONB,
  "leaseToken" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SharedIdempotency_pkey"
    PRIMARY KEY ("namespace", "routeKey", "keyHash"),
  CONSTRAINT "SharedIdempotency_status_check"
    CHECK ("status" IN ('pending', 'succeeded'))
);

CREATE INDEX IF NOT EXISTS "SharedIdempotency_expiresAt_idx"
  ON "SharedIdempotency"("expiresAt");

CREATE TABLE IF NOT EXISTS "SafetyOrganization" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(160) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafetyOrganization_status_check"
    CHECK ("status" IN ('active', 'suspended', 'archived'))
);
CREATE INDEX IF NOT EXISTS "SafetyOrganization_status_idx"
  ON "SafetyOrganization"("status");

CREATE TABLE IF NOT EXISTS "SafetySite" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Tokyo',
  "status" VARCHAR(24) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafetySite_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SafetySite_status_check"
    CHECK ("status" IN ('active', 'suspended', 'archived')),
  CONSTRAINT "SafetySite_organizationId_code_key"
    UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "SafetySite_organizationId_status_idx"
  ON "SafetySite"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "SafetyMembership" (
  "organizationId" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "role" VARCHAR(24) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafetyMembership_pkey"
    PRIMARY KEY ("organizationId", "userId"),
  CONSTRAINT "SafetyMembership_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SafetyMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "SafetyMembership_role_check"
    CHECK ("role" IN ('viewer', 'editor', 'reviewer', 'approver', 'admin')),
  CONSTRAINT "SafetyMembership_status_check"
    CHECK ("status" IN ('active', 'suspended', 'revoked'))
);
CREATE INDEX IF NOT EXISTS "SafetyMembership_userId_status_idx"
  ON "SafetyMembership"("userId", "status");

CREATE TABLE IF NOT EXISTS "GovernanceAuditLog" (
  "id" BIGSERIAL PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64),
  "actorUserId" VARCHAR(64) NOT NULL,
  "scope" VARCHAR(40) NOT NULL,
  "entityType" VARCHAR(48) NOT NULL,
  "entityId" VARCHAR(64) NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "fromStatus" VARCHAR(32),
  "toStatus" VARCHAR(32),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GovernanceAuditLog_organizationId_scope_createdAt_idx"
  ON "GovernanceAuditLog"("organizationId", "scope", "createdAt");
CREATE INDEX IF NOT EXISTS "GovernanceAuditLog_entityType_entityId_createdAt_idx"
  ON "GovernanceAuditLog"("entityType", "entityId", "createdAt");

CREATE TABLE IF NOT EXISTS "ChemicalRaAssessment" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64) NOT NULL,
  "assessmentNumber" VARCHAR(80) NOT NULL,
  "chemicalIdentity" VARCHAR(240) NOT NULL,
  "casNumber" VARCHAR(32),
  "identityConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "mixtureConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "ownerUserId" VARCHAR(64) NOT NULL,
  "reviewerUserId" VARCHAR(64),
  "approverUserId" VARCHAR(64),
  "dueDate" TIMESTAMP(3),
  "reassessmentDate" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalRaAssessment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaAssessment_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "SafetySite"("id") ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaAssessment_number_key"
    UNIQUE ("organizationId", "assessmentNumber"),
  CONSTRAINT "ChemicalRaAssessment_version_check"
    CHECK ("currentVersionNumber" >= 1),
  CONSTRAINT "ChemicalRaAssessment_status_check" CHECK ("status" IN (
    'draft', 'identity-unresolved', 'input-incomplete',
    'screening-complete', 'review-required', 'changes-requested',
    'approved', 'superseded', 'reassessment-due', 'archived'
  ))
);
CREATE INDEX IF NOT EXISTS "ChemicalRaAssessment_organizationId_siteId_status_idx"
  ON "ChemicalRaAssessment"("organizationId", "siteId", "status");
CREATE INDEX IF NOT EXISTS "ChemicalRaAssessment_organizationId_reassessmentDate_idx"
  ON "ChemicalRaAssessment"("organizationId", "reassessmentDate");

CREATE TABLE IF NOT EXISTS "ChemicalSdsRecord" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64) NOT NULL,
  "chemicalIdentity" VARCHAR(240) NOT NULL,
  "casNumber" VARCHAR(32),
  "mixtureConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "versionLabel" VARCHAR(120) NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "sourceUrl" TEXT,
  "evidence" JSONB NOT NULL,
  "supersededAt" TIMESTAMP(3),
  "createdByUserId" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalSdsRecord_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalSdsRecord_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "SafetySite"("id") ON DELETE RESTRICT,
  CONSTRAINT "ChemicalSdsRecord_version_key"
    UNIQUE (
      "organizationId", "siteId", "chemicalIdentity", "versionLabel", "issueDate"
    )
);
CREATE INDEX IF NOT EXISTS "ChemicalSdsRecord_organizationId_siteId_casNumber_idx"
  ON "ChemicalSdsRecord"("organizationId", "siteId", "casNumber");

CREATE TABLE IF NOT EXISTS "ChemicalRaVersion" (
  "id" VARCHAR(64) PRIMARY KEY,
  "assessmentId" VARCHAR(64) NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "chemicalIdentity" VARCHAR(240) NOT NULL,
  "casNumber" VARCHAR(32),
  "identityConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "mixtureComponents" JSONB,
  "mixtureConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "sdsRecordId" VARCHAR(64),
  "sdsVersionLabel" VARCHAR(120),
  "sdsIssueDate" TIMESTAMP(3),
  "processName" VARCHAR(240),
  "taskName" VARCHAR(240),
  "quantity" VARCHAR(120),
  "concentration" VARCHAR(120),
  "exposureDuration" VARCHAR(120),
  "frequency" VARCHAR(120),
  "temperature" VARCHAR(120),
  "ventilation" VARCHAR(240),
  "localExhaust" VARCHAR(240),
  "skinExposure" VARCHAR(240),
  "ppe" JSONB,
  "existingControl" JSONB,
  "additionalControl" JSONB,
  "ownerUserId" VARCHAR(64),
  "reviewerUserId" VARCHAR(64),
  "approverUserId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "dueDate" TIMESTAMP(3),
  "reassessmentDate" TIMESTAMP(3),
  "aiCandidatesReviewed" BOOLEAN NOT NULL DEFAULT false,
  "sources" JSONB,
  "evidence" JSONB,
  "unresolvedWarnings" JSONB,
  "unresolvedWarningCount" INTEGER NOT NULL DEFAULT 0,
  "changeReason" TEXT NOT NULL,
  "createdByUserId" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalRaVersion_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "ChemicalRaAssessment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaVersion_sdsRecordId_fkey"
    FOREIGN KEY ("sdsRecordId") REFERENCES "ChemicalSdsRecord"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaVersion_number_key"
    UNIQUE ("assessmentId", "versionNumber"),
  CONSTRAINT "ChemicalRaVersion_version_check" CHECK ("versionNumber" >= 1),
  CONSTRAINT "ChemicalRaVersion_warning_count_check"
    CHECK ("unresolvedWarningCount" >= 0),
  CONSTRAINT "ChemicalRaVersion_status_check" CHECK ("status" IN (
    'draft', 'identity-unresolved', 'input-incomplete',
    'screening-complete', 'review-required', 'changes-requested',
    'approved', 'superseded', 'reassessment-due', 'archived'
  ))
);
CREATE INDEX IF NOT EXISTS "ChemicalRaVersion_assessmentId_status_idx"
  ON "ChemicalRaVersion"("assessmentId", "status");
CREATE INDEX IF NOT EXISTS "ChemicalRaVersion_sdsRecordId_idx"
  ON "ChemicalRaVersion"("sdsRecordId");

CREATE TABLE IF NOT EXISTS "ChemicalRaReviewDecision" (
  "id" VARCHAR(64) PRIMARY KEY,
  "assessmentId" VARCHAR(64) NOT NULL,
  "versionId" VARCHAR(64) NOT NULL,
  "reviewerUserId" VARCHAR(64) NOT NULL,
  "decision" VARCHAR(32) NOT NULL,
  "comment" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalRaReviewDecision_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "ChemicalRaAssessment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaReviewDecision_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "ChemicalRaVersion"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaReviewDecision_version_key"
    UNIQUE ("versionId"),
  CONSTRAINT "ChemicalRaReviewDecision_value_check"
    CHECK ("decision" IN ('recommend-approval', 'changes-requested'))
);
CREATE INDEX IF NOT EXISTS "ChemicalRaReviewDecision_assessment_decided_idx"
  ON "ChemicalRaReviewDecision"("assessmentId", "decidedAt");

CREATE TABLE IF NOT EXISTS "ChemicalRaApproval" (
  "id" VARCHAR(64) PRIMARY KEY,
  "assessmentId" VARCHAR(64) NOT NULL,
  "versionId" VARCHAR(64) NOT NULL,
  "reviewerUserId" VARCHAR(64) NOT NULL,
  "approverUserId" VARCHAR(64) NOT NULL,
  "decision" VARCHAR(32) NOT NULL,
  "comment" TEXT,
  "reviewedAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalRaApproval_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "ChemicalRaAssessment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaApproval_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "ChemicalRaVersion"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalRaApproval_version_decision_key"
    UNIQUE ("versionId", "decision"),
  CONSTRAINT "ChemicalRaApproval_decision_check"
    CHECK ("decision" IN ('changes-requested', 'approved', 'rejected')),
  CONSTRAINT "ChemicalRaApproval_independent_check"
    CHECK ("reviewerUserId" <> "approverUserId")
);
CREATE INDEX IF NOT EXISTS "ChemicalRaApproval_assessmentId_createdAt_idx"
  ON "ChemicalRaApproval"("assessmentId", "createdAt");

CREATE TABLE IF NOT EXISTS "ChemicalReassessmentTrigger" (
  "id" VARCHAR(64) PRIMARY KEY,
  "assessmentId" VARCHAR(64) NOT NULL,
  "triggerType" VARCHAR(48) NOT NULL,
  "reason" TEXT NOT NULL,
  "sourceRef" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" VARCHAR(64),
  CONSTRAINT "ChemicalReassessmentTrigger_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "ChemicalRaAssessment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "ChemicalReassessmentTrigger_type_check" CHECK ("triggerType" IN (
    'sds-updated', 'component-changed', 'concentration-changed',
    'quantity-changed', 'process-changed', 'ventilation-changed',
    'ppe-changed', 'law-changed', 'incident-or-near-miss', 'periodic-date'
  ))
);
CREATE INDEX IF NOT EXISTS "ChemicalReassessmentTrigger_assessment_resolved_idx"
  ON "ChemicalReassessmentTrigger"(
    "assessmentId", "resolvedAt", "detectedAt"
  );

CREATE TABLE IF NOT EXISTS "TrainingLearner" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64) NOT NULL,
  "externalRefHash" VARCHAR(128),
  "displayName" VARCHAR(160) NOT NULL,
  "identityStatus" VARCHAR(32) NOT NULL DEFAULT 'unverified',
  "identityVerifiedAt" TIMESTAMP(3),
  "identityVerifierId" VARCHAR(64),
  "identityEvidence" JSONB,
  "status" VARCHAR(24) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingLearner_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingLearner_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "SafetySite"("id") ON DELETE RESTRICT,
  CONSTRAINT "TrainingLearner_identity_status_check"
    CHECK ("identityStatus" IN ('unverified', 'pending', 'verified', 'rejected')),
  CONSTRAINT "TrainingLearner_status_check"
    CHECK ("status" IN ('active', 'inactive', 'archived'))
);
CREATE INDEX IF NOT EXISTS "TrainingLearner_organizationId_siteId_status_idx"
  ON "TrainingLearner"("organizationId", "siteId", "status");
CREATE INDEX IF NOT EXISTS "TrainingLearner_externalRefHash_idx"
  ON "TrainingLearner"("externalRefHash");

CREATE TABLE IF NOT EXISTS "TrainingCourse" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "courseCode" VARCHAR(80) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "classification" VARCHAR(48) NOT NULL,
  "legalCategory" VARCHAR(48) NOT NULL,
  "source" JSONB NOT NULL,
  "instructorRequirement" TEXT NOT NULL,
  "practicalTrainingRequirement" TEXT NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCourse_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingCourse_code_key"
    UNIQUE ("organizationId", "courseCode"),
  CONSTRAINT "TrainingCourse_classification_check" CHECK ("classification" IN (
    'self-study', 'internal-support', 'part-of-statutory-training',
    'formal-statutory-training', 'skill-training', 'special-education',
    'foreman-training', 'operation-chief', 'employment-restriction'
  )),
  CONSTRAINT "TrainingCourse_status_check"
    CHECK ("status" IN ('draft', 'active', 'superseded', 'archived'))
);
CREATE INDEX IF NOT EXISTS "TrainingCourse_org_legal_status_idx"
  ON "TrainingCourse"("organizationId", "legalCategory", "status");

CREATE TABLE IF NOT EXISTS "TrainingCourseVersion" (
  "id" VARCHAR(64) PRIMARY KEY,
  "courseId" VARCHAR(64) NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "versionLabel" VARCHAR(120) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "classification" VARCHAR(48) NOT NULL,
  "legalCategory" VARCHAR(48) NOT NULL,
  "courseSource" JSONB NOT NULL,
  "instructorRequirementLabel" TEXT NOT NULL,
  "practicalTrainingRequirementLabel" TEXT NOT NULL,
  "requiredMinutes" INTEGER NOT NULL,
  "assessmentRequirement" JSONB,
  "attendanceRequirement" JSONB,
  "practicalRequirement" JSONB,
  "instructorRequirement" JSONB,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "sourceSnapshot" JSONB NOT NULL,
  "createdByUserId" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCourseVersion_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingCourseVersion_number_key"
    UNIQUE ("courseId", "versionNumber"),
  CONSTRAINT "TrainingCourseVersion_values_check"
    CHECK ("versionNumber" >= 1 AND "requiredMinutes" > 0)
);
CREATE INDEX IF NOT EXISTS "TrainingCourseVersion_course_effective_idx"
  ON "TrainingCourseVersion"("courseId", "effectiveFrom");

CREATE TABLE IF NOT EXISTS "TrainingEnrollment" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64) NOT NULL,
  "learnerId" VARCHAR(64) NOT NULL,
  "courseVersionId" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'enrolled',
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "learningMinutes" INTEGER NOT NULL DEFAULT 0,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "renewalDueAt" TIMESTAMP(3),
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingEnrollment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingEnrollment_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "SafetySite"("id") ON DELETE RESTRICT,
  CONSTRAINT "TrainingEnrollment_learnerId_fkey"
    FOREIGN KEY ("learnerId") REFERENCES "TrainingLearner"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingEnrollment_courseVersionId_fkey"
    FOREIGN KEY ("courseVersionId") REFERENCES "TrainingCourseVersion"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingEnrollment_learner_course_key"
    UNIQUE ("learnerId", "courseVersionId"),
  CONSTRAINT "TrainingEnrollment_progress_check"
    CHECK (
      "progressPercent" BETWEEN 0 AND 100
      AND "learningMinutes" >= 0
    ),
  CONSTRAINT "TrainingEnrollment_status_check" CHECK ("status" IN (
    'enrolled', 'in-progress', 'overdue', 'completed', 'withdrawn', 'archived'
  ))
);
CREATE INDEX IF NOT EXISTS "TrainingEnrollment_org_site_status_due_idx"
  ON "TrainingEnrollment"("organizationId", "siteId", "status", "dueDate");

CREATE TABLE IF NOT EXISTS "TrainingAttendance" (
  "id" VARCHAR(64) PRIMARY KEY,
  "enrollmentId" VARCHAR(64) NOT NULL,
  "attendanceType" VARCHAR(32) NOT NULL,
  "attendedMinutes" INTEGER NOT NULL,
  "instructorUserId" VARCHAR(64),
  "practicalCompleted" BOOLEAN NOT NULL DEFAULT false,
  "verifiedByUserId" VARCHAR(64),
  "evidence" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingAttendance_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingAttendance_minutes_check" CHECK ("attendedMinutes" >= 0)
);
CREATE INDEX IF NOT EXISTS "TrainingAttendance_enrollment_occurred_idx"
  ON "TrainingAttendance"("enrollmentId", "occurredAt");

CREATE TABLE IF NOT EXISTS "TrainingAssessment" (
  "id" VARCHAR(64) PRIMARY KEY,
  "enrollmentId" VARCHAR(64) NOT NULL,
  "assessmentType" VARCHAR(32) NOT NULL,
  "score" DOUBLE PRECISION,
  "passed" BOOLEAN,
  "assessedAt" TIMESTAMP(3) NOT NULL,
  "assessorUserId" VARCHAR(64),
  "verifiedAt" TIMESTAMP(3),
  "verifiedByUserId" VARCHAR(64),
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingAssessment_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingAssessment_score_check"
    CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100))
);
CREATE INDEX IF NOT EXISTS "TrainingAssessment_enrollment_assessed_idx"
  ON "TrainingAssessment"("enrollmentId", "assessedAt");

CREATE TABLE IF NOT EXISTS "TrainingCompletion" (
  "id" VARCHAR(64) PRIMARY KEY,
  "enrollmentId" VARCHAR(64) NOT NULL UNIQUE,
  "completionLevel" VARCHAR(40) NOT NULL,
  "displayLabel" VARCHAR(120) NOT NULL,
  "identitySatisfied" BOOLEAN NOT NULL DEFAULT false,
  "timeSatisfied" BOOLEAN NOT NULL DEFAULT false,
  "practicalSatisfied" BOOLEAN NOT NULL DEFAULT false,
  "instructorSatisfied" BOOLEAN NOT NULL DEFAULT false,
  "examSatisfied" BOOLEAN NOT NULL DEFAULT false,
  "verifierUserId" VARCHAR(64),
  "verifiedAt" TIMESTAMP(3),
  "approverUserId" VARCHAR(64),
  "approvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "renewalDueAt" TIMESTAMP(3),
  "evidence" JSONB,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCompletion_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "TrainingCompletion_level_check" CHECK ("completionLevel" IN (
    'self-check', 'learning-complete', 'internal-training-record',
    'formal-statutory-completion'
  )),
  CONSTRAINT "TrainingCompletion_formal_gate_check" CHECK (
    "completionLevel" <> 'formal-statutory-completion'
    OR (
      "identitySatisfied" AND "timeSatisfied" AND "practicalSatisfied"
      AND "instructorSatisfied" AND "examSatisfied"
      AND "verifierUserId" IS NOT NULL AND "verifiedAt" IS NOT NULL
      AND "approverUserId" IS NOT NULL AND "approvedAt" IS NOT NULL
      AND COALESCE(
        ("evidence"->>'formalCertificateAllowed')::boolean,
        false
      )
      AND jsonb_array_length(
        COALESCE("evidence"->'missingForFormal', '[]'::jsonb)
      ) = 0
    )
  )
);

CREATE TABLE IF NOT EXISTS "SignageFleetDevice" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "deviceTokenHash" VARCHAR(128) NOT NULL UNIQUE,
  "tokenVersion" INTEGER NOT NULL DEFAULT 1,
  "tokenRotatedAt" TIMESTAMP(3) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'unknown',
  "lastSeenAt" TIMESTAMP(3),
  "softwareVersion" VARCHAR(80),
  "configurationVersion" INTEGER,
  "assignedLayout" VARCHAR(120),
  "staleThresholdSec" INTEGER NOT NULL DEFAULT 300,
  "registrationStatus" VARCHAR(24) NOT NULL DEFAULT 'unverified',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "maintenanceAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignageFleetDevice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetDevice_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "SafetySite"("id") ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetDevice_token_version_check" CHECK ("tokenVersion" >= 1),
  CONSTRAINT "SignageFleetDevice_stale_threshold_check"
    CHECK ("staleThresholdSec" BETWEEN 30 AND 3600),
  CONSTRAINT "SignageFleetDevice_status_check" CHECK ("status" IN (
    'online', 'delayed', 'offline', 'stale', 'degraded', 'maintenance',
    'emergency', 'unknown'
  )),
  CONSTRAINT "SignageFleetDevice_registration_check"
    CHECK ("registrationStatus" IN ('unverified', 'verified', 'revoked'))
);
CREATE INDEX IF NOT EXISTS "SignageFleetDevice_org_site_status_idx"
  ON "SignageFleetDevice"("organizationId", "siteId", "status");
CREATE INDEX IF NOT EXISTS "SignageFleetDevice_lastSeenAt_idx"
  ON "SignageFleetDevice"("lastSeenAt");

CREATE TABLE IF NOT EXISTS "SignageFleetConfiguration" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "siteId" VARCHAR(64),
  "versionNumber" INTEGER NOT NULL,
  "assignedLayout" VARCHAR(120) NOT NULL,
  "schedule" JSONB NOT NULL,
  "emergencyOverride" JSONB,
  "contentSource" JSONB NOT NULL,
  "weatherSource" JSONB NOT NULL,
  "configChecksum" VARCHAR(128) NOT NULL,
  "signature" TEXT NOT NULL,
  "signingKeyVersion" INTEGER NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'draft',
  "createdByUserId" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "SignageFleetConfiguration_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetConfiguration_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "SafetySite"("id") ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetConfiguration_version_key"
    UNIQUE ("organizationId", "versionNumber"),
  CONSTRAINT "SignageFleetConfiguration_version_check"
    CHECK ("versionNumber" >= 1 AND "signingKeyVersion" >= 1),
  CONSTRAINT "SignageFleetConfiguration_status_check"
    CHECK ("status" IN ('draft', 'published', 'superseded', 'archived'))
);
CREATE INDEX IF NOT EXISTS "SignageFleetConfiguration_org_site_status_idx"
  ON "SignageFleetConfiguration"("organizationId", "siteId", "status");

CREATE TABLE IF NOT EXISTS "SignageFleetRollout" (
  "id" VARCHAR(64) PRIMARY KEY,
  "organizationId" VARCHAR(64) NOT NULL,
  "deviceId" VARCHAR(64) NOT NULL,
  "configurationId" VARCHAR(64) NOT NULL,
  "previousConfiguration" VARCHAR(64),
  "rolloutStage" VARCHAR(24) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
  "scheduledAt" TIMESTAMP(3),
  "deployedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "createdByUserId" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignageFleetRollout_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "SafetyOrganization"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetRollout_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "SignageFleetDevice"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetRollout_configurationId_fkey"
    FOREIGN KEY ("configurationId") REFERENCES "SignageFleetConfiguration"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetRollout_previousConfiguration_fkey"
    FOREIGN KEY ("previousConfiguration")
      REFERENCES "SignageFleetConfiguration"("id") ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetRollout_stage_check"
    CHECK ("rolloutStage" IN ('preview', 'canary', 'staged', 'all', 'rollback')),
  CONSTRAINT "SignageFleetRollout_status_check" CHECK ("status" IN (
    'pending', 'deploying', 'deployed', 'acknowledged', 'failed',
    'rolled-back', 'cancelled'
  ))
);
CREATE INDEX IF NOT EXISTS "SignageFleetRollout_org_stage_status_idx"
  ON "SignageFleetRollout"("organizationId", "rolloutStage", "status");
CREATE INDEX IF NOT EXISTS "SignageFleetRollout_device_created_idx"
  ON "SignageFleetRollout"("deviceId", "createdAt");

CREATE TABLE IF NOT EXISTS "SignageFleetHeartbeat" (
  "id" BIGSERIAL PRIMARY KEY,
  "deviceId" VARCHAR(64) NOT NULL,
  "nonceHash" VARCHAR(128) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" VARCHAR(24) NOT NULL,
  "softwareVersion" VARCHAR(80) NOT NULL,
  "configurationVersion" INTEGER,
  "configChecksum" VARCHAR(128),
  "diagnostics" JSONB,
  CONSTRAINT "SignageFleetHeartbeat_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "SignageFleetDevice"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetHeartbeat_nonce_key"
    UNIQUE ("deviceId", "nonceHash"),
  CONSTRAINT "SignageFleetHeartbeat_status_check"
    CHECK ("status" IN ('online', 'degraded', 'emergency'))
);
CREATE INDEX IF NOT EXISTS "SignageFleetHeartbeat_device_received_idx"
  ON "SignageFleetHeartbeat"("deviceId", "receivedAt");

CREATE TABLE IF NOT EXISTS "SignageFleetAcknowledgement" (
  "id" VARCHAR(64) PRIMARY KEY,
  "deviceId" VARCHAR(64) NOT NULL,
  "rolloutId" VARCHAR(64) NOT NULL,
  "configChecksum" VARCHAR(128) NOT NULL,
  "acknowledgement" VARCHAR(32) NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignageFleetAcknowledgement_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "SignageFleetDevice"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetAcknowledgement_rolloutId_fkey"
    FOREIGN KEY ("rolloutId") REFERENCES "SignageFleetRollout"("id")
      ON DELETE RESTRICT,
  CONSTRAINT "SignageFleetAcknowledgement_device_rollout_key"
    UNIQUE ("deviceId", "rolloutId"),
  CONSTRAINT "SignageFleetAcknowledgement_value_check"
    CHECK ("acknowledgement" IN ('applied', 'rejected', 'failed'))
);

CREATE TABLE IF NOT EXISTS "AutomationConsultTicket" (
  "id" VARCHAR(64) PRIMARY KEY,
  "referenceId" VARCHAR(80) NOT NULL UNIQUE,
  "idempotencyKeyHash" VARCHAR(128) NOT NULL UNIQUE,
  "organizationId" VARCHAR(64),
  "siteId" VARCHAR(64),
  "requesterHash" VARCHAR(128) NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "encryptionKeyVersion" INTEGER NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'queued',
  "assignedUserId" VARCHAR(64),
  "encryptedInternalNote" TEXT,
  "emailDeliveryStatus" VARCHAR(32) NOT NULL DEFAULT 'waiting-provider',
  "providerMessageIdHash" VARCHAR(128),
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationConsultTicket_key_version_check"
    CHECK ("encryptionKeyVersion" >= 1),
  CONSTRAINT "AutomationConsultTicket_status_check" CHECK ("status" IN (
    'queued', 'reviewing', 'assigned', 'waiting-provider', 'closed', 'deleted'
  )),
  CONSTRAINT "AutomationConsultTicket_email_status_check"
    CHECK ("emailDeliveryStatus" IN (
      'waiting-provider', 'sending', 'provider-accepted', 'failed', 'not-required'
    ))
);
CREATE INDEX IF NOT EXISTS "AutomationConsultTicket_status_createdAt_idx"
  ON "AutomationConsultTicket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AutomationConsultTicket_retentionUntil_idx"
  ON "AutomationConsultTicket"("retentionUntil");
CREATE INDEX IF NOT EXISTS "AutomationConsultTicket_organizationId_status_idx"
  ON "AutomationConsultTicket"("organizationId", "status");
