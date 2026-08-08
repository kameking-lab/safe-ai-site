import { describe, expect, it, vi } from "vitest";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  listTrainingProgress,
  recordTrainingCompletion,
} from "./training-governance-repository";

function databaseWith(
  rows: unknown[],
  execute = vi.fn().mockResolvedValue(1),
): {
  database: GovernanceDatabase;
  execute: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn().mockResolvedValue(rows);
  const transaction: GovernanceSql = {
    $queryRawUnsafe: query,
    $executeRawUnsafe: execute,
  };
  return {
    database: {
      ...transaction,
      $transaction: async <T>(
        callback: (database: GovernanceSql) => Promise<T>,
      ) => callback(transaction),
    },
    execute,
    query,
  };
}

const formalReady = {
  userId: "verifier-1",
  role: "reviewer",
  enrollmentId: "enrollment-1",
  siteId: "site-1",
  classification: "special-education",
  identityStatus: "verified",
  requiredMinutes: 360,
  learningMinutes: 360,
  attendanceSatisfied: true,
  practicalRequired: true,
  practicalSatisfied: true,
  instructorRequired: true,
  instructorSatisfied: true,
  assessmentRequired: true,
  assessmentPassed: true,
  verifierUserId: "verifier-1",
  courseSourceVerified: true,
  courseVersionFixed: true,
  formalDeliveryAuthorityVerified: true,
  instructorQualificationVerified: true,
};

describe("organization training repository", () => {
  it("always scopes progress by organization and optional site", async () => {
    const query = vi.fn().mockResolvedValue([]);
    await listTrainingProgress(
      { $queryRawUnsafe: query, $executeRawUnsafe: vi.fn() },
      "org-1",
      "site-1",
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('enrollment."organizationId" = $1'),
      "org-1",
      "site-1",
    );
  });

  it("records formal completion only when server-derived gates pass", async () => {
    const { database, execute, query } = databaseWith([formalReady]);
    const result = await recordTrainingCompletion(database, {
      organizationId: "org-1",
      enrollmentId: "enrollment-1",
      actorUserId: "approver-1",
      actorRole: "approver",
      expiresAt: null,
      renewalDueAt: new Date("2027-07-31T00:00:00Z"),
    });
    expect(result).toMatchObject({
      ok: true,
      level: "formal-statutory-completion",
      formalCertificateAllowed: true,
    });
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"TrainingCompletion"'),
    )).toBe(true);
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"GovernanceAuditLog"'),
    )).toBe(true);
    const completionQuery = String(query.mock.calls[0]?.[0]);
    expect(completionQuery).toContain(
      'version."courseSource"->>\'verified\'',
    );
    expect(completionQuery).toContain(
      'item."evidence"->>\'instructorQualificationVerified\'',
    );
  });

  it("downgrades to an internal record when delivery authority is unverified", async () => {
    const { database } = databaseWith([
      { ...formalReady, formalDeliveryAuthorityVerified: false },
    ]);
    const result = await recordTrainingCompletion(database, {
      organizationId: "org-1",
      enrollmentId: "enrollment-1",
      actorUserId: "approver-1",
      actorRole: "approver",
      expiresAt: null,
      renewalDueAt: null,
    });
    expect(result).toMatchObject({
      ok: true,
      level: "internal-training-record",
      formalCertificateAllowed: false,
    });
    if (result.ok) expect(result.missingForFormal).toContain("delivery-authority");
  });

  it("does not treat a verifier outside the active reviewer role as formal verification", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([formalReady])
      .mockResolvedValueOnce([{ userId: "verifier-1", role: "editor" }]);
    const execute = vi.fn().mockResolvedValue(1);
    const transaction: GovernanceSql = {
      $queryRawUnsafe: query,
      $executeRawUnsafe: execute,
    };
    const result = await recordTrainingCompletion(
      {
        ...transaction,
        $transaction: async <T>(
          callback: (database: GovernanceSql) => Promise<T>,
        ) => callback(transaction),
      },
      {
        organizationId: "org-1",
        enrollmentId: "enrollment-1",
        actorUserId: "approver-1",
        actorRole: "approver",
        expiresAt: null,
        renewalDueAt: null,
      },
    );
    expect(result).toMatchObject({
      ok: true,
      formalCertificateAllowed: false,
    });
    if (result.ok) expect(result.missingForFormal).toContain("verifier");
  });
});
