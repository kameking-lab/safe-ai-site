export const SERVICE_FIRST_FORBIDDEN_TERMS = [
  "RAG",
  "hash",
  "eval",
  "machine scoring",
  "synthetic",
  "corpus",
  "provenance",
  "retrieval",
  "Recall@",
  "MRR",
  "nDCG",
  "自作評価",
  "第三者検証",
  "収録範囲",
  "正本確認",
  "機械検証",
  "人手確認",
] as const;

export type ServiceCopyBudgetSnapshot = {
  route: string;
  h1Count: number;
  introDescriptionLength: number | null;
  statusBadgeCount: number;
  mascotCount: number;
  visibleCharactersBeforePrimaryAction: number;
  primaryActionCount: number;
  secondaryActionCount: number;
  warningCardCount: number;
  firstViewportActionCount: number;
  firstViewportCandidateChipCount: number;
  persistentWarningPhrases: readonly string[];
  chatbotInitialBoxActionCount: number;
  repeatedNoticeTexts: readonly string[];
  visibleMainText: string;
  detailsCharacters: number;
  textOutsideDetails: string;
  answerActionCounts: readonly number[];
  chatbotBoxCount: number;
  chatbotQuestionChipCount: number;
  confirmationRequiredCount: number;
};

export type ServiceCopyBudgetLimits = {
  visibleCharactersBeforePrimaryAction: number;
  h1Count: number;
  introDescriptionLength: number;
  statusBadgeCount: number;
  mascotCount: number;
  primaryActionCount: number;
  secondaryActionCount: number;
  warningCardCount: number;
  firstViewportActionCount: number;
  answerActionCount: number;
  chatbotQuestionChipCount: number;
  chatbotInitialActionCount: number;
  chatbotBoxCount: number;
  disclaimerCharactersOutsideDetails: number;
  confirmationRequiredCount: number;
};

export const SERVICE_FIRST_COPY_LIMITS: ServiceCopyBudgetLimits = {
  visibleCharactersBeforePrimaryAction: 120,
  h1Count: 1,
  introDescriptionLength: 60,
  statusBadgeCount: 2,
  mascotCount: 1,
  primaryActionCount: 1,
  secondaryActionCount: 2,
  warningCardCount: 0,
  firstViewportActionCount: 3,
  answerActionCount: 3,
  chatbotQuestionChipCount: 3,
  chatbotInitialActionCount: 6,
  chatbotBoxCount: 3,
  disclaimerCharactersOutsideDetails: 80,
  confirmationRequiredCount: 1,
};

export type ServiceCopyBudgetIssue = {
  code:
    | "h1-count"
    | "intro-copy"
    | "status-badges"
    | "mascot-count"
    | "copy-before-action"
    | "primary-actions"
    | "secondary-actions"
    | "warning-cards"
    | "persistent-warning-copy"
    | "first-viewport-actions"
    | "candidate-chips"
    | "repeated-notice"
    | "forbidden-term"
    | "answer-actions"
    | "chatbot-boxes"
    | "chatbot-question-chips"
    | "chatbot-initial-actions"
    | "disclaimer-outside-details"
    | "confirmation-required";
  actual: number | string;
  limit: number | string;
};

export const SERVICE_FIRST_ROUTE_CANDIDATE_LIMITS: Readonly<
  Record<string, number>
> = {
  "/chatbot": 3,
  "/law-search": 3,
  "/chemical-ra": 3,
  "/accidents": 6,
  "/education-certification": 4,
};

const PERSISTENT_WARNING_COPY = [
  /機械(?:検証|評価)(?:済み)?/,
  /人手(?:確認|レビュー)(?:待ち|未実施|未登録)?/,
  /確認記録待ち/,
  /(?:検証|確認)待ち/,
  /第三者検証(?:は)?(?:ありません|未実施)/,
  /生成AI回答は停止中/,
  /判断保留[:：]?/,
] as const;

export function findPersistentWarningPhrases(text: string): string[] {
  return PERSISTENT_WARNING_COPY.flatMap((pattern) => {
    const match = text.match(pattern);
    return match?.[0] ? [match[0]] : [];
  }).filter((phrase, index, values) => values.indexOf(phrase) === index);
}

export function firstViewportActionLimit(
  route: string,
  limits: ServiceCopyBudgetLimits = SERVICE_FIRST_COPY_LIMITS,
  observedCandidateChips?: number,
): number {
  const candidateLimit = SERVICE_FIRST_ROUTE_CANDIDATE_LIMITS[route] ?? 0;
  const candidateAllowance =
    observedCandidateChips === undefined
      ? candidateLimit
      : Math.min(Math.max(0, observedCandidateChips), candidateLimit);
  return (
    limits.firstViewportActionCount +
    candidateAllowance
  );
}

const DISCLAIMER_SENTENCE =
  /[^。！？\n]*(?:法的助言|公式見解|個人情報.{0,16}入力しない|健康情報.{0,16}入力しない|最終判断は|正本.{0,12}確認|AI.{0,12}(?:限界|誤り|保証しない))[^。！？\n]*[。！？]?/g;

export function countDisclaimerCharacters(text: string): number {
  return [...text.matchAll(DISCLAIMER_SENTENCE)].reduce(
    (total, match) => total + match[0].replace(/\s/g, "").length,
    0,
  );
}

export function findForbiddenServiceTerms(text: string): string[] {
  return SERVICE_FIRST_FORBIDDEN_TERMS.filter((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, "i").test(text);
  });
}

export function evaluateServiceCopyBudget(
  snapshot: ServiceCopyBudgetSnapshot,
  limits: ServiceCopyBudgetLimits = SERVICE_FIRST_COPY_LIMITS,
): ServiceCopyBudgetIssue[] {
  const issues: ServiceCopyBudgetIssue[] = [];
  const add = (
    code: ServiceCopyBudgetIssue["code"],
    actual: number | string,
    limit: number | string,
  ) => issues.push({ code, actual, limit });

  if (snapshot.h1Count !== limits.h1Count) {
    add("h1-count", snapshot.h1Count, limits.h1Count);
  }
  if (
    snapshot.introDescriptionLength !== null &&
    snapshot.introDescriptionLength > limits.introDescriptionLength
  ) {
    add("intro-copy", snapshot.introDescriptionLength, limits.introDescriptionLength);
  }
  if (snapshot.statusBadgeCount > limits.statusBadgeCount) {
    add("status-badges", snapshot.statusBadgeCount, limits.statusBadgeCount);
  }
  if (snapshot.mascotCount > limits.mascotCount) {
    add("mascot-count", snapshot.mascotCount, limits.mascotCount);
  }
  if (
    snapshot.visibleCharactersBeforePrimaryAction >
    limits.visibleCharactersBeforePrimaryAction
  ) {
    add(
      "copy-before-action",
      snapshot.visibleCharactersBeforePrimaryAction,
      limits.visibleCharactersBeforePrimaryAction,
    );
  }
  if (snapshot.primaryActionCount > limits.primaryActionCount) {
    add("primary-actions", snapshot.primaryActionCount, limits.primaryActionCount);
  }
  if (snapshot.secondaryActionCount > limits.secondaryActionCount) {
    add("secondary-actions", snapshot.secondaryActionCount, limits.secondaryActionCount);
  }
  if (snapshot.warningCardCount > limits.warningCardCount) {
    add("warning-cards", snapshot.warningCardCount, limits.warningCardCount);
  }
  if (snapshot.persistentWarningPhrases.length > 0) {
    add(
      "persistent-warning-copy",
      snapshot.persistentWarningPhrases.join(" / "),
      "not present in normal state",
    );
  }
  const candidateLimit = SERVICE_FIRST_ROUTE_CANDIDATE_LIMITS[snapshot.route] ?? 0;
  if (snapshot.firstViewportCandidateChipCount > candidateLimit) {
    add(
      "candidate-chips",
      snapshot.firstViewportCandidateChipCount,
      candidateLimit,
    );
  }
  const actionLimit = firstViewportActionLimit(
    snapshot.route,
    limits,
    snapshot.firstViewportCandidateChipCount,
  );
  if (snapshot.firstViewportActionCount > actionLimit) {
    add(
      "first-viewport-actions",
      snapshot.firstViewportActionCount,
      actionLimit,
    );
  }
  if (snapshot.repeatedNoticeTexts.length > 0) {
    add("repeated-notice", snapshot.repeatedNoticeTexts.join(" / "), 0);
  }
  for (const term of findForbiddenServiceTerms(snapshot.visibleMainText)) {
    add("forbidden-term", term, "not present");
  }
  const maxAnswerActions = Math.max(0, ...snapshot.answerActionCounts);
  if (maxAnswerActions > limits.answerActionCount) {
    add("answer-actions", maxAnswerActions, limits.answerActionCount);
  }
  if (snapshot.chatbotBoxCount > limits.chatbotBoxCount) {
    add("chatbot-boxes", snapshot.chatbotBoxCount, limits.chatbotBoxCount);
  }
  if (snapshot.chatbotQuestionChipCount > limits.chatbotQuestionChipCount) {
    add(
      "chatbot-question-chips",
      snapshot.chatbotQuestionChipCount,
      limits.chatbotQuestionChipCount,
    );
  }
  if (
    snapshot.route === "/chatbot" &&
    snapshot.chatbotInitialBoxActionCount > limits.chatbotInitialActionCount
  ) {
    add(
      "chatbot-initial-actions",
      snapshot.chatbotInitialBoxActionCount,
      limits.chatbotInitialActionCount,
    );
  }
  const disclaimerLength = countDisclaimerCharacters(snapshot.textOutsideDetails);
  if (
    snapshot.route !== "/about/usage-notes" &&
    disclaimerLength > limits.disclaimerCharactersOutsideDetails
  ) {
    add(
      "disclaimer-outside-details",
      disclaimerLength,
      limits.disclaimerCharactersOutsideDetails,
    );
  }
  if (snapshot.confirmationRequiredCount > limits.confirmationRequiredCount) {
    add(
      "confirmation-required",
      snapshot.confirmationRequiredCount,
      limits.confirmationRequiredCount,
    );
  }
  return issues;
}
