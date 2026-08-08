import { describe, expect, it, vi } from "vitest";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import { writeOrganizationTrainingRecord } from "./training-record-repository";

function database(
  query: GovernanceSql["$queryRawUnsafe"],
  execute = vi.fn().mockResolvedValue(1),
): { database: GovernanceDatabase; execute: ReturnType<typeof vi.fn> } {
  const transaction: GovernanceSql = {
    $queryRawUnsafe: query,
    $executeRawUnsafe: execute,
  };
  return {
    database: {
      ...transaction,
      $transaction: async <T>(
        callback: (sql: GovernanceSql) => Promise<T>,
      ) => callback(transaction),
    },
    execute,
  };
}

describe("organization training evidence writes", () => {
  it("creates a learner only inside the selected organization site", async () => {
    const { database: db, execute } = database(
      vi.fn().mockResolvedValue([{ id: "site-1" }]),
    );
    const result = await writeOrganizationTrainingRecord(db, {
      action: "create-learner",
      organizationId: "org-1",
      actorUserId: "editor-1",
      actorRole: "editor",
      siteId: "site-1",
      displayName: "合成受講者",
      identityEvidence: [{ kind: "admin-check-pending" }],
    });
    expect(result).toMatchObject({
      ok: true,
      entityType: "learner",
      status: "pending",
    });
    expect(execute.mock.calls[0]?.[0]).toContain('"TrainingLearner"');
    const auditCall = execute.mock.calls.find((call) =>
      String(call[0]).includes('"GovernanceAuditLog"'),
    );
    expect(JSON.stringify(auditCall)).not.toContain("合成受講者");
  });

  it("requires reviewer authorization for identity verification", async () => {
    const { database: db, execute } = database(vi.fn());
    await expect(
      writeOrganizationTrainingRecord(db, {
        action: "verify-identity",
        organizationId: "org-1",
        actorUserId: "editor-1",
        actorRole: "editor",
        learnerId: "learner-1",
        identityStatus: "verified",
        identityEvidence: [],
      }),
    ).resolves.toEqual({ ok: false, reason: "insufficient_role" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("binds attendance verification to the authenticated reviewer and organization enrollment", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "enrollment-1", siteId: "site-1" }])
      .mockResolvedValueOnce([{ userId: "instructor-1" }]);
    const { database: db, execute } = database(query);
    const result = await writeOrganizationTrainingRecord(db, {
      action: "record-attendance",
      organizationId: "org-1",
      actorUserId: "reviewer-1",
      actorRole: "reviewer",
      enrollmentId: "enrollment-1",
      attendanceType: "classroom",
      attendedMinutes: 360,
      instructorUserId: "instructor-1",
      practicalCompleted: true,
      evidence: [{ instructorQualificationVerified: true }],
      occurredAt: new Date("2026-07-31T00:00:00Z"),
    });
    expect(result).toMatchObject({
      ok: true,
      entityType: "attendance",
      status: "verified",
    });
    const attendance = execute.mock.calls.find((call) =>
      String(call[0]).includes('"TrainingAttendance"'),
    );
    expect(attendance).toContain("reviewer-1");
    expect(JSON.parse(String(attendance?.[8]))).toEqual({
      items: [{ instructorQualificationVerified: true }],
      instructorQualificationVerified: true,
    });
    expect(String(query.mock.calls[0]?.[0])).toContain(
      '"organizationId" = $2',
    );
  });

  it("locks an existing course and creates the next immutable version", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "course-1" }])
      .mockResolvedValueOnce([{ nextVersionNumber: 2 }]);
    const { database: db, execute } = database(query);
    const result = await writeOrganizationTrainingRecord(db, {
      action: "create-course-version",
      organizationId: "org-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      courseCode: "special-education-arc",
      title: "アーク溶接等の業務に係る特別教育",
      classification: "special-education",
      legalCategory: "特別教育",
      source: { verified: true, url: "https://www.mhlw.go.jp/" },
      instructorRequirementLabel: "講師要件を管理者が確認",
      practicalRequirementLabel: "実技を含む",
      versionLabel: "2026-07版",
      requiredMinutes: 360,
      assessmentRequirement: { required: true },
      attendanceRequirement: { requiredMinutes: 360 },
      practicalRequirement: { required: true },
      instructorRequirement: { required: true },
      effectiveFrom: new Date("2026-07-31T00:00:00Z"),
      effectiveTo: null,
      sourceSnapshot: {
        formalDeliveryAuthorityVerified: false,
      },
    });
    expect(result).toMatchObject({
      ok: true,
      entityType: "course-version",
      status: "active",
    });
    expect(String(execute.mock.calls[0]?.[0])).toContain(
      'ON CONFLICT ("organizationId", "courseCode") DO NOTHING',
    );
    expect(String(query.mock.calls[0]?.[0])).toContain("FOR UPDATE");
    const versionInsert = execute.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO "TrainingCourseVersion"'),
    );
    expect(versionInsert?.[3]).toBe(2);
    expect(versionInsert).toContain("special-education");
    expect(String(versionInsert?.[0])).toContain('"courseSource"');
    expect(String(versionInsert?.[0])).toContain('"classification"');
  });
});
