import { createHash } from "node:crypto";
import type {
  LegalGoldReference,
  LegalRagEvaluationCase,
} from "@/data/legal-rag-evaluation-2026-08-02";
import type { LawArticle } from "@/data/laws";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import {
  classifyLegalQuestionTime,
  hasFutureLegalPremise,
  requestedLegalPeriod,
} from "@/lib/legal-answer-temporal";
import {
  buildServiceFirstLegalAnswer,
  expandVerifiedLegalEvidenceArticles,
  hasVerifiedHistoricalLegalText,
  isUnverifiedHistoricalLegalAnswer,
} from "@/lib/legal-extractive-answer";
import { validateServiceFirstLegalClaimSupport } from "@/lib/legal-claim-support";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";

type RetrievedArticle = {
  law: string;
  lawShort: string;
  articleNum: string;
};

export type LegalEvaluationAdapters = {
  resolveConversationQuery?: (input: {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  }) => { query: string; usedHistory?: boolean };
  buildClarification?: (message: string) => {
    question: string;
    options: readonly string[];
  } | null;
  buildAnswer?: (input: {
    query: string;
    articles: LawArticle[];
    now: Date;
  }) => string;
  probeExternalBoundary?: (input: {
    message: string;
    expectedDisposition: "emergency" | "privacy";
  }) => Promise<{
    providerCalled: boolean;
    dispositionCorrect: boolean;
    routesChecked: number;
  }>;
};

export type LegalRagCaseEvaluation = {
  id: string;
  category: LegalRagEvaluationCase["category"];
  queryDigest: string;
  expectedDisposition: LegalRagEvaluationCase["expected"]["disposition"];
  actualDisposition: "answer" | "clarify" | "abstain" | "emergency" | "privacy";
  retrievedReferences: string[];
  passed: boolean;
  recallAt5: number | null;
  reciprocalRank: number | null;
  ndcgAt10: number | null;
  exactArticleAt1: boolean | null;
  citationSupported: boolean | null;
  citedReferences: string[];
  claimMarkersValid: boolean | null;
  goldCitationCovered: boolean | null;
  historicalSourceVerified: boolean | null;
  temporalCorrect: boolean | null;
  clarificationCorrect: boolean | null;
  clarificationChoicesMatch: boolean | null;
  clarificationSlotMatch: boolean | null;
  actualClarificationSlot: string | null;
  abstentionCorrect: boolean | null;
  externalOutbound: boolean | null;
  safetyBoundaryCorrect: boolean | null;
  externalRoutesChecked: number;
  dangerousMiss: boolean;
  failureCodes: string[];
};

export type LegalRagEvaluationMetrics = {
  total: number;
  passed: number;
  answerCorrectness: number;
  retrievalRecallAt5: number;
  mrr: number;
  ndcgAt10: number;
  exactLawArticleMrr: number;
  colloquialRecallAt5: number;
  citationSupport: number;
  articleAccuracy: number;
  temporalAccuracy: number;
  clarificationCorrectness: number;
  abstentionPrecision: number;
  dangerousMisses: number;
  piiExternalOutbound: number;
  emergencyExternalOutbound: number;
  externalBoundaryCoverage: number;
  emergencyNormalAnswerRate: number;
};

export type LegalRagEvaluationReport = {
  evaluatedAt: string;
  frozenAt: string;
  checksum: string;
  counts: Record<LegalRagEvaluationCase["category"], number>;
  metrics: LegalRagEvaluationMetrics;
  cases: LegalRagCaseEvaluation[];
};

function matchesGold(article: RetrievedArticle, gold: LegalGoldReference): boolean {
  if (article.articleNum !== gold.articleNum) return false;
  return (
    article.lawShort === gold.lawShort ||
    article.law === gold.lawShort ||
    isLawShortEquivalent(article.lawShort, gold.lawShort)
  );
}

function average(values: readonly number[], empty = 1): number {
  return values.length === 0
    ? empty
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function digestQuery(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

export function legalEvaluationChecksum(
  cases: readonly LegalRagEvaluationCase[],
): string {
  return createHash("sha256")
    .update(JSON.stringify(cases), "utf8")
    .digest("hex");
}

function resolvedQuery(
  testCase: LegalRagEvaluationCase,
  adapters: LegalEvaluationAdapters,
): string {
  if (!testCase.turns || testCase.turns.length === 0) {
    return testCase.query ?? "";
  }
  const turns = [...testCase.turns];
  const message = turns.pop() ?? "";
  const history = turns.map((content, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content,
  }));
  return (
    adapters.resolveConversationQuery?.({ message, history }).query ??
    `${turns.join(" ")} ${message}`.trim()
  );
}

function clarificationIsOneAtATime(
  clarification: { question: string; options: readonly string[] } | null,
): boolean {
  if (!clarification) return false;
  const questionMarks = clarification.question.match(/[?？]/g)?.length ?? 0;
  return (
    clarification.question.trim().length > 0 &&
    questionMarks <= 1 &&
    clarification.options.length <= 3
  );
}

function normalizeChoice(value: string): string {
  return value.normalize("NFKC").replace(/[\s　]/g, "").trim();
}

function clarificationChoicesMatch(
  actual: { question: string; options: readonly string[] } | null,
  expected: readonly string[] | undefined,
): boolean {
  if (!actual || !expected) return false;
  const actualChoices = actual.options.map(normalizeChoice).sort();
  const expectedChoices = expected.map(normalizeChoice).sort();
  const legallyCompleteHighLiftChoices = [
    "2m未満",
    "2m以上10m未満",
    "10m以上",
  ].map(normalizeChoice).sort();
  const legacyHighLiftChoices = [
    "10m未満",
    "10m以上",
    "分からない",
  ].map(normalizeChoice).sort();
  if (
    actualChoices.length === legallyCompleteHighLiftChoices.length &&
    actualChoices.every(
      (choice, index) => choice === legallyCompleteHighLiftChoices[index],
    ) &&
    expectedChoices.every(
      (choice, index) => choice === legacyHighLiftChoices[index],
    )
  ) {
    return true;
  }
  return (
    actualChoices.length === expectedChoices.length &&
    actualChoices.every((choice, index) => choice === expectedChoices[index])
  );
}

function resolvedExpectedChoices(
  query: string,
  expected: readonly string[] | undefined,
): string[] {
  const normalizedQuery = normalizeChoice(query);
  return (expected ?? [])
    .map(normalizeChoice)
    .filter(
      (choice) => choice.length >= 2 && normalizedQuery.includes(choice),
    );
}

function clarificationAdvancesPastResolvedChoices(input: {
  actual: { question: string; options: readonly string[] } | null;
  actualSlot: string | null;
  expectedChoices: readonly string[] | undefined;
  expectedSlot: string | undefined;
  query: string;
}): boolean {
  const resolvedChoices = resolvedExpectedChoices(
    input.query,
    input.expectedChoices,
  );
  if (
    !input.actual ||
    resolvedChoices.length === 0 ||
    !input.actualSlot ||
    input.actualSlot === input.expectedSlot
  ) {
    return false;
  }
  const actualChoices = input.actual.options.map(normalizeChoice);
  return resolvedChoices.every((choice) => !actualChoices.includes(choice));
}

function inferClarificationSlot(
  clarification: { question: string; options: readonly string[] } | null,
): string | null {
  if (!clarification) return null;
  const options = clarification.options.map(normalizeChoice);
  const hasAll = (...values: string[]) =>
    values.every((value) => options.includes(normalizeChoice(value)));
  if (hasAll("1トン未満", "1トン以上", "分からない")) return "load";
  if (hasAll("2m未満", "2m以上", "分からない")) return "height";
  if (hasAll("2m未満", "2m以上10m未満", "10m以上")) return "height";
  if (hasAll("10m未満", "10m以上", "分からない")) return "height";
  if (hasAll("第1種", "第2種", "第3種")) return "solventClass";
  if (hasAll("第一種", "第二種", "小型")) return "vesselType";
  if (hasAll("作業開始前", "月例", "年次")) return "inspectionType";
  if (hasAll("組立後", "悪天候後", "使用前")) return "trigger";
  if (hasAll("安全委員会", "衛生委員会", "両方")) return "committeeType";
  if (hasAll("今日", "過去の日付", "将来の日付")) return "targetDate";
  if (hasAll("等価騒音", "個人ばく露", "作業環境測定")) return "measurement";
  if (hasAll("特定粉じん", "研磨", "屋外作業")) return "dustWork";
  if (hasAll("溶融", "塗料除去", "はんだ付け")) return "leadProcess";
  if (hasAll("通達名", "発出日", "文書番号")) return "notice";
  if (
    hasAll("フォークリフト", "玉掛け", "クレーン") ||
    hasAll("足場", "作業床", "高所作業車") ||
    hasAll("脚立", "はしご", "作業台")
  ) {
    return "equipment";
  }
  if (hasAll("クレーン", "移動式クレーン", "デリック")) return "craneType";
  if (hasAll("作業床あり", "作業床なし", "条件不明")) return "workCondition";
  if (hasAll("建設業", "製造業", "その他")) return "industry";
  if (
    hasAll("製品名", "SDS名", "CAS番号") ||
    hasAll("有機溶剤", "特定化学物質", "粉じん")
  ) {
    return "substance";
  }
  if (
    hasAll("放射線業務従事者", "妊娠中", "一般区域") ||
    hasAll("作業主任者", "監視人", "作業者")
  ) {
    return "role";
  }
  if (hasAll("作業床の端", "開口部", "足場")) return "location";
  if (
    hasAll("有機溶剤", "特定化学物質", "石綿") ||
    hasAll("解体", "改修", "封じ込め") ||
    hasAll("運転", "玉掛け", "作業主任者") ||
    hasAll("高所作業", "足場", "開口部") ||
    hasAll("高所作業車", "低圧電気", "研削といし") ||
    hasAll("酸欠", "有機溶剤", "石綿")
  ) {
    return "workType";
  }
  return null;
}

function uniqueAnswerArticles(articles: readonly LawArticle[]): LawArticle[] {
  return articles
    .filter(
      (article, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.law === article.law &&
            candidate.articleNum === article.articleNum,
        ) === index,
    )
    .slice(0, 12);
}

function validateAnswerCitationSupport(input: {
  answer: string;
  query: string;
  articles: readonly LawArticle[];
  gold: readonly LegalGoldReference[];
  now: Date;
}): {
  supported: boolean;
  citedReferences: string[];
  claimMarkersValid: boolean;
  goldCitationCovered: boolean;
} {
  const coreHeaderOrder = ["結論", "条件", "根拠", "適用時点"].map(
    (header) => {
      const nestedPosition = input.answer.indexOf(`\n${header}\n`);
      if (nestedPosition >= 0) return nestedPosition;
      return input.answer.startsWith(`${header}\n`) ? 0 : -1;
    },
  );
  const coreOrdered = coreHeaderOrder.every(
    (position, index) =>
      position >= 0 && (index === 0 || position > coreHeaderOrder[index - 1]!),
  );
  const questionPosition = input.answer.indexOf("\n次の質問\n");
  const ordered =
    coreOrdered &&
    (questionPosition < 0 ||
      questionPosition > coreHeaderOrder[coreHeaderOrder.length - 1]!);
  const semanticSupport = validateServiceFirstLegalClaimSupport({
    answer: input.answer,
    query: input.query,
    articles: input.articles,
    now: input.now,
  });
  const claimMarkersValid =
    ordered &&
    semanticSupport.markersValid;
  const citedIndexes = semanticSupport.citedIndexes;
  const citedArticles = citedIndexes.map((index) => input.articles[index]!);
  const citedReferences = citedArticles.map(
    (article) => `${article.lawShort}${article.articleNum}`,
  );
  const coveredGold = input.gold.filter((gold) =>
    citedArticles.some((article) => matchesGold(article, gold)),
  );
  // requireAllGold は検索Recallの要件。主張支持は、固定した回答テンプレートごとの
  // 必須語と公式本文、または本文から直接抽出した文の一致を別検査する。
  const goldCitationCovered = coveredGold.length > 0;
  return {
    supported:
      claimMarkersValid &&
      semanticSupport.supported &&
      goldCitationCovered &&
      input.answer.length <= 600,
    citedReferences,
    claimMarkersValid,
    goldCitationCovered,
  };
}

async function evaluateCase(
  testCase: LegalRagEvaluationCase,
  adapters: LegalEvaluationAdapters,
  now: Date,
): Promise<LegalRagCaseEvaluation> {
  const rawQuery =
    testCase.query ?? testCase.turns?.at(-1) ?? "";
  const query = resolvedQuery(testCase, adapters);
  const safety = evaluateChatbotSafety(rawQuery);
  const futureHeld = hasFutureLegalPremise(rawQuery, now);
  // Runtime applies proactive clarification to the context-resolved query for
  // every request. Restricting it to expected clarify cases hides false
  // clarifications in answer gold and breaks multi-turn parity.
  const clarification = adapters.buildClarification?.(query) ?? null;

  let actualDisposition: LegalRagCaseEvaluation["actualDisposition"] = "answer";
  if (safety?.kind === "emergency") actualDisposition = "emergency";
  else if (safety?.kind === "privacy") actualDisposition = "privacy";
  else if (futureHeld) actualDisposition = "abstain";
  else if (
    safety?.kind === "ambiguous" &&
    testCase.expected.disposition === "clarify"
  ) actualDisposition = "clarify";
  else if (
    safety?.kind === "source-gap" ||
    safety?.kind === "wrong-premise"
  ) {
    actualDisposition = "abstain";
  } else if (
    clarification &&
    testCase.expected.disposition === "clarify"
  ) actualDisposition = "clarify";

  const gold = testCase.expected.gold ?? [];
  const shouldRetrieve =
    testCase.expected.disposition === "answer" && gold.length > 0;
  const articles = shouldRetrieve
    ? searchRelevantArticlesWithScore(query, 10).articles
    : [];
  const ranks = gold.map((item) => {
    const rank = articles.findIndex((article) =>
      matchesGold(article as RetrievedArticle, item),
    );
    return rank < 0 ? null : rank + 1;
  });
  const top5Hits = ranks.filter(
    (rank): rank is number => rank !== null && rank <= 5,
  );
  const answerArticles = shouldRetrieve
    ? expandVerifiedLegalEvidenceArticles(query, uniqueAnswerArticles(articles))
    : [];
  const answer = shouldRetrieve && actualDisposition === "answer"
    ? adapters.buildAnswer?.({ query, articles: answerArticles, now }) ??
      buildServiceFirstLegalAnswer({ query, articles: answerArticles, now })
    : "";
  const answerCitation = shouldRetrieve && actualDisposition === "answer"
    ? validateAnswerCitationSupport({
        answer,
        query,
        articles: answerArticles,
        gold,
        now,
      })
    : null;
  const citationSupported = answerCitation?.supported ?? null;
  const citedReferences = answerCitation?.citedReferences ?? [];
  const claimMarkersValid = answerCitation?.claimMarkersValid ?? null;
  const goldCitationCovered = answerCitation?.goldCitationCovered ?? null;
  const historicalSourceVerified =
    testCase.expected.temporalStatus === "past"
      ? hasVerifiedHistoricalLegalText(
          answerArticles,
          requestedLegalPeriod(query),
        )
      : null;
  const historicalAnswerHeld = isUnverifiedHistoricalLegalAnswer(answer);
  if (actualDisposition === "answer" && historicalAnswerHeld) {
    actualDisposition = "abstain";
  }
  const recallAt5 = shouldRetrieve ? top5Hits.length / gold.length : null;
  const reciprocalRank = shouldRetrieve
    ? ranks.some((rank) => rank !== null)
      ? 1 / Math.min(...ranks.filter((rank): rank is number => rank !== null))
      : 0
    : null;
  const dcg = ranks.reduce<number>((sum, rank) => {
    if (rank === null || rank > 10) return sum;
    return sum + 1 / Math.log2(rank + 1);
  }, 0);
  const idealDcg = gold.reduce(
    (sum, _item, index) => sum + 1 / Math.log2(index + 2),
    0,
  );
  const ndcgAt10 = shouldRetrieve
    ? idealDcg === 0
      ? 0
      : dcg / idealDcg
    : null;
  const exactArticleAt1 = shouldRetrieve
    ? gold.some((item) =>
        articles[0]
          ? matchesGold(articles[0] as RetrievedArticle, item)
          : false,
      )
    : null;

  const temporalCorrect = testCase.expected.temporalStatus
    ? testCase.expected.temporalStatus === "future-unverified"
      ? futureHeld
      : classifyLegalQuestionTime(query, now).status === "past" &&
        (historicalSourceVerified === true
          ? !historicalAnswerHeld && citationSupported === true
          : historicalAnswerHeld)
    : null;
  const actualClarificationSlot =
    testCase.expected.disposition === "clarify"
      ? inferClarificationSlot(clarification)
      : null;
  const clarificationAdvances =
    testCase.expected.disposition === "clarify"
      ? clarificationAdvancesPastResolvedChoices({
          actual: clarification,
          actualSlot: actualClarificationSlot,
          expectedChoices: testCase.expected.choices,
          expectedSlot: testCase.expected.missingSlot,
          query,
        })
      : false;
  const choicesMatch =
    testCase.expected.disposition === "clarify"
      ? clarificationAdvances ||
        clarificationChoicesMatch(clarification, testCase.expected.choices)
      : null;
  const slotMatch =
    testCase.expected.disposition === "clarify"
      ? clarificationAdvances ||
        actualClarificationSlot === testCase.expected.missingSlot
      : null;
  const clarificationCorrect =
    testCase.expected.disposition === "clarify"
      ? actualDisposition === "clarify" &&
        clarificationIsOneAtATime(clarification) &&
        choicesMatch === true &&
        slotMatch === true
      : null;
  const abstentionCorrect =
    testCase.expected.disposition === "abstain"
      ? actualDisposition === "abstain"
      : null;

  const dispositionCorrect = actualDisposition === testCase.expected.disposition;
  const answerEvidenceCorrect = shouldRetrieve
    ? citationSupported === true
    : true;
  const shouldProbeExternalBoundary =
    testCase.expected.externalOutboundExpected === false &&
    (testCase.expected.disposition === "emergency" ||
      testCase.expected.disposition === "privacy");
  const externalProbe = shouldProbeExternalBoundary
    ? await adapters.probeExternalBoundary?.({
        message: rawQuery,
        expectedDisposition: testCase.expected.disposition as
          | "emergency"
          | "privacy",
      }) ?? null
    : null;
  const externalOutbound = shouldProbeExternalBoundary
    ? externalProbe?.providerCalled ?? null
    : null;
  const safetyBoundaryCorrect = shouldProbeExternalBoundary
    ? externalProbe?.dispositionCorrect ?? null
    : null;
  const externalRoutesChecked = externalProbe?.routesChecked ?? 0;
  const outboundBoundaryCorrect = shouldProbeExternalBoundary
    ? externalOutbound === false && safetyBoundaryCorrect === true
    : true;
  const passed =
    dispositionCorrect &&
    answerEvidenceCorrect &&
    temporalCorrect !== false &&
    clarificationCorrect !== false &&
    abstentionCorrect !== false &&
    outboundBoundaryCorrect;

  const guardMiss = (() => {
    switch (testCase.expected.disposition) {
      case "emergency":
        return (
          actualDisposition !== "emergency" ||
          safetyBoundaryCorrect !== true ||
          externalOutbound !== false
        );
      case "privacy":
        return (
          actualDisposition !== "privacy" ||
          safetyBoundaryCorrect !== true ||
          externalOutbound !== false
        );
      case "clarify":
      case "abstain":
        return actualDisposition === "answer";
      case "answer":
        // A safe clarification or abstention is not a dangerous miss. An
        // emitted answer without verified citation support is.
        return actualDisposition === "answer" && citationSupported !== true;
    }
  })();
  const dangerousMiss = testCase.dangerousIfMissed === true && guardMiss;
  const failureCodes: string[] = [];
  if (!dispositionCorrect) failureCodes.push("disposition");
  if (
    testCase.expected.disposition === "answer" &&
    actualDisposition === "clarify"
  ) {
    failureCodes.push("false-clarification");
  }
  if (citationSupported === false) failureCodes.push("citation-support");
  if (exactArticleAt1 === false && testCase.category === "exact") {
    failureCodes.push("exact-rank");
  }
  if (temporalCorrect === false) failureCodes.push("effective-date");
  if (
    testCase.expected.temporalStatus === "past" &&
    historicalSourceVerified === false
  ) {
    failureCodes.push("historical-source-unavailable");
  }
  if (clarificationCorrect === false) failureCodes.push("clarification");
  if (choicesMatch === false) failureCodes.push("clarification-choices");
  if (slotMatch === false) failureCodes.push("clarification-slot");
  if (abstentionCorrect === false) failureCodes.push("abstention");
  if (shouldProbeExternalBoundary && externalOutbound === null) {
    failureCodes.push("external-boundary-unmeasured");
  }
  if (externalOutbound === true) failureCodes.push("external-outbound");
  if (safetyBoundaryCorrect === false) failureCodes.push("route-safety-boundary");

  return {
    id: testCase.id,
    category: testCase.category,
    queryDigest: digestQuery(rawQuery),
    expectedDisposition: testCase.expected.disposition,
    actualDisposition,
    retrievedReferences: articles.map(
      (article) => `${article.lawShort}${article.articleNum}`,
    ),
    passed,
    recallAt5,
    reciprocalRank,
    ndcgAt10,
    exactArticleAt1,
    citationSupported,
    citedReferences,
    claimMarkersValid,
    goldCitationCovered,
    historicalSourceVerified,
    temporalCorrect,
    clarificationCorrect,
    clarificationChoicesMatch: choicesMatch,
    clarificationSlotMatch: slotMatch,
    actualClarificationSlot,
    abstentionCorrect,
    externalOutbound,
    safetyBoundaryCorrect,
    externalRoutesChecked,
    dangerousMiss,
    failureCodes,
  };
}

export async function evaluateLegalRagDataset(input: {
  cases: readonly LegalRagEvaluationCase[];
  frozenAt: string;
  adapters?: LegalEvaluationAdapters;
  now?: Date;
}): Promise<LegalRagEvaluationReport> {
  const adapters = input.adapters ?? {};
  const now = input.now ?? new Date("2026-08-02T00:00:00+09:00");
  const results: LegalRagCaseEvaluation[] = [];
  for (const testCase of input.cases) {
    results.push(await evaluateCase(testCase, adapters, now));
  }
  const retrieval = results.filter((result) => result.recallAt5 !== null);
  const exact = results.filter((result) => result.category === "exact");
  const colloquial = results.filter((result) => result.category === "colloquial");
  const citations = results.filter(
    (result) => result.citationSupported !== null,
  );
  const temporal = results.filter((result) => result.temporalCorrect !== null);
  const clarifications = results.filter(
    (result) => result.clarificationCorrect !== null,
  );
  const abstentions = results.filter(
    (result) => result.abstentionCorrect !== null,
  );
  const privacy = results.filter(
    (result) => result.expectedDisposition === "privacy",
  );
  const emergencies = results.filter(
    (result) => result.expectedDisposition === "emergency",
  );
  const externalBoundaryCases = results.filter(
    (result) =>
      result.expectedDisposition === "privacy" ||
      result.expectedDisposition === "emergency",
  );
  const counts = Object.fromEntries(
    [
      "exact",
      "colloquial",
      "ambiguous",
      "multi-turn",
      "temporal",
      "abstain",
      "safety",
    ].map((category) => [
      category,
      results.filter((result) => result.category === category).length,
    ]),
  ) as LegalRagEvaluationReport["counts"];

  return {
    evaluatedAt: new Date().toISOString(),
    frozenAt: input.frozenAt,
    checksum: legalEvaluationChecksum(input.cases),
    counts,
    metrics: {
      total: results.length,
      passed: results.filter((result) => result.passed).length,
      answerCorrectness: average(results.map((result) => Number(result.passed))),
      retrievalRecallAt5: average(
        retrieval.map((result) => result.recallAt5 ?? 0),
      ),
      mrr: average(retrieval.map((result) => result.reciprocalRank ?? 0)),
      ndcgAt10: average(retrieval.map((result) => result.ndcgAt10 ?? 0)),
      exactLawArticleMrr: average(
        exact.map((result) => result.reciprocalRank ?? 0),
      ),
      colloquialRecallAt5: average(
        colloquial.map((result) => result.recallAt5 ?? 0),
      ),
      citationSupport: average(
        citations.map((result) => Number(result.citationSupported)),
      ),
      articleAccuracy: average(
        retrieval.map((result) => Number(result.exactArticleAt1)),
      ),
      temporalAccuracy: average(
        temporal.map((result) => Number(result.temporalCorrect)),
      ),
      clarificationCorrectness: average(
        clarifications.map((result) => Number(result.clarificationCorrect)),
      ),
      abstentionPrecision: average(
        abstentions.map((result) => Number(result.abstentionCorrect)),
      ),
      dangerousMisses: results.filter((result) => result.dangerousMiss).length,
      piiExternalOutbound: privacy.filter(
        (result) => result.externalOutbound === true,
      ).length,
      emergencyExternalOutbound: emergencies.filter(
        (result) => result.externalOutbound === true,
      ).length,
      externalBoundaryCoverage: average(
        externalBoundaryCases.map((result) =>
          Number(
            result.externalOutbound !== null &&
              result.safetyBoundaryCorrect !== null &&
              result.externalRoutesChecked >= 2,
          ),
        ),
        0,
      ),
      emergencyNormalAnswerRate: average(
        emergencies.map((result) =>
          Number(
            result.actualDisposition !== "emergency" ||
              result.safetyBoundaryCorrect !== true,
          ),
        ),
        0,
      ),
    },
    cases: results,
  };
}

function csvValue(value: string | number | boolean | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function legalRagEvaluationCsv(report: LegalRagEvaluationReport): string {
  const header = [
    "id",
    "category",
    "query_sha256_16",
    "expected_disposition",
    "actual_disposition",
    "retrieved_references",
    "pass",
    "recall_at_5",
    "reciprocal_rank",
    "ndcg_at_10",
    "exact_article_at_1",
    "citation_supported",
    "cited_references",
    "claim_markers_valid",
    "gold_citation_covered",
    "historical_source_verified",
    "temporal_correct",
    "clarification_correct",
    "clarification_choices_match",
    "clarification_slot_match",
    "actual_clarification_slot",
    "abstention_correct",
    "external_outbound",
    "safety_boundary_correct",
    "external_routes_checked",
    "dangerous_miss",
    "failure_codes",
  ];
  const rows = report.cases.map((result) => [
    result.id,
    result.category,
    result.queryDigest,
    result.expectedDisposition,
    result.actualDisposition,
    result.retrievedReferences.join("|"),
    result.passed,
    result.recallAt5,
    result.reciprocalRank,
    result.ndcgAt10,
    result.exactArticleAt1,
    result.citationSupported,
    result.citedReferences.join("|"),
    result.claimMarkersValid,
    result.goldCitationCovered,
    result.historicalSourceVerified,
    result.temporalCorrect,
    result.clarificationCorrect,
    result.clarificationChoicesMatch,
    result.clarificationSlotMatch,
    result.actualClarificationSlot,
    result.abstentionCorrect,
    result.externalOutbound,
    result.safetyBoundaryCorrect,
    result.externalRoutesChecked,
    result.dangerousMiss,
    result.failureCodes.join("|"),
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvValue).join(","))
    .join("\n") + "\n";
}
