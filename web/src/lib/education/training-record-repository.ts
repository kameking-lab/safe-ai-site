import "server-only";

import { randomUUID } from "node:crypto";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  roleAllows,
  type OrganizationRole,
} from "@/lib/organization-roles";

type CommonInput = {
  organizationId: string;
  actorUserId: string;
  actorRole: OrganizationRole;
};

export type TrainingRecordWriteInput =
  | (CommonInput & {
      action: "create-learner";
      siteId: string;
      displayName: string;
      identityEvidence: unknown[];
    })
  | (CommonInput & {
      action: "verify-identity";
      learnerId: string;
      identityStatus: "pending" | "verified" | "rejected";
      identityEvidence: unknown[];
    })
  | (CommonInput & {
      action: "create-course-version";
      courseCode: string;
      title: string;
      classification:
        | "self-study"
        | "internal-support"
        | "part-of-statutory-training"
        | "formal-statutory-training"
        | "skill-training"
        | "special-education"
        | "foreman-training"
        | "operation-chief"
        | "employment-restriction";
      legalCategory: string;
      source: unknown;
      instructorRequirementLabel: string;
      practicalRequirementLabel: string;
      versionLabel: string;
      requiredMinutes: number;
      assessmentRequirement: unknown;
      attendanceRequirement: unknown;
      practicalRequirement: unknown;
      instructorRequirement: unknown;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      sourceSnapshot: unknown;
    })
  | (CommonInput & {
      action: "create-enrollment";
      siteId: string;
      learnerId: string;
      courseVersionId: string;
      dueDate: Date | null;
      evidence: unknown[];
    })
  | (CommonInput & {
      action: "record-progress";
      enrollmentId: string;
      progressPercent: number;
      learningMinutes: number;
      evidence: unknown[];
    })
  | (CommonInput & {
      action: "record-attendance";
      enrollmentId: string;
      attendanceType: string;
      attendedMinutes: number;
      instructorUserId: string | null;
      practicalCompleted: boolean;
      evidence: unknown[];
      occurredAt: Date;
    })
  | (CommonInput & {
      action: "record-assessment";
      enrollmentId: string;
      assessmentType: string;
      score: number | null;
      passed: boolean;
      evidence: unknown[];
      assessedAt: Date;
    });

export type TrainingRecordWriteResult =
  | {
      ok: true;
      entityType: string;
      entityId: string;
      status: string;
    }
  | { ok: false; reason: string };

function json(value: unknown): string {
  return JSON.stringify(value);
}

function attendanceEvidenceJson(items: unknown[]): string {
  const instructorQualificationVerified = items.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "instructorQualificationVerified" in item &&
      item.instructorQualificationVerified === true,
  );
  return json({
    items,
    instructorQualificationVerified,
  });
}

function requiredRole(
  action: TrainingRecordWriteInput["action"],
): OrganizationRole {
  if (action === "create-course-version") return "admin";
  if (
    action === "verify-identity" ||
    action === "record-attendance" ||
    action === "record-assessment"
  ) {
    return "reviewer";
  }
  return "editor";
}

async function audit(
  transaction: GovernanceSql,
  input: CommonInput,
  values: {
    siteId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    status: string;
    metadata?: unknown;
  },
): Promise<void> {
  await transaction.$executeRawUnsafe(
    `
      INSERT INTO "GovernanceAuditLog" (
        "organizationId", "siteId", "actorUserId", "scope", "entityType",
        "entityId", "action", "toStatus", "metadata", "createdAt"
      ) VALUES (
        $1, $2, $3, 'training', $4, $5, $6, $7, $8::jsonb,
        clock_timestamp()
      )
    `,
    input.organizationId,
    values.siteId,
    input.actorUserId,
    values.entityType,
    values.entityId,
    values.action,
    values.status,
    json(values.metadata ?? {}),
  );
}

export async function writeOrganizationTrainingRecord(
  database: GovernanceDatabase,
  input: TrainingRecordWriteInput,
): Promise<TrainingRecordWriteResult> {
  if (!roleAllows(input.actorRole, requiredRole(input.action))) {
    return { ok: false, reason: "insufficient_role" };
  }
  return database.$transaction(async (transaction) => {
    if (input.action === "create-learner") {
      const sites = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT "id"
          FROM "SafetySite"
          WHERE "id" = $1
            AND "organizationId" = $2
            AND "status" = 'active'
          LIMIT 1
        `,
        input.siteId,
        input.organizationId,
      );
      if (!sites[0]) return { ok: false, reason: "site_scope_invalid" };
      const learnerId = randomUUID();
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "TrainingLearner" (
            "id", "organizationId", "siteId", "displayName",
            "identityStatus", "identityEvidence", "status", "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, 'pending', $5::jsonb, 'active',
            clock_timestamp(), clock_timestamp()
          )
        `,
        learnerId,
        input.organizationId,
        input.siteId,
        input.displayName,
        json(input.identityEvidence),
      );
      await audit(transaction, input, {
        siteId: input.siteId,
        entityType: "learner",
        entityId: learnerId,
        action: "learner-created",
        status: "pending",
        metadata: { hasIdentityEvidence: input.identityEvidence.length > 0 },
      });
      return {
        ok: true,
        entityType: "learner",
        entityId: learnerId,
        status: "pending",
      };
    }

    if (input.action === "verify-identity") {
      const learners = await transaction.$queryRawUnsafe<
        Array<{ id: string; siteId: string }>
      >(
        `
          SELECT "id", "siteId"
          FROM "TrainingLearner"
          WHERE "id" = $1
            AND "organizationId" = $2
            AND "status" = 'active'
          FOR UPDATE
        `,
        input.learnerId,
        input.organizationId,
      );
      const learner = learners[0];
      if (!learner) return { ok: false, reason: "learner_not_found" };
      await transaction.$executeRawUnsafe(
        `
          UPDATE "TrainingLearner"
          SET "identityStatus" = $3,
              "identityVerifiedAt" =
                CASE WHEN $3 = 'verified' THEN clock_timestamp() ELSE NULL END,
              "identityVerifierId" = $4,
              "identityEvidence" = $5::jsonb,
              "updatedAt" = clock_timestamp()
          WHERE "id" = $1 AND "organizationId" = $2
        `,
        learner.id,
        input.organizationId,
        input.identityStatus,
        input.actorUserId,
        json(input.identityEvidence),
      );
      await audit(transaction, input, {
        siteId: learner.siteId,
        entityType: "learner",
        entityId: learner.id,
        action: "identity-reviewed",
        status: input.identityStatus,
        metadata: { evidenceCount: input.identityEvidence.length },
      });
      return {
        ok: true,
        entityType: "learner",
        entityId: learner.id,
        status: input.identityStatus,
      };
    }

    if (input.action === "create-course-version") {
      const candidateCourseId = randomUUID();
      const versionId = randomUUID();
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "TrainingCourse" (
            "id", "organizationId", "courseCode", "title",
            "classification", "legalCategory", "source",
            "instructorRequirement", "practicalTrainingRequirement",
            "status", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 'active',
            clock_timestamp(), clock_timestamp()
          )
          ON CONFLICT ("organizationId", "courseCode") DO NOTHING
        `,
        candidateCourseId,
        input.organizationId,
        input.courseCode,
        input.title,
        input.classification,
        input.legalCategory,
        json(input.source),
        input.instructorRequirementLabel,
        input.practicalRequirementLabel,
      );
      const courses = await transaction.$queryRawUnsafe<
        Array<{ id: string }>
      >(
        `
          SELECT "id"
          FROM "TrainingCourse"
          WHERE "organizationId" = $1
            AND "courseCode" = $2
          FOR UPDATE
        `,
        input.organizationId,
        input.courseCode,
      );
      const courseId = courses[0]?.id;
      if (!courseId) return { ok: false, reason: "course_write_failed" };
      await transaction.$executeRawUnsafe(
        `
          UPDATE "TrainingCourse"
          SET "title" = $3,
              "classification" = $4,
              "legalCategory" = $5,
              "source" = $6::jsonb,
              "instructorRequirement" = $7,
              "practicalTrainingRequirement" = $8,
              "status" = 'active',
              "updatedAt" = clock_timestamp()
          WHERE "id" = $1 AND "organizationId" = $2
        `,
        courseId,
        input.organizationId,
        input.title,
        input.classification,
        input.legalCategory,
        json(input.source),
        input.instructorRequirementLabel,
        input.practicalRequirementLabel,
      );
      const versionNumbers = await transaction.$queryRawUnsafe<
        Array<{ nextVersionNumber: number }>
      >(
        `
          SELECT COALESCE(MAX("versionNumber"), 0)::int + 1
            AS "nextVersionNumber"
          FROM "TrainingCourseVersion"
          WHERE "courseId" = $1
        `,
        courseId,
      );
      const versionNumber = Number(
        versionNumbers[0]?.nextVersionNumber ?? 0,
      );
      if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        return { ok: false, reason: "course_version_sequence_invalid" };
      }
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "TrainingCourseVersion" (
            "id", "courseId", "versionNumber", "versionLabel",
            "title", "classification", "legalCategory", "courseSource",
            "instructorRequirementLabel",
            "practicalTrainingRequirementLabel",
            "requiredMinutes", "assessmentRequirement",
            "attendanceRequirement", "practicalRequirement",
            "instructorRequirement", "effectiveFrom", "effectiveTo",
            "sourceSnapshot", "createdByUserId", "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10,
            $11, $12::jsonb, $13::jsonb, $14::jsonb,
            $15::jsonb, $16, $17, $18::jsonb, $19,
            clock_timestamp()
          )
        `,
        versionId,
        courseId,
        versionNumber,
        input.versionLabel,
        input.title,
        input.classification,
        input.legalCategory,
        json(input.source),
        input.instructorRequirementLabel,
        input.practicalRequirementLabel,
        input.requiredMinutes,
        json(input.assessmentRequirement),
        json(input.attendanceRequirement),
        json(input.practicalRequirement),
        json(input.instructorRequirement),
        input.effectiveFrom,
        input.effectiveTo,
        json(input.sourceSnapshot),
        input.actorUserId,
      );
      await audit(transaction, input, {
        siteId: null,
        entityType: "course",
        entityId: courseId,
        action: "course-version-created",
        status: "active",
        metadata: { versionId, versionNumber },
      });
      return {
        ok: true,
        entityType: "course-version",
        entityId: versionId,
        status: "active",
      };
    }

    if (input.action === "create-enrollment") {
      const sources = await transaction.$queryRawUnsafe<
        Array<{ learnerId: string; siteId: string; courseVersionId: string }>
      >(
        `
          SELECT
            learner."id" AS "learnerId",
            learner."siteId",
            version."id" AS "courseVersionId"
          FROM "TrainingLearner" learner
          INNER JOIN "TrainingCourseVersion" version
            ON version."id" = $4
          INNER JOIN "TrainingCourse" course
            ON course."id" = version."courseId"
           AND course."organizationId" = learner."organizationId"
           AND course."status" = 'active'
          WHERE learner."id" = $1
            AND learner."organizationId" = $2
            AND learner."siteId" = $3
            AND learner."status" = 'active'
          LIMIT 1
        `,
        input.learnerId,
        input.organizationId,
        input.siteId,
        input.courseVersionId,
      );
      const source = sources[0];
      if (!source) return { ok: false, reason: "enrollment_scope_invalid" };
      const enrollmentId = randomUUID();
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "TrainingEnrollment" (
            "id", "organizationId", "siteId", "learnerId",
            "courseVersionId", "status", "progressPercent",
            "learningMinutes", "enrolledAt", "dueDate", "evidence",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, 'enrolled', 0, 0,
            clock_timestamp(), $6, $7::jsonb, clock_timestamp(),
            clock_timestamp()
          )
        `,
        enrollmentId,
        input.organizationId,
        source.siteId,
        source.learnerId,
        source.courseVersionId,
        input.dueDate,
        json(input.evidence),
      );
      await audit(transaction, input, {
        siteId: source.siteId,
        entityType: "enrollment",
        entityId: enrollmentId,
        action: "enrolled",
        status: "enrolled",
        metadata: { courseVersionId: source.courseVersionId },
      });
      return {
        ok: true,
        entityType: "enrollment",
        entityId: enrollmentId,
        status: "enrolled",
      };
    }

    const enrollments = await transaction.$queryRawUnsafe<
      Array<{ id: string; siteId: string }>
    >(
      `
        SELECT "id", "siteId"
        FROM "TrainingEnrollment"
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "status" NOT IN ('withdrawn', 'archived')
        FOR UPDATE
      `,
      input.enrollmentId,
      input.organizationId,
    );
    const enrollment = enrollments[0];
    if (!enrollment) return { ok: false, reason: "enrollment_not_found" };

    if (input.action === "record-progress") {
      await transaction.$executeRawUnsafe(
        `
          UPDATE "TrainingEnrollment"
          SET "progressPercent" = $3,
              "learningMinutes" = $4,
              "status" = CASE
                WHEN $3 = 0 THEN 'enrolled'
                ELSE 'in-progress'
              END,
              "evidence" = $5::jsonb,
              "updatedAt" = clock_timestamp()
          WHERE "id" = $1 AND "organizationId" = $2
        `,
        enrollment.id,
        input.organizationId,
        input.progressPercent,
        input.learningMinutes,
        json(input.evidence),
      );
      await audit(transaction, input, {
        siteId: enrollment.siteId,
        entityType: "enrollment",
        entityId: enrollment.id,
        action: "progress-recorded",
        status: input.progressPercent === 0 ? "enrolled" : "in-progress",
        metadata: {
          progressPercent: input.progressPercent,
          learningMinutes: input.learningMinutes,
        },
      });
      return {
        ok: true,
        entityType: "enrollment",
        entityId: enrollment.id,
        status: input.progressPercent === 0 ? "enrolled" : "in-progress",
      };
    }

    if (input.action === "record-attendance") {
      if (input.instructorUserId) {
        const instructors = await transaction.$queryRawUnsafe<
          Array<{ userId: string }>
        >(
          `
            SELECT "userId"
            FROM "SafetyMembership"
            WHERE "organizationId" = $1
              AND "userId" = $2
              AND "status" = 'active'
            LIMIT 1
          `,
          input.organizationId,
          input.instructorUserId,
        );
        if (!instructors[0]) {
          return { ok: false, reason: "instructor_scope_invalid" };
        }
      }
      const attendanceId = randomUUID();
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "TrainingAttendance" (
            "id", "enrollmentId", "attendanceType", "attendedMinutes",
            "instructorUserId", "practicalCompleted", "verifiedByUserId",
            "evidence", "occurredAt", "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9,
            clock_timestamp()
          )
        `,
        attendanceId,
        enrollment.id,
        input.attendanceType,
        input.attendedMinutes,
        input.instructorUserId,
        input.practicalCompleted,
        input.actorUserId,
        attendanceEvidenceJson(input.evidence),
        input.occurredAt,
      );
      await audit(transaction, input, {
        siteId: enrollment.siteId,
        entityType: "attendance",
        entityId: attendanceId,
        action: "attendance-verified",
        status: "verified",
        metadata: {
          enrollmentId: enrollment.id,
          attendedMinutes: input.attendedMinutes,
          practicalCompleted: input.practicalCompleted,
        },
      });
      return {
        ok: true,
        entityType: "attendance",
        entityId: attendanceId,
        status: "verified",
      };
    }

    const assessmentId = randomUUID();
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "TrainingAssessment" (
          "id", "enrollmentId", "assessmentType", "score", "passed",
          "assessedAt", "assessorUserId", "verifiedAt",
          "verifiedByUserId", "evidence", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, clock_timestamp(), $7,
          $8::jsonb, clock_timestamp()
        )
      `,
      assessmentId,
      enrollment.id,
      input.assessmentType,
      input.score,
      input.passed,
      input.assessedAt,
      input.actorUserId,
      json(input.evidence),
    );
    await audit(transaction, input, {
      siteId: enrollment.siteId,
      entityType: "assessment",
      entityId: assessmentId,
      action: "assessment-verified",
      status: input.passed ? "passed" : "not-passed",
      metadata: { enrollmentId: enrollment.id, passed: input.passed },
    });
    return {
      ok: true,
      entityType: "assessment",
      entityId: assessmentId,
      status: input.passed ? "passed" : "not-passed",
    };
  });
}
