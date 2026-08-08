import "server-only";

import { randomUUID } from "node:crypto";
import {
  evaluateTrainingCompletion,
  TRAINING_CLASSIFICATIONS,
  type TrainingClassification,
} from "@/lib/education/training-governance";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  roleAllows,
  type OrganizationRole,
} from "@/lib/organization-roles";

export type TrainingProgressRow = {
  enrollmentId: string;
  siteId: string;
  siteName: string;
  learnerId: string;
  displayName: string;
  identityStatus: string;
  courseCode: string;
  courseTitle: string;
  classification: string;
  legalCategory: string;
  courseVersion: string;
  status: string;
  progressPercent: number;
  learningMinutes: number;
  requiredMinutes: number;
  dueDate: Date | null;
  completedAt: Date | null;
  renewalDueAt: Date | null;
  completionLevel: string | null;
  completionLabel: string | null;
  formalApprovedAt: Date | null;
};

export async function listTrainingProgress(
  database: GovernanceSql,
  organizationId: string,
  siteId?: string | null,
): Promise<TrainingProgressRow[]> {
  return database.$queryRawUnsafe<TrainingProgressRow[]>(
    `
      SELECT
        enrollment."id" AS "enrollmentId",
        enrollment."siteId",
        site."name" AS "siteName",
        learner."id" AS "learnerId",
        learner."displayName",
        learner."identityStatus",
        course."courseCode",
        version."title" AS "courseTitle",
        version."classification",
        version."legalCategory",
        version."versionLabel" AS "courseVersion",
        enrollment."status",
        enrollment."progressPercent",
        enrollment."learningMinutes",
        version."requiredMinutes",
        enrollment."dueDate",
        enrollment."completedAt",
        enrollment."renewalDueAt",
        completion."completionLevel",
        completion."displayLabel" AS "completionLabel",
        completion."approvedAt" AS "formalApprovedAt"
      FROM "TrainingEnrollment" AS enrollment
      INNER JOIN "SafetySite" AS site
        ON site."id" = enrollment."siteId"
       AND site."organizationId" = enrollment."organizationId"
      INNER JOIN "TrainingLearner" AS learner
        ON learner."id" = enrollment."learnerId"
       AND learner."organizationId" = enrollment."organizationId"
      INNER JOIN "TrainingCourseVersion" AS version
        ON version."id" = enrollment."courseVersionId"
      INNER JOIN "TrainingCourse" AS course
        ON course."id" = version."courseId"
       AND course."organizationId" = enrollment."organizationId"
      LEFT JOIN "TrainingCompletion" AS completion
        ON completion."enrollmentId" = enrollment."id"
       AND completion."revokedAt" IS NULL
      WHERE enrollment."organizationId" = $1
        AND ($2::varchar IS NULL OR enrollment."siteId" = $2)
      ORDER BY
        CASE WHEN enrollment."dueDate" IS NULL THEN 1 ELSE 0 END,
        enrollment."dueDate" ASC,
        learner."displayName" ASC
      LIMIT 1000
    `,
    organizationId,
    siteId ?? null,
  );
}

type CompletionSourceRow = {
  enrollmentId: string;
  siteId: string;
  classification: string;
  identityStatus: "unverified" | "pending" | "verified" | "rejected";
  requiredMinutes: number;
  learningMinutes: number;
  attendanceSatisfied: boolean;
  practicalRequired: boolean;
  practicalSatisfied: boolean;
  instructorRequired: boolean;
  instructorSatisfied: boolean;
  assessmentRequired: boolean;
  assessmentPassed: boolean;
  verifierUserId: string | null;
  courseSourceVerified: boolean;
  courseVersionFixed: boolean;
  formalDeliveryAuthorityVerified: boolean;
  instructorQualificationVerified: boolean;
};

function isClassification(value: string): value is TrainingClassification {
  return TRAINING_CLASSIFICATIONS.includes(value as TrainingClassification);
}

export async function recordTrainingCompletion(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    enrollmentId: string;
    actorUserId: string;
    actorRole: OrganizationRole;
    expiresAt: Date | null;
    renewalDueAt: Date | null;
  },
): Promise<
  | {
      ok: true;
      completionId: string;
      level: string;
      displayLabel: string;
      formalCertificateAllowed: boolean;
      missingForFormal: string[];
    }
  | { ok: false; reason: string }
> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<CompletionSourceRow[]>(
      `
        SELECT
          enrollment."id" AS "enrollmentId",
          enrollment."siteId",
          version."classification",
          learner."identityStatus",
          version."requiredMinutes",
          enrollment."learningMinutes",
          (
            enrollment."learningMinutes" >= version."requiredMinutes"
            AND COALESCE(attendance."attendedMinutes", 0) >=
              COALESCE(
                (version."attendanceRequirement"->>'requiredMinutes')::int,
                0
              )
          ) AS "attendanceSatisfied",
          COALESCE(
            (version."practicalRequirement"->>'required')::boolean,
            false
          ) AS "practicalRequired",
          COALESCE(attendance."practicalSatisfied", false)
            AS "practicalSatisfied",
          COALESCE(
            (version."instructorRequirement"->>'required')::boolean,
            false
          ) AS "instructorRequired",
          COALESCE(attendance."instructorSatisfied", false)
            AS "instructorSatisfied",
          COALESCE(
            (version."assessmentRequirement"->>'required')::boolean,
            false
          ) AS "assessmentRequired",
          COALESCE(assessment."assessmentPassed", false)
            AS "assessmentPassed",
          attendance."verifierUserId",
          COALESCE((version."courseSource"->>'verified')::boolean, false)
            AS "courseSourceVerified",
          (
            version."versionLabel" <> ''
            AND version."sourceSnapshot" IS NOT NULL
          ) AS "courseVersionFixed",
          COALESCE(
            (version."sourceSnapshot"->>'formalDeliveryAuthorityVerified')::boolean,
            false
          ) AS "formalDeliveryAuthorityVerified",
          COALESCE(attendance."instructorQualificationVerified", false)
            AS "instructorQualificationVerified"
        FROM "TrainingEnrollment" AS enrollment
        INNER JOIN "TrainingLearner" AS learner
          ON learner."id" = enrollment."learnerId"
         AND learner."organizationId" = enrollment."organizationId"
        INNER JOIN "TrainingCourseVersion" AS version
          ON version."id" = enrollment."courseVersionId"
        INNER JOIN "TrainingCourse" AS course
          ON course."id" = version."courseId"
         AND course."organizationId" = enrollment."organizationId"
        LEFT JOIN LATERAL (
          SELECT
            SUM(item."attendedMinutes")::int AS "attendedMinutes",
            BOOL_OR(item."practicalCompleted") AS "practicalSatisfied",
            BOOL_OR(item."instructorUserId" IS NOT NULL)
              AS "instructorSatisfied",
            BOOL_OR(
              COALESCE(
                (item."evidence"->>'instructorQualificationVerified')::boolean,
                false
              )
            ) AS "instructorQualificationVerified",
            (
              ARRAY_AGG(
                item."verifiedByUserId"
                ORDER BY item."occurredAt" DESC
              ) FILTER (WHERE item."verifiedByUserId" IS NOT NULL)
            )[1] AS "verifierUserId"
          FROM "TrainingAttendance" item
          WHERE item."enrollmentId" = enrollment."id"
        ) attendance ON true
        LEFT JOIN LATERAL (
          SELECT BOOL_OR(item."passed" = true AND item."verifiedAt" IS NOT NULL)
            AS "assessmentPassed"
          FROM "TrainingAssessment" item
          WHERE item."enrollmentId" = enrollment."id"
        ) assessment ON true
        WHERE enrollment."id" = $1
          AND enrollment."organizationId" = $2
        FOR UPDATE OF enrollment
      `,
      input.enrollmentId,
      input.organizationId,
    );
    const row = rows[0];
    if (!row || !isClassification(row.classification)) {
      return { ok: false, reason: "enrollment_not_found" };
    }
    let verifiedVerifierUserId: string | null = null;
    if (row.verifierUserId) {
      const verifierMemberships = await transaction.$queryRawUnsafe<
        Array<{ userId: string; role: string }>
      >(
        `
          SELECT "userId", "role"
          FROM "SafetyMembership"
          WHERE "organizationId" = $1
            AND "userId" = $2
            AND "status" = 'active'
          LIMIT 1
        `,
        input.organizationId,
        row.verifierUserId,
      );
      const verifierRole = verifierMemberships[0]?.role;
      if (
        verifierRole &&
        ["viewer", "editor", "reviewer", "approver", "admin"].includes(
          verifierRole,
        ) &&
        roleAllows(verifierRole as OrganizationRole, "reviewer")
      ) {
        verifiedVerifierUserId = row.verifierUserId;
      }
    }
    const approverUserId =
      input.actorRole === "approver" || input.actorRole === "admin"
        ? input.actorUserId
        : null;
    const decision = evaluateTrainingCompletion({
      ...row,
      classification: row.classification,
      verifierUserId: verifiedVerifierUserId,
      approverUserId,
    });
    const completionId = randomUUID();
    const practicalGateSatisfied =
      !row.practicalRequired || row.practicalSatisfied;
    const instructorGateSatisfied =
      !row.instructorRequired || row.instructorSatisfied;
    const assessmentGateSatisfied =
      !row.assessmentRequired || row.assessmentPassed;
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "TrainingCompletion" (
          "id", "enrollmentId", "completionLevel", "displayLabel",
          "identitySatisfied", "timeSatisfied", "practicalSatisfied",
          "instructorSatisfied", "examSatisfied", "verifierUserId",
          "verifiedAt", "approverUserId", "approvedAt", "expiresAt",
          "renewalDueAt", "evidence", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          CASE WHEN $10::varchar IS NULL THEN NULL ELSE clock_timestamp() END,
          $11,
          CASE WHEN $12::boolean THEN clock_timestamp() ELSE NULL END,
          $13, $14, $15::jsonb, clock_timestamp(), clock_timestamp()
        )
        ON CONFLICT ("enrollmentId")
        DO UPDATE SET
          "completionLevel" = EXCLUDED."completionLevel",
          "displayLabel" = EXCLUDED."displayLabel",
          "identitySatisfied" = EXCLUDED."identitySatisfied",
          "timeSatisfied" = EXCLUDED."timeSatisfied",
          "practicalSatisfied" = EXCLUDED."practicalSatisfied",
          "instructorSatisfied" = EXCLUDED."instructorSatisfied",
          "examSatisfied" = EXCLUDED."examSatisfied",
          "verifierUserId" = EXCLUDED."verifierUserId",
          "verifiedAt" = EXCLUDED."verifiedAt",
          "approverUserId" = EXCLUDED."approverUserId",
          "approvedAt" = EXCLUDED."approvedAt",
          "expiresAt" = EXCLUDED."expiresAt",
          "renewalDueAt" = EXCLUDED."renewalDueAt",
          "evidence" = EXCLUDED."evidence",
          "revokedAt" = NULL,
          "updatedAt" = clock_timestamp()
      `,
      completionId,
      row.enrollmentId,
      decision.level,
      decision.displayLabel,
      row.identityStatus === "verified",
      row.learningMinutes >= row.requiredMinutes,
      practicalGateSatisfied,
      instructorGateSatisfied,
      assessmentGateSatisfied,
      verifiedVerifierUserId,
      approverUserId,
      decision.formalCertificateAllowed,
      input.expiresAt,
      input.renewalDueAt,
      JSON.stringify({
        missingForFormal: decision.missingForFormal,
        formalCertificateAllowed: decision.formalCertificateAllowed,
        formalCertificateGenerated: false,
      }),
    );
    await transaction.$executeRawUnsafe(
      `
        UPDATE "TrainingEnrollment"
        SET
          "status" = $3,
          "completedAt" =
            CASE WHEN $3 = 'enrolled' THEN NULL ELSE clock_timestamp() END,
          "renewalDueAt" = $4,
          "updatedAt" = clock_timestamp()
        WHERE "id" = $1 AND "organizationId" = $2
      `,
      row.enrollmentId,
      input.organizationId,
      decision.level === "self-check" ? "enrolled" : "completed",
      input.renewalDueAt,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope", "entityType",
          "entityId", "action", "toStatus", "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'training', 'enrollment', $4,
          'completion-evaluated', $5, $6::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      row.siteId,
      input.actorUserId,
      row.enrollmentId,
      decision.level,
      JSON.stringify({
        formalCertificateAllowed: decision.formalCertificateAllowed,
        missingForFormal: decision.missingForFormal,
      }),
    );
    return {
      ok: true,
      completionId,
      level: decision.level,
      displayLabel: decision.displayLabel,
      formalCertificateAllowed: decision.formalCertificateAllowed,
      missingForFormal: decision.missingForFormal,
    };
  });
}
