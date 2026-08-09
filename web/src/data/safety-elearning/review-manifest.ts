import { SAFETY_QUESTIONS } from "./questions";
import type { SafetyReviewManifest } from "./types";

export const SAFETY_REVIEW_MANIFEST: SafetyReviewManifest = {
  manifestId: "safety-elearning-first-release-2026-08-09",
  reviewedAt: "2026-08-09T10:56:00+09:00",
  reviewerRole: "independent read-only primary-source and learning-UX review",
  status: "approved",
  questionIds: SAFETY_QUESTIONS.map((question) => question.questionId),
  notes: [
    "All 16 original questions, correct answers and every choice explanation were checked against the registered official primary-source facts.",
    "The examination association material remains link-only; no question text or answer PDF is reproduced.",
    "Production approval covers original source-grounded multiple-choice questions only; descriptive resources remain unscored links and notes.",
  ],
};
