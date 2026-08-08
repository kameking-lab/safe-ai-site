export const TRAINING_CLASSIFICATIONS = [
  "self-study",
  "internal-support",
  "part-of-statutory-training",
  "formal-statutory-training",
  "skill-training",
  "special-education",
  "foreman-training",
  "operation-chief",
  "employment-restriction",
] as const;

export type TrainingClassification =
  (typeof TRAINING_CLASSIFICATIONS)[number];

export const TRAINING_COMPLETION_LEVELS = [
  "self-check",
  "learning-complete",
  "internal-training-record",
  "formal-statutory-completion",
] as const;

export type TrainingCompletionLevel =
  (typeof TRAINING_COMPLETION_LEVELS)[number];

export type TrainingCompletionInput = {
  classification: TrainingClassification;
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
  approverUserId: string | null;
  courseSourceVerified: boolean;
  courseVersionFixed: boolean;
  formalDeliveryAuthorityVerified: boolean;
  instructorQualificationVerified: boolean;
};

export type TrainingCompletionDecision = {
  level: TrainingCompletionLevel;
  displayLabel: "自己確認" | "学習完了" | "社内受講記録" | "正式な法定教育の修了";
  formalCertificateAllowed: boolean;
  missingForFormal: string[];
};

const FORMAL_CATEGORIES = new Set<TrainingClassification>([
  "formal-statutory-training",
  "skill-training",
  "special-education",
  "foreman-training",
  "operation-chief",
  "employment-restriction",
]);

export function evaluateTrainingCompletion(
  input: TrainingCompletionInput,
): TrainingCompletionDecision {
  const missingForFormal: string[] = [];
  if (!FORMAL_CATEGORIES.has(input.classification)) {
    missingForFormal.push("course.formal-category");
  }
  if (input.identityStatus !== "verified") {
    missingForFormal.push("learner.identity");
  }
  if (
    !Number.isInteger(input.requiredMinutes) ||
    input.requiredMinutes <= 0 ||
    input.learningMinutes < input.requiredMinutes
  ) {
    missingForFormal.push("required-time");
  }
  if (!input.attendanceSatisfied) missingForFormal.push("attendance");
  if (input.practicalRequired && !input.practicalSatisfied) {
    missingForFormal.push("practical-training");
  }
  if (input.instructorRequired && !input.instructorSatisfied) {
    missingForFormal.push("instructor-attendance");
  }
  if (input.instructorRequired && !input.instructorQualificationVerified) {
    missingForFormal.push("instructor-qualification");
  }
  if (input.assessmentRequired && !input.assessmentPassed) {
    missingForFormal.push("assessment");
  }
  if (!input.verifierUserId?.trim()) missingForFormal.push("verifier");
  if (!input.approverUserId?.trim()) missingForFormal.push("approver");
  if (
    input.verifierUserId?.trim() &&
    input.verifierUserId === input.approverUserId
  ) {
    missingForFormal.push("approver.independent");
  }
  if (!input.courseSourceVerified) missingForFormal.push("legal-source");
  if (!input.courseVersionFixed) missingForFormal.push("course-version");
  if (!input.formalDeliveryAuthorityVerified) {
    missingForFormal.push("delivery-authority");
  }

  if (missingForFormal.length === 0) {
    return {
      level: "formal-statutory-completion",
      displayLabel: "正式な法定教育の修了",
      formalCertificateAllowed: true,
      missingForFormal,
    };
  }

  const learnedEnough =
    Number.isInteger(input.requiredMinutes) &&
    input.requiredMinutes > 0 &&
    input.learningMinutes >= input.requiredMinutes;
  if (
    input.identityStatus === "verified" &&
    learnedEnough &&
    input.attendanceSatisfied &&
    input.verifierUserId?.trim()
  ) {
    return {
      level: "internal-training-record",
      displayLabel: "社内受講記録",
      formalCertificateAllowed: false,
      missingForFormal,
    };
  }
  if (learnedEnough) {
    return {
      level: "learning-complete",
      displayLabel: "学習完了",
      formalCertificateAllowed: false,
      missingForFormal,
    };
  }
  return {
    level: "self-check",
    displayLabel: "自己確認",
    formalCertificateAllowed: false,
    missingForFormal,
  };
}

export function trainingClassificationLabel(
  value: TrainingClassification,
): string {
  const labels: Record<TrainingClassification, string> = {
    "self-study": "自己学習",
    "internal-support": "社内教育補助",
    "part-of-statutory-training": "法定教育の一部",
    "formal-statutory-training": "正式な法定教育",
    "skill-training": "技能講習",
    "special-education": "特別教育",
    "foreman-training": "職長教育",
    "operation-chief": "作業主任者",
    "employment-restriction": "就業制限",
  };
  return labels[value];
}
