import { SAFETY_COURSES } from "./courses";
import { SAFETY_QUESTIONS } from "./questions";
import { SAFETY_REVIEW_MANIFEST } from "./review-manifest";
import { SAFETY_SOURCE_FACTS } from "./source-facts";
import { SAFETY_SOURCE_REGISTRY } from "./source-registry";
import type { SafetyQuestion, SourceRights } from "./types";

const PUBLISHABLE_RIGHTS = new Set<SourceRights>([
  "user_authored",
  "explicit_reuse_permission",
  "official_open_license",
  "public_domain",
]);

const OFFICIAL_HOSTS = new Set([
  "laws.e-gov.go.jp",
  "www.exam.or.jp",
  "www.mhlw.go.jp",
  "www.digital.go.jp",
]);

const DISALLOWED_REVIEW_COLLISION_FRAGMENTS = [
  "常時80人の労働者を使用",
  "常時250人の労働者を使用",
] as const;

export interface SafetyValidationOptions {
  requireIndependentReview?: boolean;
}

function normalizedQuestionText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isIsoDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function validateQuestion(
  question: SafetyQuestion,
  requireIndependentReview: boolean,
): string[] {
  const errors: string[] = [];
  const prefix = `question:${question.questionId}`;
  const choiceIds = question.choices.map((choice) => choice.choiceId);
  const correctChoiceIds = new Set<string>(question.officialCorrectChoiceIds);
  const explanationIds = question.explanationByChoice.map(
    (entry) => entry.choiceId,
  );

  if (!question.questionId.trim()) errors.push(`${prefix}:empty-id`);
  if (!question.questionText.trim()) errors.push(`${prefix}:empty-text`);
  if (question.choices.length < 2 || question.choices.length > 5) {
    errors.push(`${prefix}:choice-count`);
  }
  if (new Set(choiceIds).size !== choiceIds.length) {
    errors.push(`${prefix}:duplicate-choice-id`);
  }
  if (question.officialCorrectChoiceIds.length < 1) {
    errors.push(`${prefix}:missing-correct-choice`);
  }
  for (const correctId of question.officialCorrectChoiceIds) {
    if (!choiceIds.includes(correctId)) {
      errors.push(`${prefix}:unknown-correct-choice:${correctId}`);
    }
  }
  if (
    explanationIds.length !== choiceIds.length ||
    new Set(explanationIds).size !== explanationIds.length ||
    choiceIds.some((choiceId) => !explanationIds.includes(choiceId))
  ) {
    errors.push(`${prefix}:incomplete-choice-explanations`);
  }

  const factIds = new Set<string>(
    SAFETY_SOURCE_FACTS.map((fact) => fact.factId),
  );
  for (const entry of question.explanationByChoice) {
    const expectedVerdict = correctChoiceIds.has(entry.choiceId)
      ? "correct"
      : "incorrect";
    if (entry.verdict !== expectedVerdict) {
      errors.push(`${prefix}:${entry.choiceId}:verdict-answer-mismatch`);
    }
    if (entry.sourceFactIds.length === 0) {
      errors.push(`${prefix}:${entry.choiceId}:missing-source-fact`);
    }
    if (!entry.verified) {
      errors.push(`${prefix}:${entry.choiceId}:unverified-explanation`);
    }
    if (!entry.shortReason.trim() || !entry.detailedReason.trim()) {
      errors.push(`${prefix}:${entry.choiceId}:empty-explanation`);
    }
    for (const factId of entry.sourceFactIds) {
      if (!factIds.has(factId)) {
        errors.push(`${prefix}:${entry.choiceId}:unknown-fact:${factId}`);
      }
    }
    if (entry.officialLinks.length === 0) {
      errors.push(`${prefix}:${entry.choiceId}:missing-official-link`);
    }
    for (const link of entry.officialLinks) {
      try {
        const url = new URL(link);
        if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname)) {
          errors.push(`${prefix}:${entry.choiceId}:non-official-link:${link}`);
        }
      } catch {
        errors.push(`${prefix}:${entry.choiceId}:invalid-link:${link}`);
      }
    }
  }

  for (const evidenceId of question.answerEvidenceIds) {
    if (!factIds.has(evidenceId)) {
      errors.push(`${prefix}:unknown-answer-evidence:${evidenceId}`);
    }
  }
  if (question.answerEvidenceIds.length === 0) {
    errors.push(`${prefix}:missing-answer-evidence`);
  }
  const correctExplanationFactIds = new Set<string>(
    question.explanationByChoice
      .filter((entry) => correctChoiceIds.has(entry.choiceId))
      .flatMap((entry) => [...entry.sourceFactIds]),
  );
  for (const evidenceId of question.answerEvidenceIds) {
    if (!correctExplanationFactIds.has(evidenceId)) {
      errors.push(`${prefix}:answer-evidence-not-in-correct-explanation:${evidenceId}`);
    }
  }
  for (const factId of correctExplanationFactIds) {
    if (!question.answerEvidenceIds.includes(factId)) {
      errors.push(`${prefix}:correct-explanation-fact-not-answer-evidence:${factId}`);
    }
  }

  const lawFactSources = new Map<string, string>();
  for (const lawSource of question.lawSources) {
    const source = SAFETY_SOURCE_REGISTRY.find(
      (candidate) => candidate.sourceId === lawSource.sourceId,
    );
    if (!source || source.sourceType !== "law" || !source.active) {
      errors.push(`${prefix}:invalid-law-source:${lawSource.sourceId}`);
    }
    if (!lawSource.locator.trim() || lawSource.sourceFactIds.length === 0) {
      errors.push(`${prefix}:incomplete-law-source:${lawSource.sourceId}`);
    }
    if (source?.lawVersionAsOf !== question.lawAsOf) {
      errors.push(`${prefix}:law-version-mismatch:${lawSource.sourceId}`);
    }
    if (source && !question.officialSourceLinks.includes(source.sourceUrl)) {
      errors.push(`${prefix}:law-source-link-not-declared:${lawSource.sourceId}`);
    }
    for (const factId of lawSource.sourceFactIds) {
      const fact = SAFETY_SOURCE_FACTS.find((candidate) => candidate.factId === factId);
      if (!fact || fact.sourceId !== lawSource.sourceId) {
        errors.push(`${prefix}:law-fact-source-mismatch:${factId}`);
      }
      if (lawFactSources.has(factId)) {
        errors.push(`${prefix}:law-fact-declared-more-than-once:${factId}`);
      }
      lawFactSources.set(factId, lawSource.sourceId);
    }
  }
  const usedFactIds = new Set<string>([
    ...question.answerEvidenceIds,
    ...question.explanationByChoice.flatMap((entry) => [...entry.sourceFactIds]),
  ]);
  for (const factId of usedFactIds) {
    if (!lawFactSources.has(factId)) {
      errors.push(`${prefix}:used-fact-not-in-law-sources:${factId}`);
    }
  }

  if (!PUBLISHABLE_RIGHTS.has(question.rightsStatus)) {
    errors.push(`${prefix}:non-publishable-rights:${question.rightsStatus}`);
  }
  if (
    question.sourceMode === "original_source_grounded" &&
    (question.rightsStatus !== "user_authored" ||
      question.sourceQuestionId !== null ||
      question.sourceQuestionNumber !== null ||
      question.sourceYear !== null)
  ) {
    errors.push(`${prefix}:original-source-boundary`);
  }
  if (
    question.sourceMode === "official_link_exercise" ||
    question.sourceMode === "verbatim_allowed"
  ) {
    const officialQuestionSource = SAFETY_SOURCE_REGISTRY.find(
      (source) => source.sourceId === question.sourceQuestionId,
    );
    if (
      !officialQuestionSource ||
      officialQuestionSource.sourceType !== "official_question_with_answer" ||
      !officialQuestionSource.officialAnswerAvailable ||
      officialQuestionSource.qualificationId !== question.qualificationId ||
      question.sourceYear === null ||
      question.sourceQuestionNumber === null
    ) {
      errors.push(`${prefix}:official-answer-not-resolved-to-individual-source`);
    }
  }
  if (question.sourceMode === "private_draft") {
    errors.push(`${prefix}:private-draft-in-public-data`);
  }
  if (question.shuffleMode !== "fixed") {
    errors.push(`${prefix}:non-deterministic-choice-order`);
  }
  if (question.answerAuthority !== "official_primary_source_fact") {
    errors.push(`${prefix}:invalid-answer-authority`);
  }
  if (!isIsoDate(question.lawAsOf) || !isIsoDate(question.currentLawAsOf)) {
    errors.push(`${prefix}:invalid-law-date`);
  } else if (question.currentLawAsOf < question.lawAsOf) {
    errors.push(`${prefix}:current-law-before-question-law`);
  }
  if (question.currentLawChanged && !question.lawChangeNote) {
    errors.push(`${prefix}:missing-law-change-note`);
  }
  if (
    !question.currentLawChanged &&
    question.lawSources.some((lawSource) => {
      const source = SAFETY_SOURCE_REGISTRY.find(
        (candidate) => candidate.sourceId === lawSource.sourceId,
      );
      return source?.lawVersionAsOf !== question.lawAsOf;
    })
  ) {
    errors.push(`${prefix}:unchanged-law-version-not-current-snapshot`);
  }
  if (
    question.lawChangeNote &&
    (!question.lawChangeNote.atExam.trim() ||
      !question.lawChangeNote.current.trim() ||
      question.lawChangeNote.evidenceIds.length === 0)
  ) {
    errors.push(`${prefix}:incomplete-law-change-note`);
  }
  if (!isIsoDateTime(question.generatedAt) || !isIsoDateTime(question.verifiedAt)) {
    errors.push(`${prefix}:invalid-review-datetime`);
  } else if (Date.parse(question.verifiedAt) < Date.parse(question.generatedAt)) {
    errors.push(`${prefix}:verified-before-generated`);
  } else if (Date.parse(question.verifiedAt) > Date.now() + 5 * 60 * 1000) {
    errors.push(`${prefix}:verified-in-future`);
  }
  if (
    DISALLOWED_REVIEW_COLLISION_FRAGMENTS.some((fragment) =>
      question.questionText.includes(fragment),
    )
  ) {
    errors.push(`${prefix}:known-official-similarity-collision`);
  }
  if (
    requireIndependentReview &&
    question.reviewStatus !== "independently_reviewed"
  ) {
    errors.push(`${prefix}:independent-review-required`);
  }
  return errors;
}

export function validateSafetyLearningDataset(
  options: SafetyValidationOptions = {},
): string[] {
  const requireIndependentReview = options.requireIndependentReview ?? true;
  const errors: string[] = [];
  const sourceIds = SAFETY_SOURCE_REGISTRY.map((source) => source.sourceId);
  const sourceIdSet = new Set(sourceIds);
  const factIds = SAFETY_SOURCE_FACTS.map((fact) => fact.factId);
  const claimKeys = SAFETY_SOURCE_FACTS.map((fact) => fact.claimKey);
  const questionIds = SAFETY_QUESTIONS.map((question) => question.questionId);
  const courseIds = SAFETY_COURSES.map((course) => course.courseId);

  if (sourceIdSet.size !== sourceIds.length) errors.push("registry:duplicate-source-id");
  if (new Set(factIds).size !== factIds.length) errors.push("facts:duplicate-fact-id");
  if (new Set(claimKeys).size !== claimKeys.length) errors.push("facts:duplicate-claim-key");
  if (new Set(questionIds).size !== questionIds.length) errors.push("questions:duplicate-id");
  if (new Set(courseIds).size !== courseIds.length) errors.push("courses:duplicate-id");

  for (const source of SAFETY_SOURCE_REGISTRY) {
    if (!source.publisher.trim()) errors.push(`source:${source.sourceId}:publisher`);
    if (!/^https:\/\//.test(source.sourceUrl)) {
      errors.push(`source:${source.sourceId}:source-url`);
    }
    if (source.sourcePdfUrl && !/^https:\/\//.test(source.sourcePdfUrl)) {
      errors.push(`source:${source.sourceId}:pdf-url`);
    }
    if (!/^[a-f0-9]{64}$/.test(source.contentHash)) {
      errors.push(`source:${source.sourceId}:content-hash`);
    }
    if (source.active && (source.httpStatus !== 200 || !source.contentMatch)) {
      errors.push(`source:${source.sourceId}:active-without-200-match`);
    }
    if (!isIsoDateTime(source.checkedAt) || Date.parse(source.checkedAt) > Date.now() + 5 * 60 * 1000) {
      errors.push(`source:${source.sourceId}:invalid-or-future-check-time`);
    }
    if (source.sourceType === "law" && !source.lawVersionAsOf) {
      errors.push(`source:${source.sourceId}:missing-law-version`);
    }
    if (
      source.sourceType === "official_descriptive_question" &&
      source.officialAnswerAvailable
    ) {
      errors.push(`source:${source.sourceId}:descriptive-answer-flag`);
    }
  }

  for (const fact of SAFETY_SOURCE_FACTS) {
    const source = SAFETY_SOURCE_REGISTRY.find(
      (candidate) => candidate.sourceId === fact.sourceId,
    );
    if (!source) errors.push(`fact:${fact.factId}:unknown-source`);
    if (source && source.sourceType !== "law") {
      errors.push(`fact:${fact.factId}:source-is-not-law`);
    }
    if (source && !["public_domain", "official_open_license"].includes(source.rightsStatus)) {
      errors.push(`fact:${fact.factId}:non-authoritative-rights`);
    }
    if (!fact.paraphrasedFact.trim() || !fact.locator.trim()) {
      errors.push(`fact:${fact.factId}:empty-claim`);
    }
    if (
      !fact.validFrom ||
      !isIsoDate(fact.validFrom) ||
      fact.validFrom !== source?.lawVersionAsOf
    ) {
      errors.push(`fact:${fact.factId}:law-version-mismatch`);
    }
    if (!isIsoDateTime(fact.checkedAt) || Date.parse(fact.checkedAt) > Date.now() + 5 * 60 * 1000) {
      errors.push(`fact:${fact.factId}:invalid-or-future-check-time`);
    }
  }

  for (const question of SAFETY_QUESTIONS) {
    errors.push(...validateQuestion(question, requireIndependentReview));
  }

  const normalized = new Map<string, string>();
  for (const question of SAFETY_QUESTIONS) {
    const key = normalizedQuestionText(question.questionText);
    const prior = normalized.get(key);
    if (prior) errors.push(`questions:duplicate-text:${prior}:${question.questionId}`);
    normalized.set(key, question.questionId);
  }

  for (const course of SAFETY_COURSES) {
    const subjectIds = new Set<string>(
      course.subjects.map((subject) => subject.subjectId),
    );
    if (!course.questionIds.length) errors.push(`course:${course.courseId}:no-questions`);
    for (const questionId of course.questionIds) {
      const question = SAFETY_QUESTIONS.find((entry) => entry.questionId === questionId);
      if (!question) {
        errors.push(`course:${course.courseId}:unknown-question:${questionId}`);
        continue;
      }
      if (question.qualificationId !== course.qualificationId) {
        errors.push(`course:${course.courseId}:qualification-mismatch:${questionId}`);
      }
      if (!subjectIds.has(question.subjectId)) {
        errors.push(`course:${course.courseId}:subject-mismatch:${questionId}`);
      }
    }
    for (const sourceId of course.officialResourceSourceIds) {
      if (!sourceIdSet.has(sourceId)) {
        errors.push(`course:${course.courseId}:unknown-resource:${sourceId}`);
      }
    }
    for (const resource of course.unscoredDescriptiveResources) {
      const source = SAFETY_SOURCE_REGISTRY.find(
        (entry) => entry.sourceId === resource.sourceId,
      );
      if (
        !source ||
        source.sourceType !== "official_descriptive_question" ||
        source.officialAnswerAvailable
      ) {
        errors.push(`course:${course.courseId}:invalid-unscored-resource:${resource.resourceId}`);
      }
    }
  }

  if (requireIndependentReview) {
    if (
      SAFETY_REVIEW_MANIFEST.status !== "approved" ||
      !SAFETY_REVIEW_MANIFEST.reviewedAt ||
      !SAFETY_REVIEW_MANIFEST.reviewerRole
    ) {
      errors.push("review-manifest:not-approved");
    }
    const reviewed = new Set(SAFETY_REVIEW_MANIFEST.questionIds);
    for (const questionId of questionIds) {
      if (!reviewed.has(questionId)) {
        errors.push(`review-manifest:missing-question:${questionId}`);
      }
    }
  }

  return errors;
}

export function assertSafetyLearningDataset(
  options: SafetyValidationOptions = {},
): void {
  const errors = validateSafetyLearningDataset(options);
  if (errors.length > 0) {
    throw new Error(`Safety learning validation failed:\n${errors.join("\n")}`);
  }
}
