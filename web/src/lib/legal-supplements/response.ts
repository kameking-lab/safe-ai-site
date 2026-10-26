import "server-only";
import type { ChatbotResponseDraft, ChatbotSource } from "@/lib/chatbot-contract";
import { classifyLegalQuestionTime, requestedLegalPeriod } from "@/lib/legal-answer-temporal";
import { localSupplementsEnabled, loadLocalSupplements } from "./loader";
import { searchSupplements, supplementContext, supplementQueryIntent, withoutAmendmentIdentityDates } from "./search";
import type { SupplementDataset } from "./types";
import { representativeIntent, representativeResult, validateRepresentativeReferenceScope } from "./representative";

export function isLocalSupplementRequest(query: string): boolean {
  return localSupplementsEnabled() && (supplementQueryIntent(query) || representativeIntent(query));
}

function hold(message: string, asOf: string | null, clarification: string): ChatbotResponseDraft {
  return { answer: message, directAnswer: message, sources: [], citations: [],
    source_type: "rag", confidence: "low", requiresHumanReview: true,
    scopeWarnings: [message], assumptions: [], importantConditions: [],
    clarificationQuestion: clarification, quickReplies: [],
    effectiveDateStatus: { asOf, status: "unknown", label: "対象日の適用状態を確認できていません。" } };
}

export function supplementResponse(dataset: SupplementDataset, query: string, category = "all", originalQuery = query): ChatbotResponseDraft {
  const temporalQuery = withoutAmendmentIdentityDates(dataset, query);
  const period = requestedLegalPeriod(temporalQuery);
  const time = classifyLegalQuestionTime(temporalQuery, new Date(`${dataset.asOf}T00:00:00+09:00`));
  const dateMentions = temporalQuery.match(/(?:\d{4}年\d+月\d+日|\d{4}[-/.]\d+[-/.]\d+|(?:令和|平成|昭和)(?:元|\d+)年\d+月\d+日)/g) ?? [];
  if ((period && (period.start !== dataset.asOf || period.end !== dataset.asOf)) ||
    dateMentions.length > 1 || (period && /から|まで|〜|～|~|以降|以前|以後/.test(temporalQuery)) ||
    time.status !== "current" || /明日|昨日|来月|先月|昨年/.test(temporalQuery) ||
    (!period && /\d{4}[-年/.]|(?:令和|平成|昭和)(?:元|\d+)年/.test(temporalQuery))) {
    return hold(`保存資料は${dataset.asOf}を指定して取得した版です。指定された日・期間の附則や別表の適用を、この版だけで確定できません。`,
      period?.start ?? null, "確認する作業日を年月日で指定してください。");
  }
  let representative;
  try {
    if (representativeIntent(query)) validateRepresentativeReferenceScope(dataset, originalQuery);
    representative = representativeResult(dataset, query, category);
  } catch {
    return hold("指定された法令・条項と代表ケースの対応を確認できません。対象外の法令、存在しない条項、曖昧な指定を別の根拠で補うことはできません。",
      dataset.asOf, "検索対象を「すべて」にして、法令名と条項・別表を対応させて教えてください。玉掛け、酸欠、使用再開検査は一件ずつ確認します。");
  }
  const matches = searchSupplements(dataset, query, category);
  if (!representative && matches.ambiguousScope) {
    return hold("複数法令の附則・別表の指定があるため、法令と資料番号の対応を一つずつ確認する必要があります。番号を他の法令へ当てはめて補完することはできません。",
      dataset.asOf, "最初に確認する法令名と資料番号を一組で教えてください。");
  }
  if (!representative && matches.documents.length === 0) {
    return hold(matches.unknownLaw
      ? "指定された法令の附則・別表は今回の5法令資料の対象外です。既存の本則資料で代用せず、原典を特定する必要があります。"
      : "指定された附則・別表・準用箇所を取得資料で特定できません。似た番号の本則を根拠として代用できません。",
      dataset.asOf, "法令名と別表番号、または改正附則の法令名を教えてください。");
  }
  const documents = representative?.documents ?? supplementContext(dataset, matches.documents);
  const ambiguous = !representative && matches.total > matches.documents.length;
  const supplemental = !representative && matches.documents.some(document => document.kind === "supplementary");
  const warnings = [
    `資料対象日は${dataset.asOf}です。収録した改正附則の経過措置・施行条件の適用は未確認です。`,
  ];
  if (ambiguous) warnings.push(`候補${matches.total}件のうち${matches.documents.length}件を表示しています。改正法令・資料名を特定する必要があります。`);
  if (documents.some(document => document.hasFigures)) warnings.push("この根拠には図・様式画像の参照があります。画像本体を未取得のため、本文だけで内容や要件の確認を完結できません。");
  if (documents.some(document => document.hasTables)) warnings.push("表の列・見出しを含む原構造を保存しています。表示抜粋だけでは列の対応や例外を確認できません。");
  if (documents.some(document => document.referenceSignals.length > 0)) warnings.push("定義・ただし書・参照先は原文に保持していますが、すべての参照関係や準用条件の適用までは確認していません。");
  const question = representative?.question ?? (supplemental
    ? "どの改正法令の附則を、どの作業日に適用する確認ですか？"
    : /酸欠|酸素欠乏/.test(query)
      ? "作業場所の構造・内容と、確認する作業日を教えてください。"
      : "確認する設備・作業条件と作業日を教えてください。");
  const lead = representative?.lead ?? (supplemental
    ? "附則の原文候補を取得しました。改正法令と経過措置の対象条件が未確定のため、適用の結論は保留します。"
    : "指定資料と関連する原文を確認できます。定義・例外・施行条件の適用が未確認のため、作業や資格の要否はまだ確定できません。");
  const sources: ChatbotSource[] = documents.map(document => {
    const law = dataset.laws.find(item => item.lawId === document.lawId)!;
    const fetchedAt = new Date(law.retrievedAt).toISOString();
    const excerpt = document.text.length > 600 ? `${document.text.slice(0, 600)}…（原文の一部）` : document.text;
    return { law: law.title, lawShort: law.lawShort, article: document.label,
      articleTitle: document.kind === "main" ? "関連本則" : document.kind === "supplementary" ? "改正附則・経過措置" : "別表・様式",
      text: excerpt, snippet: excerpt, asOf: dataset.asOf, applicationStatus: "unknown",
      revision: law.revisionId, url: law.sourceUrl, sourceFetchedAt: fetchedAt,
      verificationStatus: "snapshot-hash-verified", sourceKind: "egov-fulltext-snapshot", humanReviewStatus: "not-reviewed",
      sourceProvenance: { url: law.sourceUrl, version: law.revisionId, fetchedAt },
      legalEvidence: { documentId: document.id, kind: document.kind, xmlPath: document.path,
        snapshotAsOf: dataset.asOf, xmlSha256: law.xmlSha256,
        figuresPending: document.hasFigures, hasTables: document.hasTables },
    };
  });
  return { answer: `結論\n${lead}${representative?.explanation.length ? `\n\n条件\n${representative.explanation.join("\n\n")}` : ""}\n\n根拠\n${documents.map((document, index) => `［${index + 1}］${dataset.laws.find(law => law.lawId === document.lawId)!.lawShort} ${document.label}`).join("\n")}\n\n回答基準日: ${dataset.asOf} JST`,
    directAnswer: lead, sources, citations: sources.map(source => ({ lawShort: source.lawShort!, fullName: source.law,
      articleNum: source.article, articleTitle: source.articleTitle!, issuer: "e-Gov法令API",
      searchHref: `/api/chatbot/local-evidence?documentId=${encodeURIComponent(source.legalEvidence!.documentId)}`, egovHref: source.url })),
    source_type: "rag", confidence: "low", requiresHumanReview: true,
    scopeWarnings: warnings, assumptions: [], importantConditions: representative?.explanation.length ? representative.explanation : warnings.slice(1, 4),
    clarificationQuestion: question, quickReplies: [],
    effectiveDateStatus: { asOf: dataset.asOf, status: "unknown", label: `${dataset.asOf}指定の取得原文。適用状態は未確認です。` } };
}

export async function localSupplementResponse(query: string, category = "all", originalQuery = query): Promise<ChatbotResponseDraft> {
  try {
    return supplementResponse(await loadLocalSupplements(), query, category, originalQuery);
  } catch {
    return hold("附則・別表の検証済み資料または関連条文を読み込めません。別の本文で補わず、原典の確認が必要です。", null,
      "確認する法令名と資料名を教えてください。");
  }
}
