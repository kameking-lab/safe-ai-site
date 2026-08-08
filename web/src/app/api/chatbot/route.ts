import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_FLASH_MODEL } from "@/lib/gemini-model";
import { externalGenerativeAiAllowed } from "@/lib/server/deployment-safety";
import {
  searchRelevantArticlesWithScore,
  buildContextFromArticles,
  type LawCategoryFilter,
} from "@/lib/rag-search";
import { resolveFulltextRagArticles } from "@/lib/laws-fulltext/rag-fallback";
import { buildExactLegalEvidenceAnswer } from "@/lib/legal-exact-answer";
import {
  buildFutureLegalHoldAnswer,
  ensureLegalAnswerAsOf,
  hasFutureLegalPremise,
  legalAnswerBasisNow,
} from "@/lib/legal-answer-temporal";
import {
  buildContextClarificationAnswer,
  hasExplicitLawArticleReference,
  needsPriorConversationContext,
} from "@/lib/legal-question-boundary";
import { stripAnswerTailBlocks } from "@/lib/chatbot-answer-format";
import { searchRelevantNotices } from "@/lib/notice-search";
import type { LawArticle } from "@/data/laws";
import { LAW_SOURCE_COUNT } from "@/data/laws";
import { VERIFIED_LEGAL_SOURCE_VERSION } from "@/data/laws/verified-corpus";
import { searchMlitResources } from "@/data/mlit-resources";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import {
  buildStructuredCitations,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
  sanitizePlaceholderCitations,
} from "@/lib/chatbot-enrichment";
import { cacheKey, getCachedResponse, setCachedResponse } from "@/lib/chatbot-cache";
// Phase 2 ハルシネーション絶滅3層
import {
  buildAllowedCitations,
  buildPromptWithWhitelist,
} from "@/lib/chatbot-prompt-builder";
import { validateCitations } from "@/lib/chatbot-citation-validator";
import {
  buildFallbackDecision,
  searchPartialMatches,
} from "@/lib/chatbot-fallback-logic";
import { NO_HIT_NOISE_FLOOR } from "@/lib/chatbot-no-hit-response";
import { hasOutOfDomainSignal } from "@/lib/rag/out-of-domain";
import { getClientIp, checkRateLimit, rateLimitMessage } from "@/lib/chatbot-rate-limit";
// Phase 4 通達・リーフレット添付
import { attachNoticesAndLeaflets } from "@/lib/chatbot-notice-attachment";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import { inspectAiOutbound } from "@/lib/server/ai-outbound-safety";
import { validateChatbotRequestBoundary } from "@/lib/server/chatbot-request-boundary";
import {
  buildUnknownLoadConditionHold,
  nextLegalClarification,
  normalizeLegalConversationText,
  resolveLegalConversationQuery,
  sanitizeLegalConversationContext,
} from "@/lib/legal-conversation-context";
import {
  buildServiceFirstLegalAnswer,
  buildServiceFirstNoHitAnswer,
  buildServiceFirstUnverifiedReferenceAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
} from "@/lib/legal-extractive-answer";
import type {
  ChatbotRequest,
  ChatbotResponse,
  ChatbotResponseDraft,
  ChatbotSource,
  ChatTurn,
} from "@/lib/chatbot-contract";
import {
  finalizeChatbotResponse,
  legalAnswerAssumptions,
} from "@/lib/chatbot-contract";
import {
  GENERATIVE_LEGAL_ANSWERS_ENABLED,
  SYSTEM_PROMPT,
  buildFollowups,
  buildMlitContext,
  lawArticleToSource,
  mlitToSource,
} from "@/lib/chatbot-route-shared";

type ApiErrorBody = {
  error: string;
  retryable: boolean;
};

const GENERATIVE_REQUEST_TIMEOUT_MS = 25_000;

function jsonError(status: number, message: string, retryable = false) {
  return NextResponse.json<ApiErrorBody>({ error: message, retryable }, { status });
}

export async function POST(request: Request) {
  const requestBoundary = validateChatbotRequestBoundary(request);
  if (!requestBoundary.allowed) {
    return jsonError(requestBoundary.status, requestBoundary.message);
  }

  let body: ChatbotRequest | null = null;
  try {
    body = (await request.json()) as ChatbotRequest;
  } catch {
    return jsonError(400, "リクエストボディのJSON形式が不正です。");
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return jsonError(400, "質問文を入力してください。");
  }
  const legalAnswerNow = legalAnswerBasisNow();
  const historyForSafety = Array.isArray(body.history)
    ? body.history
        .filter(
          (turn): turn is ChatTurn =>
            Boolean(turn) &&
            turn.role === "user" &&
            typeof turn.content === "string",
        )
        .map((turn) => turn.content)
    : [];
  const outboundSafety = inspectAiOutbound({
    purpose: "chatbot",
    texts: [message, ...historyForSafety],
    consent: body.privacyConfirmed === true,
    maxChars: 36_000,
    contextPolicy: "approved-server-corpus",
  });
  const directSafety = evaluateChatbotSafety(message);
  const normalizedDirectSafety = evaluateChatbotSafety(
    normalizeLegalConversationText(message),
  );
  const preferredDirectSafety =
    directSafety?.kind === "emergency" || directSafety?.kind === "privacy"
      ? directSafety
      : normalizedDirectSafety ?? directSafety;
  const verifiedNoticeResolvesSourceGap =
    preferredDirectSafety?.kind === "source-gap" &&
    searchRelevantNotices(message, 1).length > 0;
  const effectiveDirectSafety = verifiedNoticeResolvesSourceGap
    ? null
    : preferredDirectSafety;
  const historySafety = historyForSafety
    .map(
      (content) =>
        evaluateChatbotSafety(normalizeLegalConversationText(content)) ??
        evaluateChatbotSafety(content),
    )
    .find(
      (decision) =>
        decision?.kind === "emergency" || decision?.kind === "privacy",
    );
  const safety =
    effectiveDirectSafety?.kind === "emergency" ||
    effectiveDirectSafety?.kind === "privacy"
      ? effectiveDirectSafety
      : historySafety ??
        (effectiveDirectSafety?.kind !== "ambiguous"
          ? effectiveDirectSafety
          : null);
  const safetyPayload = safety
    ? finalizeChatbotResponse({
        answer: safety.response,
        assumptions: [],
        conditions: [],
        sources: [],
        source_type: "safety",
        confidence: "low",
        citations: [],
        safetyKind: safety.kind,
        clarificationQuestion: null,
        quickReplies: [],
        requiresHumanReview: true,
      })
    : null;
  if (
    safetyPayload &&
    (safety?.kind === "emergency" || safety?.kind === "privacy")
  ) {
    return NextResponse.json<ChatbotResponse>(safetyPayload, {
      headers: { "X-AI-Used": "false" },
    });
  }
  if (
    message.length > 4_000 ||
    (body.history !== undefined &&
      (!Array.isArray(body.history) ||
        body.history.length > 10 ||
        body.history.some(
          (turn) =>
            !turn ||
            (turn.role !== "user" && turn.role !== "assistant") ||
            typeof turn.content !== "string" ||
            turn.content.length > 4_000,
        )))
  ) {
    return jsonError(413, "質問または会話履歴が長すぎるか、形式が不正です。");
  }

  if (!outboundSafety.allowed) {
    return jsonError(outboundSafety.status, outboundSafety.message);
  }

  const resolvedConversation = resolveLegalConversationQuery({
    message,
    history: Array.isArray(body.history) ? body.history : undefined,
    context: body.context,
  });

  if (hasFutureLegalPremise(message, legalAnswerNow)) {
    return NextResponse.json<ChatbotResponse>(finalizeChatbotResponse({
      requiresHumanReview: true,
      answer: buildFutureLegalHoldAnswer(message, legalAnswerNow),
      sources: [],
      source_type: "safety",
      confidence: "low",
      citations: [],
      relatedLaws: [],
      digDeeperLinks: [],
      scopeWarnings: [
        "将来時点の施行状態を確認済みの公式資料から特定できないため、検索・生成を行わず回答を保留しました。",
      ],
      context: resolvedConversation.context,
    }));
  }

  if (safetyPayload) {
    return NextResponse.json<ChatbotResponse>({
      ...safetyPayload,
      context: resolvedConversation.context,
    });
  }

  if (
    needsPriorConversationContext(
      message,
      (Array.isArray(body.history) && body.history.length > 0) ||
        Object.keys(sanitizeLegalConversationContext(body.context)).length > 0,
    )
  ) {
    return NextResponse.json<ChatbotResponse>(finalizeChatbotResponse({
      requiresHumanReview: true,
      answer: ensureLegalAnswerAsOf(
        buildContextClarificationAnswer(),
        legalAnswerNow,
      ),
      sources: [],
      source_type: "safety",
      confidence: "low",
      scopeWarnings: ["会話履歴がないため、指示語の対象を特定できません。"],
      context: resolvedConversation.context,
    }));
  }

  const retrievalQuery = resolvedConversation.query;
  const unknownLoadHold = buildUnknownLoadConditionHold(retrievalQuery);
  if (unknownLoadHold) {
    return NextResponse.json<ChatbotResponse>(finalizeChatbotResponse({
      requiresHumanReview: true,
      answer: ensureLegalAnswerAsOf(unknownLoadHold, legalAnswerNow),
      sources: [],
      source_type: "safety",
      confidence: "low",
      safetyKind: "ambiguous",
      citations: [],
      context: resolvedConversation.context,
    }));
  }
  // A generic "which notice?" clarification is unnecessary when this exact
  // query already resolves to an independently checked official notice.
  const proactiveClarification = verifiedNoticeResolvesSourceGap
    ? null
    : nextLegalClarification(
        retrievalQuery,
        resolvedConversation.answeredClarification,
      );
  const finalizeLegalResponse = (
    draft: ChatbotResponseDraft,
  ): ChatbotResponse =>
    finalizeChatbotResponse({
      ...draft,
      context: resolvedConversation.context,
      assumptions: draft.assumptions ?? legalAnswerAssumptions(retrievalQuery),
      clarification:
        draft.clarification ?? proactiveClarification ?? undefined,
    });

  // P2-5: 簡易IPレート制限（stream route と同条件・同 in-memory バケットを共有）
  let rate;
  try {
    rate = await checkRateLimit(getClientIp(request));
  } catch {
    return NextResponse.json<ApiErrorBody>(
      {
        error:
          "混雑防止機能を確認できないため、現在この回答機能を停止しています。公式情報をご確認ください。",
        retryable: true,
      },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
  if (!rate.allowed) {
    return NextResponse.json<ApiErrorBody>(
      { error: rateLimitMessage(rate.retryAfterSec), retryable: false },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const lawCategory: LawCategoryFilter = body?.lawCategory ?? "all";
  const relatedNotices = searchRelevantNotices(retrievalQuery, 3);

  // Cache lookup. Only safe for stateless (no-history) requests: with a
  // history array, the prior turn context affects the answer.
  const cacheableRequest = !body?.history || body.history.length === 0;
  const key = cacheableRequest
    ? cacheKey(
        retrievalQuery,
        lawCategory,
        legalAnswerNow,
        VERIFIED_LEGAL_SOURCE_VERSION,
      )
    : null;
  if (key) {
    const cached = getCachedResponse<ChatbotResponse>(key);
    if (cached) {
      const cachedAttached = attachNoticesAndLeaflets({
        articles: [],
        answer: cached.answer,
        query: retrievalQuery,
      });
      return NextResponse.json<ChatbotResponse>(finalizeLegalResponse({
        ...cached,
        answer: ensureLegalAnswerAsOf(cached.answer, legalAnswerNow),
        requiresHumanReview: true,
        attachedNotices:
          cached.attachedNotices ??
          (cachedAttached.notices.length > 0
            ? cachedAttached.notices
            : undefined),
        attachedLeaflets:
          cached.attachedLeaflets ??
          (cachedAttached.leaflets.length > 0
            ? cachedAttached.leaflets
            : undefined),
      }), {
        status: 200,
        headers: { "X-Cache-Hit": "true" },
      });
    }
  }

  const apiKey = externalGenerativeAiAllowed()
    ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    : null;
  if (
    !GENERATIVE_LEGAL_ANSWERS_ENABLED ||
    !apiKey ||
    apiKey === "dummy"
  ) {
    // APIキー未設定時もRAG検索による条文引用は提供する。
    // T9: normalizedScore が下限未満なら無関係条文（ノイズ）とみなし除外する
    // （このdegradedパスは通常フローのno-hit noise floorを経由しないため個別適用）。
    const { articles: degradedArticles, normalizedScore: degradedScore } =
      searchRelevantArticlesWithScore(retrievalQuery, 10, lawCategory);
    const degradedFulltext = await resolveFulltextRagArticles(
      retrievalQuery,
      lawCategory,
      degradedArticles,
    );
    const articles = expandVerifiedLegalEvidenceArticles(
      retrievalQuery,
      [
        ...degradedFulltext,
        ...(degradedScore >= NO_HIT_NOISE_FLOOR ? degradedArticles : []),
      ],
    );
    // 生成停止中は、hash検証済み法令本文だけを根拠として返す。
    // MLIT資料・通達等はこの経路で同じ完全性検証を済ませていないため、
    // 「関連しそう」という理由だけで混在させない。
    const exactEvidence = buildExactLegalEvidenceAnswer(
      retrievalQuery,
      articles,
      legalAnswerNow,
    );
    // An explicit article reference identifies one source; it must not discard
    // verified surrounding provisions needed to answer the actual work query.
    const evidenceArticles = [
      ...(exactEvidence?.articles ?? []),
      ...articles.filter(
        (candidate) =>
          !exactEvidence?.articles.some(
            (exact) =>
              exact.law === candidate.law &&
              exact.articleNum === candidate.articleNum,
          ),
      ),
    ].slice(0, 12);
    const explicitReferenceUnverified =
      hasExplicitLawArticleReference(retrievalQuery) && exactEvidence === null;
    const initialFallbackTemplate =
      explicitReferenceUnverified
        ? buildServiceFirstUnverifiedReferenceAnswer(
            retrievalQuery,
            legalAnswerNow,
          )
        : evidenceArticles.length > 0
          ? buildServiceFirstLegalAnswer({
              query: retrievalQuery,
              articles: evidenceArticles,
              now: legalAnswerNow,
            })
          : buildServiceFirstNoHitAnswer(retrievalQuery, legalAnswerNow);
    const displayedEvidenceArticles = explicitReferenceUnverified
      ? []
      : citedLegalAnswerArticles(initialFallbackTemplate, evidenceArticles);
    const fallbackTemplate =
      !explicitReferenceUnverified && displayedEvidenceArticles.length > 0
        ? buildServiceFirstLegalAnswer({
            query: retrievalQuery,
            articles: displayedEvidenceArticles,
            now: legalAnswerNow,
          })
        : initialFallbackTemplate;
    const fallbackAnswer = ensureLegalAnswerAsOf(
      fallbackTemplate,
      legalAnswerNow,
    );
    const sources: ChatbotSource[] = displayedEvidenceArticles.map((article) =>
      lawArticleToSource(article, retrievalQuery, legalAnswerNow),
    );
    const fallbackAttached = explicitReferenceUnverified
      ? { notices: [], leaflets: [] }
      : attachNoticesAndLeaflets({
          articles: displayedEvidenceArticles,
          answer: fallbackAnswer,
          query: retrievalQuery,
        });
    const fallbackPayload = finalizeLegalResponse({
      requiresHumanReview: true,
      answer: fallbackAnswer,
      sources: explicitReferenceUnverified ? [] : sources,
      source_type:
        explicitReferenceUnverified || articles.length === 0 ? "safety" : "rag",
      confidence: "low",
      followups: explicitReferenceUnverified
        ? undefined
        : buildFollowups(retrievalQuery, displayedEvidenceArticles),
      citations: explicitReferenceUnverified
        ? []
        : buildStructuredCitations(displayedEvidenceArticles),
      relatedLaws: explicitReferenceUnverified
        ? []
        : suggestRelatedLaws(retrievalQuery, displayedEvidenceArticles),
      digDeeperLinks: explicitReferenceUnverified
        ? []
        : suggestDigDeeperLinks(retrievalQuery, displayedEvidenceArticles),
      scopeWarnings: explicitReferenceUnverified
        ? ["指定条文を検証済み収録正本から一意に特定できません。"]
        : undefined,
      notices: explicitReferenceUnverified ? undefined : relatedNotices,
      attachedNotices:
        fallbackAttached.notices.length > 0
          ? fallbackAttached.notices
          : undefined,
      attachedLeaflets:
        fallbackAttached.leaflets.length > 0
          ? fallbackAttached.leaflets
          : undefined,
    });
    if (key) {
      setCachedResponse(key, fallbackPayload);
    }
    return NextResponse.json<ChatbotResponse>(fallbackPayload, {
      status: 200,
      headers: {
        "X-Cache-Hit": "false",
        "X-Citation-Layer2-Status": "evidence-only",
        "X-AI-Used": "false",
      },
    });
  }

  // RAG: 関連条文の検索（スコア付き）
  const { articles: allRelevant, normalizedScore, hadPins } = searchRelevantArticlesWithScore(retrievalQuery, 10, lawCategory);
  // FT-D4 全文フォールバック: 条番号を直指定していて curated に無い条は、全文層から
  // サーバー側で1条だけ読んで文脈注入する（RAG の検索母集団＝curated は不変・全文の
  // BM25 投入はしない）。条番号を直指定しない通常質問では 1 件も発火しない。
  const fulltextArticles = await resolveFulltextRagArticles(retrievalQuery, lawCategory, allRelevant);
  // MLIT資料の関連検索（所管省庁資料の追加コンテキスト）
  const mlitMatches = searchMlitResources(retrievalQuery, 3);

  // 信頼度が 0.5 未満の条文は無関係とみなして除外。
  // 閾値を 0.7 → 0.5 に引き下げた背景: RAG コーパスを安衛法・安衛則・特化則・
  // 有機則の主要条文まで拡充したことで、部分マッチでも十分に正答に寄与する条文が
  // 当たるようになったため（「6問テストで正解率を上げる」導線）。
  const CONFIDENCE_THRESHOLD = 0.5;
  const curatedRelevant = normalizedScore >= CONFIDENCE_THRESHOLD ? allRelevant : [];
  // 全文フォールバック条（明示条番号の確定ソース）は PIN と同型で先頭へ差し込む
  // ＝curated の順位・母集団は変えず、直指定条だけを追加する。
  const relevantArticles = expandVerifiedLegalEvidenceArticles(
    retrievalQuery,
    fulltextArticles.length > 0
      ? [
          ...fulltextArticles,
          ...curatedRelevant.filter(
            (a) => !fulltextArticles.some((f) => f.law === a.law && f.articleNum === a.articleNum),
          ),
        ].slice(0, 12)
      : curatedRelevant,
  );
  const exactEvidence = buildExactLegalEvidenceAnswer(
    retrievalQuery,
    relevantArticles,
    legalAnswerNow,
  );
  if (hasExplicitLawArticleReference(retrievalQuery) && exactEvidence === null) {
    return NextResponse.json<ChatbotResponse>(finalizeLegalResponse({
      requiresHumanReview: true,
      answer: ensureLegalAnswerAsOf(
        buildServiceFirstUnverifiedReferenceAnswer(
          retrievalQuery,
          legalAnswerNow,
        ),
        legalAnswerNow,
      ),
      sources: [],
      source_type: "safety",
      confidence: "low",
      citations: [],
      relatedLaws: [],
      digDeeperLinks: [],
      scopeWarnings: ["指定条文を検証済み収録正本から一意に特定できません。"],
    }));
  }
  const context = buildContextFromArticles(relevantArticles);

  const hasRagHits = relevantArticles.length > 0;
  const source_type: "rag" | "safety" = hasRagHits ? "rag" : "safety";
  // 全文フォールバックが刺さった場合は明示条番号の確定ソースのため、PIN と同様に信頼度を
  // 最低 0.7 まで底上げする（curated スコアが低くても「関連条文なし」扱いにしない）。
  const scoreForConfidence =
    fulltextArticles.length > 0 ? Math.max(normalizedScore, 0.7) : normalizedScore;
  // 信頼度判定の精度を向上：
  // - high  : スコア>=0.75 かつ 上位2件以上ヒット（複数条文が裏付け）
  // - medium: それ以外でRAGヒットあり
  // - low   : RAGヒットなし
  const confidence: "high" | "medium" | "low" = hasRagHits
    ? (scoreForConfidence >= 0.75 && relevantArticles.length >= 2) ? "high" : "medium"
    : "low";

  // P1-5: 直接ヒット無しでも「該当無し」で突き放さず、低スコアの関連条文＋一般原則＋
  // 公式誘導を返す。stream route と同じ buildNoHitTemplate を使い挙動を揃える。
  if (!hasRagHits) {
    // T9: normalizedScore は先頭ヒットのスコアなので、これが下限未満ならslice内の
    // 全件がノイズ（診断04 Q21「明日の東京の天気」→港湾労働法第2条 の誤提示事例）。
    // 2026-07-11 E3/GQ51: ドメイン外シグナルつきクエリ（車検等）では、低スコアの
    // 「関連する可能性のある条文」自体が偶発ヒットのノイズ（騒音規制法16条等）なので
    // 一切提示しない（クリーンなno-hit＝確定申告と同じ誠実な範囲外対応にする）。
    const relatedForNoHit =
      normalizedScore >= NO_HIT_NOISE_FLOOR && !hasOutOfDomainSignal(retrievalQuery)
        ? allRelevant.slice(0, 8)
        : [];
    const partialMatches = searchPartialMatches(retrievalQuery);
    const noHitAnswer = buildServiceFirstNoHitAnswer(
      retrievalQuery,
      legalAnswerNow,
    );
    const noHitSources: ChatbotSource[] = [
      ...relatedForNoHit.map((article) =>
        lawArticleToSource(article, retrievalQuery, legalAnswerNow),
      ),
      ...mlitMatches.map(mlitToSource),
    ];
    const scopeWarningMsg =
      partialMatches.length > 0
        ? `直接規定する条文は特定できませんでしたが、関連条文・関連分野（${partialMatches.length}件）と一般原則をご案内しました。確定情報は公式でご確認ください。`
        : "直接規定する条文は特定できませんでした。関連条文と一般原則をご案内しています。確定情報は e-Gov・厚生労働省・所轄労働基準監督署でご確認ください。";
    const noHitAttached = attachNoticesAndLeaflets({
      articles: relatedForNoHit,
      answer: noHitAnswer,
      query: retrievalQuery,
    });

    return NextResponse.json<ChatbotResponse>(
      finalizeLegalResponse({
        requiresHumanReview: true,
        answer: ensureLegalAnswerAsOf(noHitAnswer, legalAnswerNow),
        sources: noHitSources,
        source_type: relatedForNoHit.length > 0 ? "rag" : "safety",
        confidence: "low",
        followups: [
          { label: "🔁 別の言い方で質問", prompt: `${message}（別の言い方で再度質問させてください。法令名や条文番号を含めた言い方で教えてください）` },
          { label: "📚 関連する法令を調べる", prompt: `${message} に関連する労働安全衛生法令にはどのようなものがありますか？` },
        ],
        notices: relatedNotices,
        citations: relatedForNoHit.length > 0 ? buildStructuredCitations(relatedForNoHit) : [],
        relatedLaws: suggestRelatedLaws(retrievalQuery, relatedForNoHit),
        digDeeperLinks: suggestDigDeeperLinks(retrievalQuery, relatedForNoHit),
        scopeWarnings: [scopeWarningMsg],
        attachedNotices:
          noHitAttached.notices.length > 0
            ? noHitAttached.notices
            : undefined,
        attachedLeaflets:
          noHitAttached.leaflets.length > 0
            ? noHitAttached.leaflets
            : undefined,
      }),
      { status: 200 }
    );
  }

  // Phase 2 Layer 1: RAG ヒット articles からホワイトリストを構築
  const allowedCitations = buildAllowedCitations(relevantArticles);
  // Phase 2 Layer 3: fallback tier 判定
  const fallbackDecision = buildFallbackDecision({
    query: retrievalQuery,
    normalizedScore,
    articles: relevantArticles,
    hadPins,
  });

  // Gemini Flash API呼び出し（多ターン会話対応） — 失敗時は RAG ヒットを degraded 回答として返す
  // Phase 2 D6 段階的対応: Pattern A 検出時は最大1回まで retry
  let answer: string = "";
  let citationLayer2Status:
    | "skipped"
    | "passed"
    | "warned"
    | "retried"
    | "evidence-only" = "skipped";
  // Layer 2 の警告は answer 本文へ追記せず scopeWarnings（UIの警告枠）で返す
  // （ごちゃごちゃブロック根絶 2026-07-11: 本文=回答、警告・出典=構造化フィールドに分離）
  let citationWarningNote = "";
  const safeCitationFallback = () =>
    buildServiceFirstLegalAnswer({
      query: retrievalQuery,
      articles: relevantArticles,
      now: legalAnswerNow,
    });
  try {
    const callGemini = async () => {
      return await withCircuitBreaker(
        "gemini",
        async () => {
          const genAI = new GoogleGenAI({
            apiKey,
            httpOptions: { timeout: GENERATIVE_REQUEST_TIMEOUT_MS },
          });
          // Phase 2 Layer 1: ホワイトリスト同梱プロンプト
          const userPrompt = buildPromptWithWhitelist({
            question: retrievalQuery,
            context,
            mlitContext: buildMlitContext(mlitMatches),
            allowed: allowedCitations,
          });
          // Prior turns are reduced to allowlisted work conditions in
          // retrievalQuery; raw conversation text is never forwarded.
          const result = await genAI.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: userPrompt,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              abortSignal: request.signal,
            },
          });
          // SYSTEM_PROMPTのフォーマット例「YYYY年MM月」等をGeminiがテンプレートのまま
          // 出力してしまう事故を防ぐ（本番実測で1問中3箇所の漏出を確認）
          return sanitizePlaceholderCitations(result.text ?? "");
        },
        { failureThreshold: 4, cooldownMs: 60_000 }
      );
    };

    const generatedCandidate = await callGemini();
    // 条文番号のallowlist照合だけでは、生成文の各主張が引用本文に支持されることを
    // 証明できない。候補本文は利用者へ返さず、承認済みコーパスから組み立てた
    // evidence-only案内へfail-closedする。
    const validation = validateCitations(generatedCandidate, allowedCitations);
    answer = safeCitationFallback();
    citationWarningNote =
      validation.findings.length > 0
        ? validation.warningNote
        : "生成本文は条文番号の形式検査を通過しましたが、主張単位の引用支持を自動証明できないため表示していません。公式条文と構造化出典を確認してください。";
    citationLayer2Status = "evidence-only";
  } catch (err) {
    // 外部サービスの例外本文には入力断片が含まれる可能性があるため、生値は記録しない。
    console.error("[chatbot] Gemini API error", {
      kind: err instanceof Error ? err.name : "unknown",
    });
    const lower = err instanceof Error ? err.message.toLowerCase() : "";
    let reasonLabel = "AIサービスへの接続に失敗しました";
    if (err instanceof CircuitOpenError) reasonLabel = "AIサービスが連続失敗中（自動復旧待ち）";
    else if (lower.includes("quota") || lower.includes("429")) reasonLabel = "AIサービスの利用制限に達しました";
    else if (lower.includes("timeout")) reasonLabel = "AIサービスの応答がタイムアウトしました";

    void reasonLabel;
    const degradedAnswer = buildServiceFirstLegalAnswer({
      query: retrievalQuery,
      articles: relevantArticles,
      now: legalAnswerNow,
    });

    const degradedSources: ChatbotSource[] = [
      ...relevantArticles.map((article: LawArticle) =>
        lawArticleToSource(article, retrievalQuery, legalAnswerNow),
      ),
      ...mlitMatches.map(mlitToSource),
    ];
    const datedDegradedAnswer = ensureLegalAnswerAsOf(
      degradedAnswer,
      legalAnswerNow,
    );
    const degradedAttached = attachNoticesAndLeaflets({
      articles: relevantArticles,
      answer: datedDegradedAnswer,
      query: retrievalQuery,
    });

    return NextResponse.json<ChatbotResponse>(
      finalizeLegalResponse({
        requiresHumanReview: true,
        answer: datedDegradedAnswer,
        sources: degradedSources,
        source_type: "rag",
        confidence: "medium",
        followups: buildFollowups(retrievalQuery, relevantArticles),
        notices: relatedNotices,
        attachedNotices:
          degradedAttached.notices.length > 0
            ? degradedAttached.notices
            : undefined,
        attachedLeaflets:
          degradedAttached.leaflets.length > 0
            ? degradedAttached.leaflets
            : undefined,
      }),
      { status: 200 }
    );
  }

  // ごちゃごちゃブロック根絶（2026-07-11）: 出典・通達・リーフレット・関連法令は
  // answer 本文へテキスト追記せず、構造化フィールド（citations / attachedNotices /
  // attachedLeaflets / relatedLaws）のみで返す。UI が折りたたみカードで表示するため
  // 本文追記は完全な二重表示だった。モデルが自前で書いた免責・出典風テールも除去する。
  answer = stripAnswerTailBlocks(answer);

  // 構造化された出典・関連法令・もっと深く知る動線を計算
  const structuredCitations = buildStructuredCitations(relevantArticles);
  const relatedLaws = suggestRelatedLaws(retrievalQuery, relevantArticles);
  const digDeeperLinks = suggestDigDeeperLinks(retrievalQuery, relevantArticles);

  // Phase 4: 通達・リーフレットの自動添付（Layer A 条文紐付け + Layer B 応答引用 + Layer C クエリ）
  const attached = attachNoticesAndLeaflets({
    articles: relevantArticles,
    answer,
    query: retrievalQuery,
  });

  // Phase 2 Layer 3: adjacent tier では「直接答える条文は限定的」の見出しを冒頭に挿入
  if (fallbackDecision.tier === "adjacent" && fallbackDecision.headline) {
    answer = `${fallbackDecision.headline}\n\n${answer}`;
    if (fallbackDecision.egovFooter) {
      answer += `\n\n${fallbackDecision.egovFooter}`;
    }
  }

  // sourcesを整形（質問に該当するスニペットも生成）
  const sources: ChatbotSource[] = [
    ...relevantArticles.map((article: LawArticle) =>
      lawArticleToSource(article, retrievalQuery, legalAnswerNow),
    ),
    ...mlitMatches.map(mlitToSource),
  ];

  // ハルシネーション抑制: 範囲外法令名 + 過剰な推測表現を検出して警告
  // （警告は answer 本文へ追記せず scopeWarnings で返す＝UIの警告枠が表示する）
  const scopeWarnings: string[] = [];
  if (citationWarningNote) {
    scopeWarnings.push(citationWarningNote.trim());
  }
  // 短縮名に加えて正式名称も渡す: 50法令レジストリ外の収録法令
  // （労働施策総合推進法・過労死防止法等）の正当な引用が範囲外扱いされない
  const hitLawNames = relevantArticles.flatMap((a: LawArticle) => [a.lawShort, a.law]);
  const outOfScopeRefs = detectOutOfScopeLawReferences(answer, hitLawNames);
  if (outOfScopeRefs.length > 0) {
    const sample = outOfScopeRefs.slice(0, 3).join("、");
    scopeWarnings.push(
      `回答中の参照「${sample}」は提供データ（${LAW_SOURCE_COUNT}法令等＋通達DB）の範囲外のため、内容の確からしさは保証できません。e-Gov法令検索および厚生労働省公式情報で必ずご確認ください。`
    );
  }
  // 既存の架空法令検出も維持（後方互換）
  const suspectPattern = /通達第\d+条|関連通達|指針第\d+条/;
  if (suspectPattern.test(answer)) {
    const knownLawNames = new Set(relevantArticles.map((a: LawArticle) => a.law));
    const suspectMatches = answer.match(/「[^」]*通達[^」]*」|[^\s。、]*通達第\d+条[^\s。、]*/g) ?? [];
    const unverified = suspectMatches.filter(
      (m) => !Array.from(knownLawNames).some((law) => m.includes(law))
    );
    if (unverified.length > 0) {
      scopeWarnings.push(
        `回答中の一部法令名・条文（例：${unverified.slice(0, 2).join("、")}）は提供条文データでは確認できませんでした。e-Gov法令検索でご確認ください。`
      );
    }
  }
  // 推測表現が連発している場合の追加注記
  if (detectUngroundedAssertions(answer)) {
    scopeWarnings.push(
      "回答に推測表現が複数含まれます。法的判断には e-Gov 法令検索および専門家への相談を推奨します。"
    );
  }

  // Phase 2 Layer 2 が警告を出した場合は信頼度を1段階降格
  let finalConfidence = confidence;
  if (citationLayer2Status === "evidence-only") {
    finalConfidence = "low";
    scopeWarnings.push(
      "生成本文は主張単位の引用支持を自動証明できないため非表示とし、確認用の根拠案内だけを表示しています。"
    );
  }

  // Phase 2 Layer 3 が adjacent と判定した場合も信頼度を降格
  if (fallbackDecision.tier === "adjacent" && finalConfidence === "high") {
    finalConfidence = "medium";
  }

  answer = ensureLegalAnswerAsOf(answer, legalAnswerNow);
  const responsePayload = finalizeLegalResponse({
    requiresHumanReview: true,
    answer,
    sources,
    source_type,
    confidence: finalConfidence,
    followups: buildFollowups(retrievalQuery, relevantArticles),
    notices: relatedNotices,
    citations: structuredCitations,
    relatedLaws,
    digDeeperLinks,
    scopeWarnings: scopeWarnings.length > 0 ? scopeWarnings : undefined,
    attachedNotices: attached.notices.length > 0 ? attached.notices : undefined,
    attachedLeaflets: attached.leaflets.length > 0 ? attached.leaflets : undefined,
  });
  if (key && citationLayer2Status === "evidence-only") {
    setCachedResponse(key, responsePayload);
  }
  return NextResponse.json<ChatbotResponse>(responsePayload, {
    status: 200,
    headers: {
      "X-Cache-Hit": "false",
      "X-Citation-Layer1-Status": allowedCitations.length > 0 ? "applied" : "empty",
      "X-Citation-Layer2-Status": citationLayer2Status,
      "X-Citation-Layer3-Tier": fallbackDecision.tier,
      "X-Notice-Layer4-Count": String(attached.notices.length),
      "X-Leaflet-Layer4-Count": String(attached.leaflets.length),
    },
  });
}
