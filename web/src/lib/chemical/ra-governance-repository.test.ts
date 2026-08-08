import { describe, expect, it, vi } from "vitest";
import {
  approveChemicalRaVersion,
  createChemicalRaRevision,
  createChemicalSdsRecord,
  createChemicalRaDraft,
  flagChemicalRaReassessment,
  processDueChemicalReassessments,
  recordChemicalRaReviewDecision,
  type GovernanceDatabase,
  type GovernanceSql,
} from "./ra-governance-repository";

function transactionDatabase(
  query: GovernanceSql["$queryRawUnsafe"],
  execute: GovernanceSql["$executeRawUnsafe"],
): GovernanceDatabase {
  const transaction = { $queryRawUnsafe: query, $executeRawUnsafe: execute };
  return {
    ...transaction,
    $transaction: async <T>(callback: (database: GovernanceSql) => Promise<T>) =>
      callback(transaction),
  };
}

const completeDraft = {
  organizationId: "org-1",
  siteId: "site-1",
  assessmentNumber: "RA-2026-001",
  chemicalIdentity: "トルエン",
  casNumber: "108-88-3",
  identityConfirmed: true,
  mixtureConfirmed: false,
  mixtureComponents: [],
  sdsRecordId: "sds-1",
  sdsVersionLabel: "2026-04",
  sdsIssueDate: new Date("2026-04-01T00:00:00Z"),
  processName: "塗装",
  taskName: "刷毛塗り",
  quantity: "2 L/日",
  concentration: "99%",
  exposureDuration: "30分/回",
  frequency: "2回/日",
  temperature: "25℃",
  ventilation: "全体換気",
  localExhaust: "囲い式",
  skinExposure: "飛沫あり",
  ppe: ["防毒マスク"],
  existingControl: ["密閉"],
  additionalControl: ["局排点検"],
  reviewerUserId: "reviewer-1",
  approverUserId: "approver-1",
  dueDate: new Date("2026-08-31T00:00:00Z"),
  reassessmentDate: new Date("2099-08-01T00:00:00Z"),
  aiCandidatesReviewed: true,
  sources: [{ type: "SDS" }],
  evidence: [{ type: "measurement" }],
  unresolvedWarnings: [],
  changeReason: "新規作業",
  submitForReview: true,
  actorUserId: "owner-1",
};

describe("chemical RA repository", () => {
  it("creates assessment, immutable version, and audit log atomically", async () => {
    const execute = vi.fn().mockResolvedValue(1);
    const database = transactionDatabase(
      vi.fn().mockResolvedValue([{ id: "sds-1" }]),
      execute,
    );
    const result = await createChemicalRaDraft(database, completeDraft);
    expect(result.status).toBe("review-required");
    expect(result.missing).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[0]?.[0]).toContain('"ChemicalRaAssessment"');
    expect(execute.mock.calls[1]?.[0]).toContain('"ChemicalRaVersion"');
    expect(execute.mock.calls[2]?.[0]).toContain('"GovernanceAuditLog"');
    expect(execute.mock.calls[2]?.[0]).not.toContain("chemicalIdentity");
  });

  it("does not submit a cross-site or mismatched SDS record for review", async () => {
    const execute = vi.fn().mockResolvedValue(1);
    const result = await createChemicalRaDraft(
      transactionDatabase(vi.fn().mockResolvedValue([]), execute),
      completeDraft,
    );
    expect(result.status).toBe("input-incomplete");
    expect(result.missing).toContain("sdsRecord.verified-scope-version");
    const versionInsert = execute.mock.calls[1] ?? [];
    expect(versionInsert).not.toContain("sds-1");
  });

  it("records an approval and status audit only after the gate passes", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          assessmentId: "assessment-1",
          versionId: "version-1",
          organizationId: "org-1",
          siteId: "site-1",
          currentVersionNumber: 1,
          versionNumber: 1,
          status: "review-required",
          chemicalIdentity: "トルエン",
          casNumber: "108-88-3",
          identityUniquenessConfirmed: true,
          mixtureConfirmed: false,
          mixtureComponents: null,
          sdsRecordId: "sds-1",
          sdsVersionLabel: "2026-04",
          sdsIssueDate: new Date("2026-04-01T00:00:00Z"),
          processName: "塗装",
          taskName: "刷毛塗り",
          quantity: "2 L/日",
          concentration: "99%",
          exposureDuration: "30分/回",
          frequency: "2回/日",
          temperature: "25℃",
          ventilation: "全体換気",
          localExhaust: "囲い式",
          skinExposure: "飛沫あり",
          ppe: ["防毒マスク"],
          existingControl: ["密閉"],
          additionalControl: ["局排点検"],
          ownerUserId: "owner-1",
          reviewerUserId: "reviewer-1",
          approverUserId: "approver-1",
          reassessmentDate: new Date("2027-08-01T00:00:00Z"),
          aiCandidatesReviewed: true,
          sources: [{ type: "SDS" }],
          evidence: [{ type: "measurement" }],
          unresolvedWarningCount: 0,
        },
      ])
      .mockResolvedValueOnce([
        { userId: "reviewer-1", role: "reviewer" },
        { userId: "approver-1", role: "approver" },
      ])
      .mockResolvedValueOnce([
        {
          id: "review-1",
          reviewerUserId: "reviewer-1",
          decision: "recommend-approval",
          decidedAt: new Date("2026-07-30T00:00:00Z"),
        },
      ]);
    const execute = vi.fn().mockResolvedValue(1);
    const database = transactionDatabase(query, execute);
    const result = await approveChemicalRaVersion(database, {
      organizationId: "org-1",
      assessmentId: "assessment-1",
      actorUserId: "approver-1",
      actorRole: "approver",
      comment: "対策確認済み",
      now: new Date("2026-07-31T00:00:00Z"),
    });
    expect(result.ok).toBe(true);
    expect(query.mock.calls[0]?.[0]).toContain("FOR UPDATE");
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"ChemicalRaApproval"'),
    )).toBe(true);
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"GovernanceAuditLog"'),
    )).toBe(true);
    const approvalInsert = execute.mock.calls.find((call) =>
      String(call[0]).includes('"ChemicalRaApproval"'),
    );
    expect(approvalInsert).toContainEqual(
      new Date("2026-07-30T00:00:00Z"),
    );
  });

  it("requires the assigned reviewer to record a version-fixed decision before approval", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          ...completeDraft,
          assessmentId: "assessment-1",
          versionId: "version-1",
          organizationId: "org-1",
          siteId: "site-1",
          currentVersionNumber: 1,
          versionNumber: 1,
          status: "review-required",
          ownerUserId: "owner-1",
          identityUniquenessConfirmed: true,
          unresolvedWarningCount: 0,
        },
      ])
      .mockResolvedValueOnce([
        { userId: "reviewer-1", role: "reviewer" },
        { userId: "approver-1", role: "approver" },
      ])
      .mockResolvedValueOnce([]);
    const execute = vi.fn().mockResolvedValue(1);
    await expect(
      approveChemicalRaVersion(transactionDatabase(query, execute), {
        organizationId: "org-1",
        assessmentId: "assessment-1",
        actorUserId: "approver-1",
        actorRole: "approver",
        comment: null,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "reviewer_decision_required",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("records the assigned reviewer's recommendation without fabricating approval", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          ...completeDraft,
          assessmentId: "assessment-1",
          versionId: "version-1",
          organizationId: "org-1",
          siteId: "site-1",
          currentVersionNumber: 1,
          versionNumber: 1,
          status: "review-required",
          ownerUserId: "owner-1",
          identityUniquenessConfirmed: true,
          unresolvedWarningCount: 0,
        },
      ])
      .mockResolvedValueOnce([{ userId: "reviewer-1", role: "reviewer" }]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await recordChemicalRaReviewDecision(
      transactionDatabase(query, execute),
      {
        organizationId: "org-1",
        assessmentId: "assessment-1",
        actorUserId: "reviewer-1",
        actorRole: "reviewer",
        decision: "recommend-approval",
        comment: "reviewed against the fixed SDS and task conditions",
        now: new Date("2026-07-31T00:00:00Z"),
      },
    );
    expect(result).toMatchObject({
      ok: true,
      versionNumber: 1,
      decision: "recommend-approval",
    });
    expect(
      execute.mock.calls.some((call) =>
        String(call[0]).includes('"ChemicalRaReviewDecision"'),
      ),
    ).toBe(true);
    expect(
      execute.mock.calls.some((call) =>
        String(call[0]).includes('"ChemicalRaApproval"'),
      ),
    ).toBe(false);
  });

  it("does not write when the SDS version or warning resolution is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          ...completeDraft,
          assessmentId: "assessment-1",
          versionId: "version-1",
          currentVersionNumber: 1,
          versionNumber: 1,
          status: "review-required",
          ownerUserId: "owner-1",
          sdsVersionLabel: null,
          identityUniquenessConfirmed: true,
          unresolvedWarningCount: 1,
        },
      ])
      .mockResolvedValueOnce([
        { userId: "reviewer-1", role: "reviewer" },
        { userId: "approver-1", role: "approver" },
      ])
      .mockResolvedValueOnce([
        {
          id: "review-1",
          reviewerUserId: "reviewer-1",
          decision: "recommend-approval",
          decidedAt: new Date("2026-07-30T00:00:00Z"),
        },
      ]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await approveChemicalRaVersion(
      transactionDatabase(query, execute),
      {
        organizationId: "org-1",
        assessmentId: "assessment-1",
        actorUserId: "approver-1",
        actorRole: "approver",
        comment: null,
        now: new Date("2026-07-31T00:00:00Z"),
      },
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "approval_gate_failed",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("creates version 2, supersedes version 1, and keeps reassessment open until approval", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          assessmentId: "assessment-1",
          siteId: "site-1",
          assessmentStatus: "reassessment-due",
          currentVersionNumber: 1,
          versionId: "version-1",
          versionStatus: "approved",
          sdsVersionLabel: "2026-04",
          mixtureComponents: [],
          concentration: "99%",
          quantity: "2 L/日",
          processName: "塗装",
          ventilation: "全体換気",
          localExhaust: "囲い式",
          ppe: ["防毒マスク"],
        },
      ])
      .mockResolvedValueOnce([{ id: "sds-1" }]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await createChemicalRaRevision(
      transactionDatabase(query, execute),
      {
        ...completeDraft,
        organizationId: "org-1",
        assessmentId: "assessment-1",
        concentration: "50%",
        changeReason: "SDS更新と濃度変更",
      },
    );
    expect(result).toMatchObject({
      ok: true,
      versionNumber: 2,
      status: "review-required",
    });
    if (result.ok) {
      expect(result.reassessmentTriggers).toContain("concentration-changed");
    }
    expect(
      execute.mock.calls.some(
        (call) =>
          String(call[0]).includes('"ChemicalRaVersion"') &&
          String(call[0]).includes("'superseded'"),
      ),
    ).toBe(true);
    expect(
      execute.mock.calls.some(
        (call) =>
          String(call[0]).includes('"ChemicalRaAssessment"') &&
          String(call[0]).includes('"currentVersionNumber"'),
      ),
    ).toBe(true);
  });

  it("records a new SDS version and marks matching approved RA for reassessment", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "assessment-1", siteId: "site-1" },
    ]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await createChemicalSdsRecord(
      transactionDatabase(query, execute),
      {
        organizationId: "org-1",
        siteId: "site-1",
        chemicalIdentity: "toluene",
        casNumber: "108-88-3",
        mixtureConfirmed: false,
        versionLabel: "2026-07",
        issueDate: new Date("2026-07-01T00:00:00Z"),
        sourceUrl: "https://example.invalid/sds",
        evidence: [{ verified: true }],
        actorUserId: "editor-1",
      },
    );
    expect(result.reassessmentAssessmentIds).toEqual(["assessment-1"]);
    expect(
      execute.mock.calls.some((call) =>
        String(call[0]).includes('"ChemicalReassessmentTrigger"'),
      ),
    ).toBe(true);
    expect(
      execute.mock.calls.some((call) =>
        String(call[0]).includes("'reassessment-due'"),
      ),
    ).toBe(true);
  });

  it("persists manual change and incident triggers without approving an unapproved RA", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "assessment-1", siteId: "site-1", status: "approved" },
    ]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await flagChemicalRaReassessment(
      transactionDatabase(query, execute),
      {
        organizationId: "org-1",
        assessmentId: "assessment-1",
        actorUserId: "editor-1",
        triggerType: "incident-or-near-miss",
        reason: "synthetic near-miss evidence",
        sourceRef: "evidence-1",
      },
    );
    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[2]?.[0]).not.toContain(
      "synthetic near-miss evidence",
    );
  });

  it("turns due approved assessments into periodic reassessment work", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "assessment-1",
        organizationId: "org-1",
        siteId: "site-1",
      },
    ]);
    const execute = vi.fn().mockResolvedValue(1);
    await expect(
      processDueChemicalReassessments(
        transactionDatabase(query, execute),
      ),
    ).resolves.toEqual({ processed: 1 });
    expect(query.mock.calls[0]?.[0]).toContain("FOR UPDATE SKIP LOCKED");
    expect(
      execute.mock.calls.some((call) =>
        String(call[0]).includes("'periodic-date'"),
      ),
    ).toBe(true);
  });
});
