import { describe, expect, it } from "vitest";
import {
  canTransitionChemicalRa,
  detectChemicalReassessmentTriggers,
  evaluateChemicalRaApprovalGate,
  isValidCasNumber,
  type ChemicalRaApprovalInput,
} from "./ra-governance";

const complete: ChemicalRaApprovalInput = {
  status: "review-required",
  chemicalIdentity: "トルエン",
  casNumber: "108-88-3",
  identityUniquenessConfirmed: true,
  mixtureConfirmed: false,
  mixtureComponents: null,
  sdsRecordId: "sds-1",
  sdsVersionLabel: "2026-04",
  sdsIssueDate: new Date("2026-04-01T00:00:00Z"),
  processName: "塗装工程",
  taskName: "刷毛塗り",
  quantity: "2 L/日",
  concentration: "99%",
  exposureDuration: "30分/回",
  frequency: "2回/日",
  temperature: "25℃",
  ventilation: "全体換気あり",
  localExhaust: "囲い式局所排気",
  skinExposure: "飛沫のおそれあり",
  ppe: ["有機ガス用防毒マスク", "耐薬品手袋"],
  existingControl: ["密閉容器"],
  additionalControl: ["局排点検"],
  ownerUserId: "owner-1",
  reviewerUserId: "reviewer-1",
  approverUserId: "approver-1",
  reassessmentDate: new Date("2027-04-01T00:00:00Z"),
  aiCandidatesReviewed: true,
  sources: [{ type: "SDS", version: "2026-04" }],
  evidence: [{ type: "measurement", id: "evidence-1" }],
  unresolvedWarningCount: 0,
};

describe("formal chemical RA approval gate", () => {
  it("approves only a fully reviewed, evidenced version", () => {
    expect(
      evaluateChemicalRaApprovalGate(
        complete,
        new Date("2026-07-31T00:00:00Z"),
      ),
    ).toEqual({ approved: true, missing: [] });
  });

  it("never treats unresolved or incomplete input as approved", () => {
    const result = evaluateChemicalRaApprovalGate(
      {
        ...complete,
        casNumber: null,
        identityUniquenessConfirmed: false,
        unresolvedWarningCount: 2,
        aiCandidatesReviewed: false,
        sdsVersionLabel: null,
      },
      new Date("2026-07-31T00:00:00Z"),
    );
    expect(result.approved).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "identity.confirmed-cas-or-mixture",
        "unresolvedWarningCount.zero",
        "aiCandidatesReviewed",
        "sdsVersionLabel",
      ]),
    );
  });

  it("requires independent reviewer and approver roles", () => {
    const result = evaluateChemicalRaApprovalGate(
      {
        ...complete,
        reviewerUserId: "owner-1",
        approverUserId: "owner-1",
      },
      new Date("2026-07-31T00:00:00Z"),
    );
    expect(result.missing).toContain("reviewer.independent");
    expect(result.missing).toContain("approver.independent");
  });
});

describe("SDS identity and version triggers", () => {
  it("validates the CAS checksum", () => {
    expect(isValidCasNumber("108-88-3")).toBe(true);
    expect(isValidCasNumber("108-88-4")).toBe(false);
    expect(isValidCasNumber("CAS 108-88-3")).toBe(false);
  });

  it("turns material changes into explicit reassessment triggers", () => {
    const triggers = detectChemicalReassessmentTriggers(
      {
        sdsVersionLabel: "2025-01",
        mixtureComponents: ["toluene"],
        concentration: "50%",
        quantity: "1 L",
        processName: "塗布",
        ventilation: "全体換気",
        localExhaust: "なし",
        ppe: ["手袋"],
      },
      {
        sdsVersionLabel: "2026-04",
        mixtureComponents: ["toluene", "xylene"],
        concentration: "70%",
        quantity: "2 L",
        processName: "吹付",
        ventilation: "機械換気",
        localExhaust: "囲い式",
        ppe: ["手袋", "防毒マスク"],
      },
    );
    expect(triggers).toEqual([
      "sds-updated",
      "component-changed",
      "concentration-changed",
      "quantity-changed",
      "process-changed",
      "ventilation-changed",
      "ppe-changed",
    ]);
  });

  it("prevents skipping review and preserves approved history", () => {
    expect(canTransitionChemicalRa("screening-complete", "approved")).toBe(false);
    expect(canTransitionChemicalRa("review-required", "approved")).toBe(true);
    expect(canTransitionChemicalRa("approved", "draft")).toBe(false);
    expect(canTransitionChemicalRa("approved", "reassessment-due")).toBe(true);
  });
});
