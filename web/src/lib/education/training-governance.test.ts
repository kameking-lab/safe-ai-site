import { describe, expect, it } from "vitest";
import {
  evaluateTrainingCompletion,
  trainingClassificationLabel,
  type TrainingCompletionInput,
} from "./training-governance";

const complete: TrainingCompletionInput = {
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
  approverUserId: "approver-1",
  courseSourceVerified: true,
  courseVersionFixed: true,
  formalDeliveryAuthorityVerified: true,
  instructorQualificationVerified: true,
};

describe("legal training governance", () => {
  it("allows formal completion only when every legal and identity gate passes", () => {
    expect(evaluateTrainingCompletion(complete)).toEqual({
      level: "formal-statutory-completion",
      displayLabel: "正式な法定教育の修了",
      formalCertificateAllowed: true,
      missingForFormal: [],
    });
  });

  it("limits unverified local learning to learning completion", () => {
    const result = evaluateTrainingCompletion({
      ...complete,
      identityStatus: "unverified",
      verifierUserId: null,
      approverUserId: null,
      practicalSatisfied: false,
      formalDeliveryAuthorityVerified: false,
    });
    expect(result.level).toBe("learning-complete");
    expect(result.displayLabel).toBe("学習完了");
    expect(result.formalCertificateAllowed).toBe(false);
    expect(result.missingForFormal).toEqual(
      expect.arrayContaining([
        "learner.identity",
        "practical-training",
        "verifier",
        "approver",
        "delivery-authority",
      ]),
    );
  });

  it("uses an internal record, never a formal certificate, when legal gates remain", () => {
    const result = evaluateTrainingCompletion({
      ...complete,
      formalDeliveryAuthorityVerified: false,
    });
    expect(result.level).toBe("internal-training-record");
    expect(result.displayLabel).toBe("社内受講記録");
    expect(result.formalCertificateAllowed).toBe(false);
  });

  it("requires verifier and approver to be independent", () => {
    const result = evaluateTrainingCompletion({
      ...complete,
      approverUserId: complete.verifierUserId,
    });
    expect(result.formalCertificateAllowed).toBe(false);
    expect(result.missingForFormal).toContain("approver.independent");
  });

  it("keeps statutory categories distinct in wording", () => {
    expect(trainingClassificationLabel("skill-training")).toBe("技能講習");
    expect(trainingClassificationLabel("special-education")).toBe("特別教育");
    expect(trainingClassificationLabel("employment-restriction")).toBe("就業制限");
  });
});
