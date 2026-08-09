import {
  ELECTRIC_CHATBOT_HOLDOUT_2026_08_09,
  type ElectricChatbotHoldoutCase,
  type ElectricHoldoutConcept,
} from "@/data/electric-chatbot-holdout-2026-08-09";
import { buildStructuredCitations } from "@/lib/chatbot-enrichment";
import { NO_HIT_NOISE_FLOOR } from "@/lib/chatbot-no-hit-response";
import {
  finalizeChatbotResponse,
  isPureClarificationResponse,
  legalAnswerAssumptions,
  type ChatbotResponse,
  type ChatbotSource,
} from "@/lib/chatbot-contract";
import { lawArticleToSource } from "@/lib/chatbot-route-shared";
import {
  nextLegalClarification,
  resolveLegalConversationQuery,
  type LegalConversationContext,
} from "@/lib/legal-conversation-context";
import {
  PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS,
  rehydratePublicLegalConversationContext,
  type PublicLegalConversationContext,
} from "@/lib/legal-conversation-public-context";
import { ensureLegalAnswerAsOf } from "@/lib/legal-answer-temporal";
import {
  buildServiceFirstLegalAnswer,
  buildServiceFirstNoHitAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
} from "@/lib/legal-extractive-answer";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

const HOLDOUT_NOW = new Date("2026-08-09T03:00:00.000Z");
const HOLDOUT_AS_OF = "2026-08-09";

const READ_ONLY_ELECTRICAL_CONTEXT_FIXTURE = Object.freeze({
  topicDomain: "electrical" as const,
  equipment: "電気設備",
});

// These frozen prompts intentionally omit every electrical-domain signal.
// Treating them as classifier cases would reward an unrelated-domain jump
// (for example, making every bare 作業主任者 question electrical). They are
// retained as context-dependent answer-quality fixtures without changing the
// holdout array or checksum; all other first turns exercise the real classifier.
export const ELECTRIC_CONTEXT_DEPENDENT_HOLDOUT_FIXTURES = Object.freeze({
  "EL-020": "異音・異臭だけでは対象設備を特定できない",
  "EL-031": "作業主任者だけでは対象作業を特定できない",
  "EL-038": "始業前点検だけでは対象設備を特定できない",
  "EL-070": "海外規格の設備だけでは電気設備と特定できない",
  "EL-072": "作業未定だけでは対象設備を特定できない",
} satisfies Readonly<Record<string, string>>);

export function electricHoldoutInitialContext(
  testCase: ElectricChatbotHoldoutCase,
): LegalConversationContext | undefined {
  return testCase.id in ELECTRIC_CONTEXT_DEPENDENT_HOLDOUT_FIXTURES
    ? { ...READ_ONLY_ELECTRICAL_CONTEXT_FIXTURE }
    : undefined;
}

const ALLOWED_CONTEXT_KEYS = new Set<keyof PublicLegalConversationContext>(
  PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS,
);

export const ELECTRIC_HOLDOUT_SAFETY_CORRECTIONS = Object.freeze({
  "EL-047": Object.freeze({
    frozenExpectedAction: "visual-inspection",
    enforcedExpectedAction: "unknown",
    reason:
      "『配線は触らない』は行為の否定条件であり、盤外目視を選んだという肯定情報ではないため",
  }),
} as const);

const OFFICIAL_SOURCE_HOSTS = [
  "laws.e-gov.go.jp",
  "mhlw.go.jp",
  "www.mhlw.go.jp",
  "meti.go.jp",
  "www.meti.go.jp",
] as const;

const GENERIC_ONLY =
  /^(?:必要な資格(?:・教育)?は作業で変わります|条件によって(?:異なります|変わります)|どの(?:作業|点検|検査).*(?:ですか|確認しますか))[。？?]?$/;

type ConceptRule = {
  description: string;
  test: (text: string, response: ChatbotResponse) => boolean;
};

function normalizedText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/［\d+］/g, "")
    .replace(/[\s　]+/g, " ")
    .trim();
}

function includesEvery(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(value));
}

function includesAtLeast(
  value: string,
  minimum: number,
  patterns: readonly RegExp[],
): boolean {
  return patterns.filter((pattern) => pattern.test(value)).length >= minimum;
}

function isSubstantiveDirectAnswer(response: ChatbotResponse): boolean {
  const direct = normalizedText(response.directAnswer);
  if (direct.length < 24 || GENERIC_ONLY.test(direct)) return false;
  if (direct === response.clarificationQuestion?.trim()) return false;
  return (
    /(?:です|ます|ません|必要|対象|制度|資格|教育|作業|点検|電路|設備)/.test(
      direct,
    ) &&
    /(?:電気|電路|電圧|低圧|高圧|特別高圧|特高|盤|配線|結線|ブレーカー|開閉器|テスター|作業主任者|作業の指揮者|主任技術者|始業前|作業開始前)/.test(
      direct,
    )
  );
}

const CONCEPT_RULES: Record<ElectricHoldoutConcept, ConceptRule> = {
  "answer-first": {
    description: "空でない電気分野の判断材料を、確認質問より前に示す",
    test: (_text, response) =>
      isSubstantiveDirectAnswer(response) &&
      !isPureClarificationResponse(response),
  },
  "visual-may-not-require-uniform-license": {
    description: "非接触の目視等は一律の国家資格が必要とは限らない",
    test: (text) =>
      includesEvery(text, [
        /(?:盤外|外側|外観|目視|見るだけ|表示|異音|異臭|非接触)/,
        /(?:一律|その確認だけ|点検だけ)/,
        /(?:国家資格|資格)/,
        /(?:必要とは限りません|必要とは限らない|一律.*必要.*ない)/,
      ]),
  },
  "action-determines-requirement": {
    description: "点検という名称ではなく実際の行為が要件を変える",
    test: (text) =>
      /(?:点検中の行為|実際の作業|作業内容|何をする|行為).*(?:条件|要件|結論|資格|教育).*(?:変わ|決ま|確認)/.test(
        text,
      ) ||
      includesAtLeast(text, 3, [
        /(?:見るだけ|目視|外観)/,
        /(?:盤を開け|盤内)/,
        /(?:測定器|テスター|測定)/,
        /(?:配線|結線|接続)/,
        /(?:充電部|活線|近接)/,
      ]),
  },
  "electrician-separate-from-special-education": {
    description: "電気工事士免状と電気取扱業務の特別教育を別制度として区別する",
    test: (text) =>
      includesEvery(text, [
        /電気工事士/,
        /特別教育/,
        /(?:別制度|別の制度|とは別|別に|それぞれ|双方)/,
      ]),
  },
  "chief-engineer-is-facility-governance": {
    description: "電気主任技術者を設備の保安監督と位置付け、作業資格と混同しない",
    test: (text) =>
      includesEvery(text, [
        /電気主任技術者|主任技術者/,
        /(?:保安監督|保安を監督|工事・維持・運用)/,
        /(?:代わりでは|置き換え|代替され|誰でも.*わけでは)/,
      ]),
  },
  "low-voltage-special-education-scope": {
    description: "低圧特別教育の限定された法定対象を具体化する",
    test: (text) =>
      includesEvery(text, [/低圧/, /特別教育/]) &&
      (includesEvery(text, [
        /充電電路/,
        /(?:敷設|修理)/,
        /(?:露出|開閉器|区画)/,
        /操作/,
      ]) ||
        includesEvery(text, [
          /(?:露出|充電部分)/,
          /開閉器|ブレーカー/,
          /(?:区画|配電盤室|変電室)/,
          /操作/,
        ])),
  },
  "high-voltage-special-education-scope": {
    description: "高圧・特別高圧の点検等が特別教育対象であることを具体化する",
    test: (text) =>
      includesEvery(text, [
        /高圧/,
        /特別高圧|特高/,
        /特別教育/,
        /充電電路/,
        /点検/,
        /(?:敷設|修理|操作)/,
        /対象/,
      ]),
  },
  "voltage-and-energized-state-matter": {
    description: "電圧区分と充電・停電・近接状態が結論を変える",
    test: (text) =>
      includesEvery(text, [
        /(?:100・200V|100V|200V|低圧|高圧|特別高圧|電圧)/,
        /(?:充電中|充電部|停電済み|停電|活線|近接|近く|露出部)/,
        /(?:変わ|分かれ|応じ|確認|異な|対象|一律)/,
      ]),
  },
  "measurement-near-live-parts": {
    description: "盤内測定を目視と区別し、充電部への直接取扱い・近接を扱う",
    test: (text) =>
      includesEvery(text, [
        /(?:テスター|測定器|測定|絶縁抵抗)/,
        /(?:充電部|充電電路|充電中|活線|近接)/,
        /(?:直接取り扱|接触するおそれ|近接)/,
        /(?:絶縁用保護具|活線作業用器具|絶縁用防具|感電防止)/,
      ]),
  },
  "wiring-may-be-electrical-work": {
    description: "配線の接続・取外しを電気工事に該当し得る行為として扱う",
    test: (text) =>
      includesEvery(text, [
        /(?:配線|結線|電線|コンセント|端子|設備の設置・変更)/,
        /電気工事/,
        /(?:当たり|当たる|可能性|資格者|電気工事士)/,
      ]),
  },
  "breaker-operation-conditions": {
    description: "閉鎖型・露出型、低圧・高圧を分けて開閉器操作を説明する",
    test: (text) =>
      includesEvery(text, [
        /(?:ブレーカー|開閉器)/,
        /(?:閉鎖型|露出|配電盤室|変電室)/,
        /(?:低圧|100・200V|高圧|特別高圧)/,
        /(?:操作|入切)/,
      ]),
  },
  "start-check-is-not-a-qualification": {
    description: "作業開始前・始業前点検を資格名でなく手順・時点と説明する",
    test: (text) =>
      includesEvery(text, [
        /(?:作業開始前点検|始業前点検|作業開始前|始業前)/,
        /資格名ではなく/,
        /(?:手順|時点|状態を確認)/,
      ]),
  },
  "no-universal-electrical-work-supervisor": {
    description: "電気作業全般に一律の作業主任者制度があると誤認させない",
    test: (text) =>
      /電気作業(?:全般|すべて|全て).*(?:一律).*(?:作業主任者).*(?:ありません|ない|ではありません)/.test(
        text,
      ) ||
      /作業主任者.*指定された作業.*電気.*一律.*(?:ではありません|ない)/.test(
        text,
      ) ||
      /電気作業(?:全般|すべて|全て).*(?:一律).*(?:作業指揮者|作業の指揮者).*(?:規定ではありません|ない)/.test(
        text,
      ),
  },
  "work-leader-is-distinct": {
    description: "作業主任者と安衛則350条の作業の指揮者を区別する",
    test: (text) =>
      includesEvery(text, [
        /(?:作業の指揮者|作業指揮者)/,
        /350条/,
        /(?:別制度|一律.*では|列挙|対象作業)/,
      ]),
  },
  "de-energized-procedure-matters": {
    description: "停電済みでも施錠・表示・放電・検電等の停電作業措置を示す",
    test: (text) =>
      /停電/.test(text) &&
      includesAtLeast(text, 2, [/施錠/, /表示/, /残留電荷|放電/, /検電/]),
  },
  "official-source-gap-is-explicit": {
    description: "公式資料で確定できないメーカー・海外規格等の不足範囲を明示する",
    test: (text) =>
      includesEvery(text, [
        /(?:公式資料|公式本文|メーカー|仕様書|海外規格|作業内容)/,
        /(?:確認できない|特定できない|確定できない|収録.*範囲外|法令だけでは)/,
      ]),
  },
};

const SPECIAL_EDUCATION_SCOPE_CONCEPTS = new Set<ElectricHoldoutConcept>([
  "low-voltage-special-education-scope",
  "high-voltage-special-education-scope",
]);

const SPECIAL_EDUCATION_NEGATION =
  /特別教育(?:の|が)?(?:法定)?対象(?:では|に)?(?:ありません|ない|ならない)|特別教育(?:は|が)?(?:不要|必要(?:は|が)?ない)|特別教育を受ける必要(?:は|が)?ない/;
const QUALIFIED_SCOPE_NEGATION =
  /(?:見るだけ|目視だけ|盤外|外側|非接触|充電部(?:に|へ).{0,8}近づか|停電済み|無電圧|一律|必ずしも|それだけ)/;

/**
 * Required-concept token matching must not accept a response that first states
 * the correct scope and then negates it. Keep legitimate, qualified negatives
 * (for example, non-contact visual inspection alone) while rejecting a
 * categorical denial of the statutory low/high-voltage scope.
 */
function contradictsRequiredLegalScope(
  concept: ElectricHoldoutConcept,
  text: string,
): boolean {
  if (!SPECIAL_EDUCATION_SCOPE_CONCEPTS.has(concept)) return false;

  return text.split(/[。！？\n]/).some((rawSentence) => {
    const sentence = rawSentence.trim();
    if (!SPECIAL_EDUCATION_NEGATION.test(sentence)) return false;

    const hasLow = /低圧/.test(sentence);
    const hasHigh = /高圧|特別高圧|特高/.test(sentence);
    const categoricalAcrossVoltageClasses =
      hasLow &&
      hasHigh &&
      /(?:いずれも|どちらも|すべて|全て|全部|一切)/.test(sentence);
    if (categoricalAcrossVoltageClasses) return true;

    // A qualified negative such as "盤外から見るだけなら対象ではない" is
    // not a contradiction of the defined work scope.
    if (QUALIFIED_SCOPE_NEGATION.test(sentence)) return false;

    if (concept === "low-voltage-special-education-scope") {
      const deniesLowVoltageWiringScope =
        hasLow &&
        /充電電路/.test(sentence) &&
        /(?:敷設|修理)/.test(sentence);
      const deniesLowVoltageSwitchingScope =
        hasLow &&
        /(?:露出|充電部分|充電部)/.test(sentence) &&
        /(?:開閉器|ブレーカー)/.test(sentence) &&
        /操作/.test(sentence) &&
        /(?:区画|配電盤室|変電室)/.test(sentence);
      return deniesLowVoltageWiringScope || deniesLowVoltageSwitchingScope;
    }

    return (
      hasHigh &&
      /(?:充電電路|充電部)/.test(sentence) &&
      /(?:敷設|点検|修理|操作)/.test(sentence)
    );
  });
}

export type ElectricHoldoutTurnResult = {
  message: string;
  retrievalQuery: string;
  usedStructuredContext: boolean;
  response: ChatbotResponse;
};

export type ElectricHoldoutCaseResult = {
  id: string;
  category: ElectricChatbotHoldoutCase["category"];
  initialContextMode: "empty-classifier" | "electrical-context-fixture";
  contextFixtureReason?: string;
  fixtureSafetyCorrection?: (typeof ELECTRIC_HOLDOUT_SAFETY_CORRECTIONS)[keyof typeof ELECTRIC_HOLDOUT_SAFETY_CORRECTIONS];
  passed: boolean;
  failures: string[];
  finalContext: LegalConversationContext;
  turns: ElectricHoldoutTurnResult[];
  checks: {
    concepts: Record<ElectricHoldoutConcept, boolean>;
    requiredAuthorities: Record<string, boolean>;
    legalPolarityConsistent: boolean;
    answerFirst: boolean;
    substantive: boolean;
    pureClarification: boolean;
    initialClassification: boolean;
    contextRetention: boolean;
    quickRepliesRelevant: boolean;
    knownConditionsNotReasked: boolean;
    lowVoltageDistanceNotMisstated: boolean;
    noInventedAction: boolean;
    negativeConstraintRetained: boolean;
    unrelatedDomainJump: boolean;
    citationSupport: boolean;
    effectiveDateCurrent: boolean;
  };
};

export type ElectricHoldoutMetrics = {
  totalCases: number;
  passedCases: number;
  totalTurns: number;
  firstTurnUsefulAnswerRate: number;
  answerFirstRate: number;
  substantiveAnswerRate: number;
  pureClarificationRate: number;
  contextRetentionRate: number;
  irrelevantQuickReplyRate: number;
  unrelatedDomainJumpCount: number;
  citationSupportRate: number;
  effectiveDateCurrentRate: number;
  classificationEligibleTotal: number;
  classificationEligiblePassed: number;
  classificationEligibleRate: number;
  contextFixtureCount: number;
  safetyCorrectedFixtureCount: number;
};

export type ElectricHoldoutEvaluation = {
  basisDate: typeof HOLDOUT_AS_OF;
  fixtureContext: "classifier-first-with-explicit-context-fixtures";
  results: ElectricHoldoutCaseResult[];
  metrics: ElectricHoldoutMetrics;
};

function buildTurn(
  message: string,
  previousContext: LegalConversationContext,
): ElectricHoldoutTurnResult {
  const resolved = resolveLegalConversationQuery({
    message,
    context: previousContext,
  });
  const ranked = searchRelevantArticlesWithScore(resolved.query, 10, "all");
  const articles = expandVerifiedLegalEvidenceArticles(
    resolved.query,
    ranked.normalizedScore >= NO_HIT_NOISE_FLOOR ? ranked.articles : [],
  );
  const initialAnswer =
    articles.length > 0
      ? buildServiceFirstLegalAnswer({
          query: resolved.query,
          articles,
          now: HOLDOUT_NOW,
        })
      : buildServiceFirstNoHitAnswer(resolved.query, HOLDOUT_NOW);
  const citedArticles = citedLegalAnswerArticles(initialAnswer, articles);
  const answerTemplate =
    citedArticles.length > 0
      ? buildServiceFirstLegalAnswer({
          query: resolved.query,
          articles: citedArticles,
          now: HOLDOUT_NOW,
        })
      : initialAnswer;
  const clarification = nextLegalClarification(
    resolved.query,
    resolved.answeredClarification,
  );
  const answer = ensureLegalAnswerAsOf(answerTemplate, HOLDOUT_NOW);
  const sources = citedArticles.map((article) =>
    lawArticleToSource(article, resolved.query, HOLDOUT_NOW),
  );
  const response = finalizeChatbotResponse({
    requiresHumanReview: true,
    answer,
    sources,
    source_type: sources.length > 0 ? "rag" : "safety",
    confidence: sources.length > 0 ? "medium" : "low",
    citations: buildStructuredCitations(citedArticles),
    assumptions: legalAnswerAssumptions(resolved.query),
    context: resolved.context,
    ...(clarification ? { clarification } : {}),
  });

  return {
    message,
    retrievalQuery: resolved.query,
    usedStructuredContext: resolved.usedHistory,
    response,
  };
}

function responseEvaluationText(response: ChatbotResponse): string {
  return normalizedText(
    [
      response.directAnswer,
      ...response.importantConditions,
      ...response.assumptions,
    ].join("\n"),
  );
}

function expectedActionValue(
  context: LegalConversationContext,
): string {
  return context.workAction ?? "unknown";
}

function expectedVoltageValue(
  context: LegalConversationContext,
): string {
  if (context.voltageClass === "低圧") return "low";
  if (context.voltageClass === "高圧") return "high";
  if (context.voltageClass === "特別高圧") return "extra-high";
  return "unknown";
}

function expectedEnergizedValue(
  context: LegalConversationContext,
): string {
  return context.energizedState ?? "unknown";
}

function normalizedAuthorityLaw(value: string): string {
  const aliases: Record<string, string> = {
    労働安全衛生法: "安衛法",
    労働安全衛生法施行令: "安衛令",
    労働安全衛生規則: "安衛則",
    電気事業法: "電事法",
  };
  return aliases[value] ?? value;
}

function authorityParts(authority: string): {
  lawShort: string;
  articleNum: string;
} | null {
  const match = authority.match(/^(.+?)(第\d+条(?:の\d+)?)$/);
  if (!match) return null;
  return {
    lawShort: normalizedAuthorityLaw(match[1]!),
    articleNum: match[2]!,
  };
}

function hasRequiredAuthority(
  response: ChatbotResponse,
  authority: string,
): boolean {
  const parts = authorityParts(authority);
  if (!parts) return false;
  return response.citations.some(
    (citation) =>
      normalizedAuthorityLaw(citation.lawShort) === parts.lawShort &&
      citation.articleNum === parts.articleNum,
  );
}

function isOfficialSourceUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return OFFICIAL_SOURCE_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

function sourceArticleNum(source: ChatbotSource): string {
  return (
    source.article.match(/^第\d+条(?:の\d+)?/)?.[0] ??
    source.article.split("「", 1)[0]!
  );
}

function sourceIdentity(source: ChatbotSource): string {
  return `${normalizedAuthorityLaw(source.lawShort ?? source.law)}|${sourceArticleNum(source)}`;
}

function sourceEvidenceText(source: ChatbotSource): string {
  return normalizedText(source.snippet?.trim() || source.text);
}

function locatorContains(locator: string | undefined, label: string): boolean {
  return locator?.split("・").includes(label) ?? false;
}

function sourceMatches(
  source: ChatbotSource,
  lawShort: string,
  articleNum: string,
): boolean {
  return (
    normalizedAuthorityLaw(source.lawShort ?? source.law) === lawShort &&
    sourceArticleNum(source) === articleNum
  );
}

function sourceHasEvidence(
  source: ChatbotSource,
  patterns: readonly RegExp[],
): boolean {
  return includesEvery(sourceEvidenceText(source), patterns);
}

function sourceSupportsElectricalWorkDefinition(source: ChatbotSource): boolean {
  return (
    sourceMatches(source, "電気工事士法", "第2条") &&
    locatorContains(source.paragraph, "第3項") &&
    sourceHasEvidence(source, [
      /第3項/,
      /電気工事/,
      /設置/,
      /変更/,
      /軽微な工事を除く/,
    ])
  );
}

function sourceSupportsElectricianRestriction(source: ChatbotSource): boolean {
  return (
    sourceMatches(source, "電気工事士法", "第3条") &&
    ["第1項", "第2項", "第3項", "第4項"].every((label) =>
      locatorContains(source.paragraph, label),
    ) &&
    sourceHasEvidence(source, [
      /第1項.*第一種電気工事士免状/,
      /第2項.*第二種電気工事士免状/,
      /第3項.*特種電気工事資格者認定証/,
      /第4項.*認定電気工事従事者認定証/,
    ])
  );
}

function sourceSupportsSpecialEducationDuty(source: ChatbotSource): boolean {
  return (
    sourceMatches(source, "安衛法", "第59条") &&
    locatorContains(source.paragraph, "第3項") &&
    sourceHasEvidence(source, [
      /危険又は有害な業務/,
      /労働者を(?:就|つ)かせるとき/,
      /特別の教育を行(?:な)?わなければならない/,
    ])
  );
}

function sourceSupportsElectricalSpecialEducationScope(
  source: ChatbotSource,
): boolean {
  return (
    sourceMatches(source, "安衛則", "第36条") &&
    locatorContains(source.item, "第4号") &&
    sourceHasEvidence(source, [
      /第4号/,
      /高圧.*特別高圧.*充電電路.*敷設.*点検.*修理.*操作/,
      /低圧.*充電電路.*敷設.*修理/,
      /充電部分が露出している開閉器の操作/,
    ])
  );
}

function sourceSupportsElectricalEducationHours(
  source: ChatbotSource,
  voltage: "high" | "low",
): boolean {
  const articleNum = voltage === "high" ? "第5条" : "第6条";
  const timePatterns =
    voltage === "high"
      ? [/11時間以上/, /実技15時間以上/, /操作の業務のみは1時間以上/]
      : [/7時間以上/, /実技7時間以上/, /開閉器操作のみは1時間以上/];
  return (
    sourceMatches(source, "特別教育規程", articleNum) &&
    ["第1項", "第2項", "第3項"].every((label) =>
      locatorContains(source.paragraph, label),
    ) &&
    sourceHasEvidence(source, timePatterns)
  );
}

function sourceSupportsArticleFirstParagraph(
  source: ChatbotSource,
  articleNum: string,
  patterns: readonly RegExp[],
): boolean {
  return (
    sourceMatches(source, "安衛則", articleNum) &&
    locatorContains(source.paragraph, "第1項") &&
    sourceHasEvidence(source, patterns)
  );
}

function sourceSupportsDeEnergizedMeasures(source: ChatbotSource): boolean {
  return (
    sourceMatches(source, "安衛則", "第339条") &&
    locatorContains(source.paragraph, "第1項") &&
    ["第1号", "第2号", "第3号"].every((label) =>
      locatorContains(source.item, label),
    ) &&
    sourceHasEvidence(source, [
      /開路に用いた開閉器.*施錠.*通電禁止.*監視人/,
      /開路した電路.*残留電荷.*放電/,
      /高圧又は特別高圧.*検電器具.*短絡接地/,
    ])
  );
}

function sourceSupportsLowVoltageLiveWorkProtection(
  source: ChatbotSource,
): boolean {
  return (
    sourceMatches(source, "安衛則", "第346条") &&
    locatorContains(source.paragraph, "第1項") &&
    sourceHasEvidence(source, [
      /事業者.*低圧の充電電路の点検.*当該充電電路を取り扱う作業/,
      /当該作業に従事する労働者.*感電の危険が生ずるおそれ/,
      /当該労働者に絶縁用保護具を着用させ.*又は活線作業用器具を使用させなければならない/,
    ])
  );
}

function sourceSupportsLowVoltageProximityProtection(
  source: ChatbotSource,
): boolean {
  return (
    sourceMatches(source, "安衛則", "第347条") &&
    locatorContains(source.paragraph, "第1項") &&
    sourceHasEvidence(source, [
      /事業者.*低圧の充電電路に近接する場所.*点検.*電気工事の作業/,
      /当該作業に従事する労働者.*当該充電電路に接触.*感電の危険が生ずるおそれ/,
      /当該充電電路に絶縁用防具を装着しなければならない/,
      /ただし.*絶縁用保護具を着用させて.*身体の部分以外の部分.*接触するおそれのないとき.*この限りでない/,
    ])
  );
}

function sourceSupportsLowVoltageChapterExclusion(
  source: ChatbotSource,
): boolean {
  return (
    sourceMatches(source, "安衛則", "第354条") &&
    sourceHasEvidence(source, [
      /この章の規定/,
      /電気機械器具.*配線.*移動電線/,
      /対地電圧が五十ボルト以下/,
      /適用しない/,
    ])
  );
}

function sourceSupportsChiefEngineer(
  source: ChatbotSource,
  requiresWorkerInstruction: boolean,
): boolean {
  return (
    sourceMatches(source, "電事法", "第43条") &&
    locatorContains(source.paragraph, "第1項") &&
    locatorContains(source.paragraph, "第4項") &&
    (!requiresWorkerInstruction || locatorContains(source.paragraph, "第5項")) &&
    sourceHasEvidence(source, [
      /第1項.*保安の監督.*主任技術者を選任/,
      /第4項.*保安の監督の職務を誠実/,
      ...(requiresWorkerInstruction
        ? [/第5項.*保安のためにする指示に従わなければならない/]
        : []),
    ])
  );
}

function sourceSupportsRequiredAuthority(
  source: ChatbotSource,
  authority: string,
): boolean {
  const parts = authorityParts(authority);
  if (!parts || !sourceMatches(source, parts.lawShort, parts.articleNum)) {
    return false;
  }
  if (parts.lawShort === "電気工事士法" && parts.articleNum === "第2条") {
    return sourceSupportsElectricalWorkDefinition(source);
  }
  if (parts.lawShort === "電気工事士法" && parts.articleNum === "第3条") {
    return sourceSupportsElectricianRestriction(source);
  }
  if (parts.lawShort === "安衛法" && parts.articleNum === "第59条") {
    return sourceSupportsSpecialEducationDuty(source);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第36条") {
    return sourceSupportsElectricalSpecialEducationScope(source);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第339条") {
    return sourceSupportsDeEnergizedMeasures(source);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第346条") {
    return sourceSupportsLowVoltageLiveWorkProtection(source);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第347条") {
    return sourceSupportsLowVoltageProximityProtection(source);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第354条") {
    return sourceSupportsLowVoltageChapterExclusion(source);
  }
  const firstParagraphPatterns: Partial<Record<string, readonly RegExp[]>> = {
    第341条: [/高圧の充電電路の点検/, /感電の危険/],
    第342条: [/高圧の充電電路/, /接触.*接近/, /感電の危険/],
    第344条: [/特別高圧の充電電路/, /点検/, /感電の危険/],
    第345条: [/特別高圧の充電電路/, /近接|接近/, /感電の危険/],
  };
  const firstParagraphRule = firstParagraphPatterns[parts.articleNum];
  if (parts.lawShort === "安衛則" && firstParagraphRule) {
    return sourceSupportsArticleFirstParagraph(
      source,
      parts.articleNum,
      firstParagraphRule,
    );
  }
  if (parts.lawShort === "電事法" && parts.articleNum === "第43条") {
    return sourceSupportsChiefEngineer(source, false);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第350条") {
    return sourceHasEvidence(source, [/作業の指揮者を定めて/]);
  }
  if (parts.lawShort === "安衛法" && parts.articleNum === "第14条") {
    return sourceHasEvidence(source, [/作業主任者/, /選任/]);
  }
  if (parts.lawShort === "安衛令" && parts.articleNum === "第6条") {
    return sourceHasEvidence(source, [/法第十四条の政令で定める作業/]);
  }
  if (parts.lawShort === "安衛則" && parts.articleNum === "第37条") {
    return sourceHasEvidence(source, [/知識及び技能/, /省略/]);
  }
  return sourceEvidenceText(source).length >= 24;
}

type CitationClaimRule = {
  id: string;
  applies: (statement: string) => boolean;
  supports: (
    sources: readonly ChatbotSource[],
    statement: string,
  ) => boolean;
};

const CITATION_CLAIM_RULES: readonly CitationClaimRule[] = [
  {
    id: "electric-work-definition",
    applies: (statement) =>
      /設置.{0,8}変更/.test(statement) && /電気工事|電気工事士/.test(statement),
    supports: (sources) => sources.some(sourceSupportsElectricalWorkDefinition),
  },
  {
    id: "electrician-restriction",
    applies: (statement) =>
      /電気工事士法3条|従事制限|設備区分.{0,30}(?:免状|資格者)/.test(
        statement,
      ),
    supports: (sources) => sources.some(sourceSupportsElectricianRestriction),
  },
  {
    id: "electrician-vs-special-education",
    applies: (statement) =>
      /電気工事士.*特別教育.*(?:別制度|別の制度|とは別|別に|それぞれ|双方)/.test(
        statement,
      ),
    supports: (sources) =>
      sources.some(sourceSupportsElectricianRestriction) &&
      sources.some(
        (source) =>
          sourceSupportsSpecialEducationDuty(source) ||
          sourceSupportsElectricalSpecialEducationScope(source),
      ),
  },
  {
    id: "special-education-duty",
    applies: (statement) =>
      /(?:危険(?:又は有害な)?業務|危険な電気業務).*(?:就かせ|安全教育|特別教育)/.test(
        statement,
      ),
    supports: (sources) => sources.some(sourceSupportsSpecialEducationDuty),
  },
  {
    id: "high-voltage-special-education-scope",
    applies: (statement) =>
      /高圧.*特別高圧.*充電電路.*(?:敷設|点検).*(?:修理|操作).*(?:特別教育|対象)/.test(
        statement,
      ),
    supports: (sources) =>
      sources.some(
        (source) =>
          sourceSupportsElectricalSpecialEducationScope(source) ||
          (sourceMatches(source, "特別教育規程", "第5条") &&
            locatorContains(source.paragraph, "第1項") &&
            sourceHasEvidence(source, [
              /高圧.*特別高圧.*充電電路/,
              /敷設.*点検.*修理.*操作/,
            ])),
      ),
  },
  {
    id: "low-voltage-special-education-scope",
    applies: (statement) =>
      /低圧.*充電電路.*敷設.*修理.*(?:露出|充電部分).*開閉器.*操作/.test(
        statement,
      ),
    supports: (sources) =>
      sources.some(
        (source) =>
          sourceSupportsElectricalSpecialEducationScope(source) ||
          (sourceMatches(source, "特別教育規程", "第6条") &&
            locatorContains(source.paragraph, "第1項") &&
            sourceHasEvidence(source, [
              /低圧.*充電電路.*敷設.*修理/,
              /露出充電部.*開閉器の操作/,
            ])),
      ),
  },
  {
    id: "high-voltage-education-hours",
    applies: (statement) =>
      /学科11時間以上.*実技15時間以上.*実技1時間以上/.test(statement),
    supports: (sources) =>
      sources.some((source) => sourceSupportsElectricalEducationHours(source, "high")),
  },
  {
    id: "low-voltage-education-hours",
    applies: (statement) =>
      /学科7時間以上.*実技7時間以上.*実技1時間以上/.test(statement),
    supports: (sources) =>
      sources.some((source) => sourceSupportsElectricalEducationHours(source, "low")),
  },
  {
    id: "de-energized-lockout",
    applies: (statement) =>
      /停電.*(?:施錠|通電禁止|監視人)|(?:施錠|通電禁止|監視人).*(?:停電|開閉器)/.test(
        statement,
      ),
    supports: (sources) => sources.some(sourceSupportsDeEnergizedMeasures),
  },
  {
    id: "de-energized-discharge",
    applies: (statement) => /残留電荷.*放電/.test(statement),
    supports: (sources) => sources.some(sourceSupportsDeEnergizedMeasures),
  },
  {
    id: "de-energized-test-and-ground",
    applies: (statement) => /検電.*短絡接地/.test(statement),
    supports: (sources) => sources.some(sourceSupportsDeEnergizedMeasures),
  },
  {
    id: "low-voltage-live-work",
    applies: (statement) =>
      /低圧.*充電電路.*(?:直接取り扱|取り扱う).*(?:絶縁用保護具|活線作業用器具)/.test(
        statement,
    ),
    supports: (sources) =>
      sources.some(sourceSupportsLowVoltageLiveWorkProtection),
  },
  {
    id: "100v-is-low-voltage",
    applies: (statement) => /100Vは低圧/.test(statement),
    supports: (sources) =>
      sources.some(
        (source) =>
          sourceMatches(source, "安衛則", "第36条") &&
          locatorContains(source.item, "第4号") &&
          sourceHasEvidence(source, [
            /低圧/,
            /直流.*(?:750|七百五十)ボルト以下/,
            /交流.*(?:600|六百)ボルト以下/,
          ]),
      ),
  },
  {
    id: "low-voltage-proximity-work",
    applies: (statement) =>
      /低圧.*充電電路.*近接.*接触.*絶縁用防具/.test(statement),
    supports: (sources) =>
      sources.some(sourceSupportsLowVoltageProximityProtection),
  },
  {
    id: "low-voltage-proximity-exception",
    applies: (statement) =>
      /絶縁用保護具を着用.*(?:他の|以外の)身体(?:部分)?.*接触するおそれがない.*例外/.test(
        statement,
      ) ||
      /例外.*絶縁用保護具を着用.*(?:他の|以外の)身体(?:部分)?.*接触するおそれがない/.test(
        statement,
    ),
    supports: (sources) =>
      sources.some(sourceSupportsLowVoltageProximityProtection),
  },
  {
    id: "low-voltage-chapter-exclusion",
    applies: (statement) =>
      /対地電圧50V以下.*(?:電気機械器具|配線|移動電線).*(?:この章|電気による危険防止の章).*(?:適用しません|適用しない)/.test(
        statement,
      ),
    supports: (sources) =>
      sources.some(sourceSupportsLowVoltageChapterExclusion),
  },
  {
    id: "extra-high-live-and-proximity-work",
    applies: (statement) =>
      /高圧.*特別高圧.*活線.*近接作業.*規定/.test(statement),
    supports: (sources) =>
      sources.some((source) =>
        sourceSupportsArticleFirstParagraph(source, "第344条", [
          /特別高圧の充電電路/,
          /点検|修理/,
          /感電の危険/,
        ]),
      ) &&
      sources.some((source) =>
        sourceSupportsArticleFirstParagraph(source, "第345条", [
          /特別高圧の充電電路/,
          /接近|近接/,
          /感電の危険/,
        ]),
      ),
  },
  {
    id: "chief-engineer-supervision",
    applies: (statement) =>
      /電気主任技術者|主任技術者/.test(statement) &&
      /保安監督|保安を監督|工事・維持・運用/.test(statement),
    supports: (sources) => sources.some((source) => sourceSupportsChiefEngineer(source, false)),
  },
  {
    id: "chief-engineer-worker-instruction",
    applies: (statement) => /従事者.*指示に従/.test(statement),
    supports: (sources) => sources.some((source) => sourceSupportsChiefEngineer(source, true)),
  },
  {
    id: "chief-engineer-does-not-replace-worker-requirements",
    applies: (statement) =>
      /電気主任技術者|主任技術者/.test(statement) &&
      /(?:電気工事士|作業者.*資格|個々の作業資格|特別教育)/.test(statement) &&
      /(?:代わりでは|代替され|置き換え|誰でも.*わけでは)/.test(statement),
    supports: (sources, statement) => {
      const mentionsWorkerQualification =
        /電気工事士|作業者.*資格|個々の作業資格/.test(statement);
      const mentionsSpecialEducation = /特別教育/.test(statement);
      return (
        sources.some((source) => sourceSupportsChiefEngineer(source, false)) &&
        (!mentionsWorkerQualification ||
          sources.some(sourceSupportsElectricianRestriction)) &&
        (!mentionsSpecialEducation ||
          sources.some(
            (source) =>
              sourceSupportsSpecialEducationDuty(source) ||
              sourceSupportsElectricalSpecialEducationScope(source),
          ))
      );
    },
  },
  {
    id: "electrical-work-leader",
    applies: (statement) =>
      /作業の指揮者|作業指揮者/.test(statement) &&
      /350条|直接指揮|対象作業|停電作業/.test(statement),
    supports: (sources) =>
      sources.some(
        (source) =>
          sourceMatches(source, "安衛則", "第350条") &&
          sourceHasEvidence(source, [/作業の指揮者を定めて/]),
      ),
  },
];

function statementMarkerIndexes(statement: string): number[] {
  return [...statement.matchAll(/［(\d+)］/g)].map((match) => Number(match[1]));
}

function semanticClaimFailures(response: ChatbotResponse): string[] {
  const failures: string[] = [];
  for (const statement of [
    response.directAnswer,
    ...response.importantConditions,
  ]) {
    const normalized = normalizedText(statement);
    const markedSources = statementMarkerIndexes(statement).flatMap((index) =>
      index >= 1 && index <= response.sources.length
        ? [response.sources[index - 1]!]
        : [],
    );
    for (const rule of CITATION_CLAIM_RULES) {
      if (
        rule.applies(normalized) &&
        !rule.supports(markedSources, normalized)
      ) {
        failures.push(`unsupported legal claim ${rule.id}`);
      }
    }
  }
  return [...new Set(failures)];
}

function electricalSourceUnitFailures(response: ChatbotResponse): string[] {
  const failures: string[] = [];
  const claimText = normalizedText(
    [response.directAnswer, ...response.importantConditions].join(" "),
  );
  const isKnownLowVoltageTesterAnswer =
    response.context?.workAction === "tester-measurement" &&
    response.context.voltageClass === "低圧";
  const statesLowVoltageLiveWorkProtection =
    /346条/.test(claimText) &&
    /絶縁用保護具|活線作業用器具/.test(claimText);
  const statesLowVoltageProximityProtection =
    /347条/.test(claimText) && /絶縁用防具/.test(claimText);

  if (
    isKnownLowVoltageTesterAnswer &&
    statesLowVoltageLiveWorkProtection &&
    statesLowVoltageProximityProtection
  ) {
    if (!response.sources.some(sourceSupportsLowVoltageLiveWorkProtection)) {
      failures.push(
        "unsupported low-voltage tester source unit: 安衛則第346条",
      );
    }
    if (!response.sources.some(sourceSupportsLowVoltageProximityProtection)) {
      failures.push(
        "unsupported low-voltage tester source unit: 安衛則第347条",
      );
    }
    if (!response.sources.some(sourceSupportsLowVoltageChapterExclusion)) {
      failures.push(
        "unsupported low-voltage tester source unit: 安衛則第354条",
      );
    }
  }

  const statesDeEnergizedRule339 =
    /(?:停電済み|停電して|停電作業).{0,30}(?:安衛則)?339条/.test(
      claimText,
    ) ||
    /(?:安衛則)?339条.{0,30}(?:停電作業措置|施錠|通電禁止|残留電荷|放電)/.test(
      claimText,
    );
  if (
    statesDeEnergizedRule339 &&
    !response.sources.some(sourceSupportsDeEnergizedMeasures)
  ) {
    failures.push("unsupported de-energized source unit: 安衛則第339条");
  }

  return failures;
}

function citationSupportFailures(
  response: ChatbotResponse,
  testCase?: ElectricChatbotHoldoutCase,
): string[] {
  const failures: string[] = [];
  if (response.sources.length === 0 || response.citations.length === 0) {
    return ["no displayed official source/citation"];
  }
  for (const source of response.sources) {
    if (
        !source.verificationStatus ||
        !source.sourceKind ||
        !isOfficialSourceUrl(source.url)
    ) {
      failures.push(
        `unverified/non-official source: ${source.lawShort ?? source.law}${source.article}`,
      );
    }
  }
  const sourceKeys = new Set(
    response.sources.map(sourceIdentity),
  );
  for (const citation of response.citations) {
    if (
        !sourceKeys.has(
          `${normalizedAuthorityLaw(citation.lawShort)}|${citation.articleNum}`,
        )
    ) {
      failures.push(
        `citation has no displayed source: ${citation.lawShort}${citation.articleNum}`,
      );
    }
  }
  const markers = [
    response.directAnswer,
    ...response.importantConditions,
  ].flatMap((value) => [...value.matchAll(/［(\d+)］/g)].map((match) => Number(match[1])));
  if (markers.length === 0) failures.push("answer has no source marker");
  if (markers.some((marker) => marker < 1 || marker > response.sources.length)) {
    failures.push("answer contains an out-of-range source marker");
  }
  const legalStatements = [response.directAnswer, ...response.importantConditions].filter(
    (value) =>
      /(?:法|令|則|規則|条|資格|教育|必要|対象|義務|制度|措置)/.test(value),
  );
  if (legalStatements.some((statement) => !/［\d+］/.test(statement))) {
    failures.push("a legal answer paragraph has no source marker");
  }
  failures.push(...semanticClaimFailures(response));
  failures.push(...electricalSourceUnitFailures(response));

  if (testCase) {
    const answerMarkerSet = new Set(markers);
    for (const authority of testCase.requiredAuthorities) {
      const parts = authorityParts(authority);
      const sourceIndex = parts
        ? response.sources.findIndex((source) =>
            sourceMatches(source, parts.lawShort, parts.articleNum),
          )
        : -1;
      if (sourceIndex < 0) {
        failures.push(`required authority has no source: ${authority}`);
        continue;
      }
      const source = response.sources[sourceIndex]!;
      if (!answerMarkerSet.has(sourceIndex + 1)) {
        failures.push(`required authority is not marked in answer: ${authority}`);
      }
      if (!sourceSupportsRequiredAuthority(source, authority)) {
        failures.push(`required authority source unit is unsupported: ${authority}`);
      }
    }
  }
  return [...new Set(failures)];
}

function hasRelevantQuickReplies(response: ChatbotResponse): boolean {
  if (response.quickReplies.length > 3) return false;
  if (response.quickReplies.length === 0) return true;
  if (!response.clarificationQuestion || !response.clarification) return false;
  const options = new Set(response.clarification.options);
  return response.quickReplies.every((reply) => {
    const combined = `${reply.label} ${reply.prompt}`;
    return (
      options.has(reply.label) &&
      reply.label === reply.prompt &&
      !/(?:酸欠|有機溶剤|石綿|玉掛け|フォークリフト|クレーン)/.test(combined) &&
      /(?:見る|盤|測定|点検|配線|充電|停電|電圧|電路|電線|支持物|接触|端子|ブレーカー|開閉器|100|200|低圧|高圧|特高|露出|どちらでもない)/.test(
        combined,
      )
    );
  });
}

function doesNotReaskKnownElectricalConditions(
  response: ChatbotResponse,
): boolean {
  const context = response.context ?? {};
  const clarificationText = normalizedText(
    [
      response.clarificationQuestion ?? "",
      ...response.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
    ].join(" "),
  );

  // Once low voltage has been retained, the answer body may still compare
  // schemes, but the next clarification must not ask the user to choose high
  // voltage again.  workAction is independent and need not be known yet.
  if (
    context.voltageClass === "低圧" &&
    /(?:高圧|特別高圧|特高)/.test(clarificationText)
  ) {
    return false;
  }

  // Apply the same semantic check in the other direction.  A retained
  // high/extra-high work action (notably a high-voltage receiving-equipment
  // inspection) must not fall back to a generic 100/200V picker.
  if (
    (context.voltageClass === "高圧" ||
      context.voltageClass === "特別高圧") &&
    /(?:低圧|100|200)/.test(clarificationText)
  ) {
    return false;
  }

  // Exposure is an allowlisted confirmed choice.  Do not repeat the same
  // question or offer the opposite exposure choice after it is known.
  if (
    context.confirmedChoices?.includes("充電部分は露出していない") &&
    /(?:露出型|露出していますか|充電部分が露出している)/.test(
      clarificationText,
    )
  ) {
    return false;
  }

  return true;
}

function doesNotInventUnconfirmedAction(
  testCase: ElectricChatbotHoldoutCase,
  response: ChatbotResponse,
): boolean {
  if (testCase.id !== "EL-043") return true;
  const assertedText = normalizedText(
    [response.directAnswer, response.clarificationQuestion ?? ""].join(" "),
  );
  const assertsTesterMeasurement =
    /盤を開けて(?:テスター|測定器)を?(?:当て|使|接続).{0,12}(?:作業|測定)(?:は|です|を行)/.test(
      assertedText,
    ) || /(?:^|[。])測定時は/.test(assertedText);
  return (
    response.context?.workAction === "open-panel" &&
    !assertsTesterMeasurement
  );
}

function retainsNegativeWiringConstraint(
  testCase: ElectricChatbotHoldoutCase,
  response: ChatbotResponse,
): boolean {
  if (testCase.id !== "EL-047") return true;
  const context = response.context ?? {};
  const choices = context.confirmedChoices ?? [];
  const answerText = responseEvaluationText(response);
  const remainingBranches = includesAtLeast(answerText, 3, [
    /(?:盤外|目視|見るだけ|表示.*異音.*異臭)/,
    /(?:ブレーカー|開閉器).{0,12}操作/,
    /(?:盤を開け|盤内|テスター|測定)/,
    /(?:充電部|充電電路).{0,12}(?:扱|近接|接触)/,
  ]);
  return (
    (context.workAction === undefined || context.workAction === "unknown") &&
    choices.some((choice) =>
      /配線.{0,8}(?:非接触|触らない|触れない|扱わない|接続しない|取り外さない)/.test(
        choice,
      ),
    ) &&
    remainingBranches
  );
}

function doesNotMisstateLowVoltageDistance(
  response: ChatbotResponse,
): boolean {
  const segments = normalizedText(
    [
      response.directAnswer,
      ...response.importantConditions,
      response.clarificationQuestion ?? "",
      ...response.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
    ].join("\n"),
  ).split(/[。\n]/u);

  return !segments.some((segment) => {
    const isLowVoltageStatement = /(?:低圧|100・?200V|100V|200V)/.test(
      segment,
    );
    const isAlsoHighVoltageStatement = /(?:高圧|特別高圧|特高)/.test(segment);
    const treatsDistanceAsMeasure =
      /(?:露出部|充電部).{0,16}距離|距離(?:の確保|に応じ|を教えて|を確認|が必要)|最短距離/.test(
        segment,
      );
    const expresslyRejectsUniformDistance =
      /(?:一律の)?数値距離.{0,20}(?:定める規定ではありません|求めていません)|距離.{0,20}(?:法定要件|代替措置).{0,12}(?:ではありません|ではない)/.test(
        segment,
      );
    return (
      isLowVoltageStatement &&
      !isAlsoHighVoltageStatement &&
      treatsDistanceAsMeasure &&
      !expresslyRejectsUniformDistance
    );
  });
}

function hasAtMostOneClarification(response: ChatbotResponse): boolean {
  const visibleSections = response.answer.match(/(?:^|\n)次の質問(?:\n|$)/g)?.length ?? 0;
  const fieldQuestionMarks = response.clarificationQuestion?.match(/[？?]/g)?.length ?? 0;
  return visibleSections <= 1 && fieldQuestionMarks <= 1;
}

export function hasOnlySafeElectricalStructuredContext(
  context: PublicLegalConversationContext,
): boolean {
  return Object.keys(context).every((key) =>
    ALLOWED_CONTEXT_KEYS.has(key as keyof PublicLegalConversationContext),
  );
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 100;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function evaluateElectricHoldoutCaseFromTurns(
  testCase: ElectricChatbotHoldoutCase,
  turns: ElectricHoldoutTurnResult[],
): ElectricHoldoutCaseResult {
  const contextFixtureReason = (
    ELECTRIC_CONTEXT_DEPENDENT_HOLDOUT_FIXTURES as Readonly<
      Partial<Record<string, string>>
    >
  )[testCase.id];
  const initialContextMode = contextFixtureReason
    ? "electrical-context-fixture"
    : "empty-classifier";
  const context = rehydratePublicLegalConversationContext(
    turns.at(-1)?.response.context,
  );
  const initialClassification = Boolean(
    contextFixtureReason ||
      turns[0]?.response.context?.topicDomain === "electrical",
  );
  const finalTurn = turns.at(-1)!;
  const response = finalTurn.response;
  const text = responseEvaluationText(response);
  const failures: string[] = [];
  const concepts = Object.fromEntries(
    testCase.requiredConcepts.map((concept) => {
      const passed =
        CONCEPT_RULES[concept].test(text, response) &&
        !contradictsRequiredLegalScope(concept, text);
      if (!passed) {
        failures.push(
          `concept ${concept}: ${CONCEPT_RULES[concept].description}`,
        );
      }
      return [concept, passed];
    }),
  ) as Record<ElectricHoldoutConcept, boolean>;
  const legalPolarityConsistent = testCase.requiredConcepts.every(
    (concept) => !contradictsRequiredLegalScope(concept, text),
  );
  const requiredAuthorities = Object.fromEntries(
    testCase.requiredAuthorities.map((authority) => {
      const passed = hasRequiredAuthority(response, authority);
      if (!passed) failures.push(`authority missing: ${authority}`);
      return [authority, passed];
    }),
  );
  const turnAnswerFirst = turns.every(({ response: item }) =>
    CONCEPT_RULES["answer-first"].test(responseEvaluationText(item), item),
  );
  const substantive = turns.every(({ response: item }) =>
    isSubstantiveDirectAnswer(item),
  );
  const pureClarification = turns.some(({ response: item }) =>
    isPureClarificationResponse(item),
  );
  const contextRetention =
    turns.every(({ response: item }) =>
      hasOnlySafeElectricalStructuredContext(item.context ?? {}),
    ) &&
    context.topicDomain === "electrical" &&
    turns.slice(1).every((turn) => turn.usedStructuredContext);
  const quickRepliesRelevant = turns.every(({ response: item }) =>
    hasRelevantQuickReplies(item),
  );
  const knownConditionsNotReasked = turns.every(({ response: item }) =>
    doesNotReaskKnownElectricalConditions(item),
  );
  const lowVoltageDistanceNotMisstated = turns.every(({ response: item }) =>
    doesNotMisstateLowVoltageDistance(item),
  );
  const noInventedAction = doesNotInventUnconfirmedAction(testCase, response);
  const negativeConstraintRetained = retainsNegativeWiringConstraint(
    testCase,
    response,
  );
  const responseDomainText = turns
    .map(({ response: item }) =>
      [
        item.directAnswer,
        ...item.importantConditions,
        item.clarificationQuestion ?? "",
        ...item.quickReplies.flatMap((reply) => [reply.label, reply.prompt]),
      ].join(" "),
    )
    .join(" ");
  const unrelatedDomainJump = (testCase.forbiddenDomains ?? []).some((domain) =>
    responseDomainText.includes(domain),
  );
  const citationFailures = turns.flatMap((turn, index) =>
    citationSupportFailures(
      turn.response,
      index === turns.length - 1 ? testCase : undefined,
    ).map((failure) => `turn ${index + 1}: ${failure}`),
  );
  const citationSupport =
    citationFailures.length === 0 &&
    Object.values(requiredAuthorities).every(Boolean);
  const effectiveDateCurrent = turns.every(
    ({ response: item }) =>
      item.effectiveDateStatus.status === "current" &&
      item.effectiveDateStatus.asOf === HOLDOUT_AS_OF &&
      item.answer.includes(`回答基準日: ${HOLDOUT_AS_OF} JST`),
  );

  if (!turnAnswerFirst) failures.push("one or more turns are not answer-first");
  if (!legalPolarityConsistent) {
    failures.push("required legal scope is contradicted by a negative assertion");
  }
  if (!substantive) failures.push("one or more direct answers are not substantive");
  if (pureClarification) failures.push("pure clarification response detected");
  if (!initialClassification) {
    failures.push("empty-context first turn was not classified as electrical");
  }
  if (!turns.every(({ response: item }) => hasAtMostOneClarification(item))) {
    failures.push("more than one clarification question detected");
  }
  if (!contextRetention) {
    failures.push("electrical structured context was not safely retained");
  }
  if (!quickRepliesRelevant) failures.push("irrelevant quick reply detected");
  if (!knownConditionsNotReasked) {
    failures.push("clarification repeats or contradicts a known condition");
  }
  if (!lowVoltageDistanceNotMisstated) {
    failures.push("low-voltage proximity was misstated as a distance rule");
  }
  if (!noInventedAction) {
    failures.push("an unconfirmed electrical action was asserted as fact");
  }
  if (!negativeConstraintRetained) {
    failures.push(
      "negative wiring constraint was converted into an unsafe positive action",
    );
  }
  if (unrelatedDomainJump) failures.push("unrelated domain jump detected");
  if (!citationSupport) {
    failures.push(
      `citation support is incomplete${
        citationFailures.length > 0 ? ` (${citationFailures.join(", ")})` : ""
      }`,
    );
  }
  if (!effectiveDateCurrent) {
    failures.push(`effective date is not current as of ${HOLDOUT_AS_OF}`);
  }
  const fixtureSafetyCorrection = (
    ELECTRIC_HOLDOUT_SAFETY_CORRECTIONS as Readonly<
      Partial<
        Record<
          string,
          (typeof ELECTRIC_HOLDOUT_SAFETY_CORRECTIONS)["EL-047"]
        >
      >
    >
  )[testCase.id];
  const enforcedExpectedAction = fixtureSafetyCorrection
    ? fixtureSafetyCorrection.enforcedExpectedAction
    : testCase.expectedAction;
  if (
    enforcedExpectedAction &&
    expectedActionValue(context) !== enforcedExpectedAction
  ) {
    failures.push(
      `workAction expected=${enforcedExpectedAction} actual=${expectedActionValue(context)}`,
    );
  }
  if (
    testCase.expectedVoltage &&
    expectedVoltageValue(context) !== testCase.expectedVoltage
  ) {
    failures.push(
      `voltage expected=${testCase.expectedVoltage} actual=${expectedVoltageValue(context)}`,
    );
  }
  if (
    testCase.expectedEnergizedState &&
    expectedEnergizedValue(context) !== testCase.expectedEnergizedState
  ) {
    failures.push(
      `energizedState expected=${testCase.expectedEnergizedState} actual=${expectedEnergizedValue(context)}`,
    );
  }

  return {
    id: testCase.id,
    category: testCase.category,
    initialContextMode,
    ...(contextFixtureReason ? { contextFixtureReason } : {}),
    ...(fixtureSafetyCorrection ? { fixtureSafetyCorrection } : {}),
    passed: failures.length === 0,
    failures,
    finalContext: context,
    turns,
    checks: {
      concepts,
      requiredAuthorities,
      legalPolarityConsistent,
      answerFirst: turnAnswerFirst,
      substantive,
      pureClarification,
      initialClassification,
      contextRetention,
      quickRepliesRelevant,
      knownConditionsNotReasked,
      lowVoltageDistanceNotMisstated,
      noInventedAction,
      negativeConstraintRetained,
      unrelatedDomainJump,
      citationSupport,
      effectiveDateCurrent,
    },
  };
}

function evaluateCase(
  testCase: ElectricChatbotHoldoutCase,
): ElectricHoldoutCaseResult {
  let context: LegalConversationContext =
    electricHoldoutInitialContext(testCase) ?? {};
  const turns: ElectricHoldoutTurnResult[] = [];
  for (const message of testCase.turns) {
    const turn = buildTurn(message, context);
    turns.push(turn);
    context = turn.response.context
      ? rehydratePublicLegalConversationContext(turn.response.context)
      : context;
  }
  return evaluateElectricHoldoutCaseFromTurns(testCase, turns);
}

export function summarizeElectricHoldoutResults(
  results: ElectricHoldoutCaseResult[],
): ElectricHoldoutMetrics {
  const allTurns = results.flatMap((result) => result.turns);
  const firstTurns = results.map((result) => result.turns[0]!);
  const contextCases = results.filter((result) => result.turns.length > 1);
  const relevantQuickReplyTurns = allTurns.filter(
    ({ response }) => response.quickReplies.length > 0,
  );
  const classificationEligible = results.filter(
    (result) => result.initialContextMode === "empty-classifier",
  );
  const classificationEligiblePassed = classificationEligible.filter(
    (result) => result.checks.initialClassification,
  ).length;
  return {
    totalCases: results.length,
    passedCases: results.filter((result) => result.passed).length,
    totalTurns: allTurns.length,
    firstTurnUsefulAnswerRate: percentage(
      firstTurns.filter(({ response }) => isSubstantiveDirectAnswer(response))
        .length,
      firstTurns.length,
    ),
    answerFirstRate: percentage(
      allTurns.filter(({ response }) =>
        CONCEPT_RULES["answer-first"].test(
          responseEvaluationText(response),
          response,
        ),
      ).length,
      allTurns.length,
    ),
    substantiveAnswerRate: percentage(
      allTurns.filter(({ response }) => isSubstantiveDirectAnswer(response))
        .length,
      allTurns.length,
    ),
    pureClarificationRate: percentage(
      allTurns.filter(({ response }) => isPureClarificationResponse(response))
        .length,
      allTurns.length,
    ),
    contextRetentionRate: percentage(
      contextCases.filter((result) => result.checks.contextRetention).length,
      contextCases.length,
    ),
    irrelevantQuickReplyRate: percentage(
      relevantQuickReplyTurns.filter(
        ({ response }) =>
          !hasRelevantQuickReplies(response) ||
          !doesNotReaskKnownElectricalConditions(response),
      ).length,
      relevantQuickReplyTurns.length,
    ),
    unrelatedDomainJumpCount: results.filter(
      (result) => result.checks.unrelatedDomainJump,
    ).length,
    citationSupportRate: percentage(
      results.filter((result) => result.checks.citationSupport).length,
      results.length,
    ),
    effectiveDateCurrentRate: percentage(
      results.filter((result) => result.checks.effectiveDateCurrent).length,
      results.length,
    ),
    classificationEligibleTotal: classificationEligible.length,
    classificationEligiblePassed,
    classificationEligibleRate: percentage(
      classificationEligiblePassed,
      classificationEligible.length,
    ),
    contextFixtureCount: results.length - classificationEligible.length,
    safetyCorrectedFixtureCount: results.filter(
      (result) => result.fixtureSafetyCorrection,
    ).length,
  };
}

export function evaluateElectricChatbotHoldout(): ElectricHoldoutEvaluation {
  const results = ELECTRIC_CHATBOT_HOLDOUT_2026_08_09.map(evaluateCase);
  return {
    basisDate: HOLDOUT_AS_OF,
    fixtureContext: "classifier-first-with-explicit-context-fixtures",
    results,
    metrics: summarizeElectricHoldoutResults(results),
  };
}

export function formatElectricHoldoutFailures(
  evaluation: ElectricHoldoutEvaluation,
): string {
  const failed = evaluation.results.filter((result) => !result.passed);
  const metricLine = Object.entries(evaluation.metrics)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  if (failed.length === 0) return `PASS: ${metricLine}`;
  return [
    `FAIL: ${failed.length}/${evaluation.results.length} cases; ${metricLine}`,
    ...failed.map(
      (result) =>
        `${result.id} (${result.category}): ${result.failures.join("; ")}`,
    ),
  ].join("\n");
}
