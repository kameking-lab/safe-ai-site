export type SourceRights =
  | "user_authored"
  | "explicit_reuse_permission"
  | "official_open_license"
  | "public_domain"
  | "link_only"
  | "permission_required"
  | "unknown"
  | "prohibited";

export type SafetySourceType =
  | "exam_index"
  | "official_question_with_answer"
  | "official_descriptive_question"
  | "law"
  | "rights_policy"
  | "official_guideline";

export interface SafetySourceRecord {
  sourceId: string;
  publisher: string;
  sourceType: SafetySourceType;
  sourceUrl: string;
  sourcePdfUrl: string | null;
  examName: string | null;
  qualificationId: string | null;
  subject: string | null;
  examDate: string | null;
  publicationDate: string | null;
  questionNumber: number | null;
  officialAnswerAvailable: boolean;
  officialExplanationAvailable: boolean;
  rightsStatus: SourceRights;
  checkedAt: string;
  contentHash: string;
  lawVersionAsOf: string | null;
  active: boolean;
  httpStatus: number;
  contentMatch: boolean;
  note: string;
}

export interface SafetySourceFact {
  factId: string;
  sourceId: string;
  claimKey: string;
  paraphrasedFact: string;
  locator: string;
  /** 確認に用いた現行法令版の基準日。規定の制定・初回施行日ではない。 */
  validFrom: string | null;
  validTo: string | null;
  checkedAt: string;
}

export interface SafetyChoice {
  choiceId: string;
  text: string;
}

export interface SafetyChoiceExplanation {
  choiceId: string;
  verdict: "correct" | "incorrect";
  shortReason: string;
  detailedReason: string;
  sourceFactIds: readonly string[];
  officialLinks: readonly string[];
  verified: boolean;
}

export interface SafetyLawSource {
  sourceId: string;
  locator: string;
  sourceFactIds: readonly string[];
}

export interface SafetyQuestion {
  questionId: string;
  qualificationId: string;
  subjectId: string;
  sourceMode:
    | "verbatim_allowed"
    | "original_source_grounded"
    | "official_link_exercise"
    | "private_draft";
  sourceQuestionId: string | null;
  sourceYear: number | null;
  sourceQuestionNumber: number | null;
  questionText: string;
  choices: readonly SafetyChoice[];
  officialCorrectChoiceIds: readonly string[];
  answerEvidenceIds: readonly string[];
  explanationByChoice: readonly SafetyChoiceExplanation[];
  officialSourceLinks: readonly string[];
  lawSources: readonly SafetyLawSource[];
  lawAsOf: string;
  currentLawAsOf: string;
  currentLawChanged: boolean;
  lawChangeNote?: {
    atExam: string;
    current: string;
    effectiveDate: string;
    evidenceIds: readonly string[];
  };
  rightsStatus: SourceRights;
  reviewStatus: "draft" | "source_verified" | "independently_reviewed";
  generatedAt: string;
  verifiedAt: string;
  interactionType: "single_choice";
  shuffleMode: "fixed" | "session";
  orderSensitive: boolean;
  answerAuthority: "official_primary_source_fact";
}

export interface SafetySubject {
  subjectId: string;
  title: string;
}

export interface UnscoredDescriptiveResource {
  resourceId: string;
  title: string;
  sourceId: string;
  topicChecklist: readonly string[];
  structureSteps: readonly string[];
  lawLinks: readonly { title: string; url: string }[];
}

export interface SafetyCourse {
  courseId: string;
  qualificationId: string;
  title: string;
  shortTitle: string;
  description: string;
  subjects: readonly SafetySubject[];
  questionIds: readonly string[];
  officialResourceSourceIds: readonly string[];
  unscoredDescriptiveResources: readonly UnscoredDescriptiveResource[];
  published: boolean;
  verifiedAt: string;
}

export interface SafetyReviewManifest {
  manifestId: string;
  reviewedAt: string | null;
  reviewerRole: string | null;
  status: "pending" | "approved" | "rejected";
  questionIds: readonly string[];
  notes: readonly string[];
}
