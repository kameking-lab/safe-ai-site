export type HeatLearningClaimKind =
  | "statutory-duty"
  | "statutory-scope"
  | "guideline-recommendation"
  | "official-observation"
  | "official-emergency-guidance"
  | "portal-explanation";

export type HeatLearningSourceType =
  | "ministerial-ordinance"
  | "implementation-notice"
  | "guideline-notice"
  | "official-web-guidance"
  | "official-observation-guidance"
  | "official-learning-resource";

export type HeatLearningReviewStatus =
  | "external-legal-review-pending"
  | "editorial-review-pending";

export interface HeatLearningSource {
  id: string;
  registryId: string;
  title: string;
  issuer: "厚生労働省" | "e-Gov法令検索" | "環境省" | "消防庁";
  documentNumber: string | null;
  url: string;
  sourceType: HeatLearningSourceType;
  publishedAt: string | null;
  effectiveFrom: string | null;
  retrievedAt: string;
  verifiedAt: string | null;
  sourceStatus: "url-confirmed-content-review-pending";
  reviewStatus: HeatLearningReviewStatus;
  scope: string;
  limitation: string;
  supersedes: string | null;
}

export interface HeatLearningClaim {
  id: string;
  kind: HeatLearningClaimKind;
  text: string;
  sourceIds: readonly string[];
  locator: string;
}

export interface HeatLearningSlide {
  id: string;
  number: number;
  eyebrow: string;
  title: string;
  lead: string;
  claims: readonly HeatLearningClaim[];
  fieldAction: string;
}

export interface HeatLearningDeck {
  id: string;
  title: string;
  audience: string;
  expectedMinutes: string;
  asOf: string;
  purpose: string;
  boundary: string;
  slides: readonly HeatLearningSlide[];
}

export interface HeatLearningQuestionOption {
  id: string;
  label: string;
}

export interface HeatLearningQuestion {
  id: string;
  number: number;
  legend: string;
  context: string;
  options: readonly HeatLearningQuestionOption[];
  correctOptionId: string;
  rationale: string;
  kind: HeatLearningClaimKind;
  sourceIds: readonly string[];
  locator: string;
  emergency: boolean;
}
