/**
 * P0-001 (usability-audit-day2-2026-05-24):
 * 安衛法AIチャットの SSE ストリーミング応答エンドポイント。
 *
 * 既存の /api/chatbot/route.ts (full JSON 応答) はそのまま残し、
 * stream モードのみここで提供する。フロントの ChatbotPanel は
 * ストリーミング応答を提供する。接続後の失敗をclientが自動再POSTすると
 * 二重処理になり得るため、再試行は利用者の明示操作に限定する。
 * 形にして互換性を保つ。
 *
 * SSE イベント:
 *   - event: progress  → { step, message }     (RAG検索/AI生成中の進捗)
 *   - event: text      → { chunk: "..." }      (検証完了後の確定本文)
 *   - event: meta      → ChatbotResponse 形    (完了時の sources/notices/...)
 *   - event: error     → { message, retryable }
 *
 * Phase 2 ハルシネーション3層との整合:
 * - Layer 1 (ホワイトリスト同梱プロンプト): buildPromptWithWhitelist を使用
 * - Layer 2 (条文番号検証): full answer 確定後に validateCitations を実施し、
 *   検証が終わるまで本文をクライアントへ送らない。
 * - Layer 3 (fallback decision): 既存 buildFallbackDecision を使用
 * Phase 4 (通達・リーフレット添付): attachNoticesAndLeaflets を完成後に呼ぶ。
 */

import { GoogleGenAI } from "@google/genai";
import { GEMINI_FLASH_MODEL } from "@/lib/gemini-model";
import { externalGenerativeAiAllowed } from "@/lib/server/deployment-safety";
import {
  searchRelevantArticlesWithScore,
  buildContextFromArticles,
  type LawCategoryFilter,
} from "@/lib/rag-search";
import { searchRelevantNotices } from "@/lib/notice-search";
import { searchMlitResources } from "@/data/mlit-resources";
import { VERIFIED_LEGAL_SOURCE_VERSION } from "@/data/laws/verified-corpus";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import {
  buildStructuredCitations,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
  sanitizePlaceholderCitations,
} from "@/lib/chatbot-enrichment";
import { stripAnswerTailBlocks } from "@/lib/chatbot-answer-format";
import {
  buildAllowedCitations,
  buildPromptWithWhitelist,
} from "@/lib/chatbot-prompt-builder";
import { validateCitations } from "@/lib/chatbot-citation-validator";
import { buildFallbackDecision } from "@/lib/chatbot-fallback-logic";
import { attachNoticesAndLeaflets } from "@/lib/chatbot-notice-attachment";
import { cacheKey, getCachedResponse, setCachedResponse } from "@/lib/chatbot-cache";
import {
  buildNoHitGeminiPrompt,
  formatOfficialLinks,
  NO_HIT_NOISE_FLOOR,
} from "@/lib/chatbot-no-hit-response";
import { getClientIp, checkRateLimit, rateLimitMessage } from "@/lib/chatbot-rate-limit";
import { hasOutOfDomainSignal } from "@/lib/rag/out-of-domain";
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
import type { LawArticle } from "@/data/laws";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import { inspectAiOutbound } from "@/lib/server/ai-outbound-safety";
import { validateChatbotRequestBoundary } from "@/lib/server/chatbot-request-boundary";
import {
  nextLegalClarification,
  normalizeLegalConversationText,
  resolveLegalConversationQuery,
} from "@/lib/legal-conversation-context";
import {
  hasPublicLegalConversationContext,
  rehydratePublicLegalConversationContext,
} from "@/lib/legal-conversation-public-context";
import {
  buildServiceFirstLegalAnswer,
  buildServiceFirstNoHitAnswer,
  buildServiceFirstUnverifiedReferenceAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
} from "@/lib/legal-extractive-answer";
import {
  type ChatbotRequest,
  type ChatbotResponse,
  type ChatbotResponseDraft,
  type ChatbotSource,
  type ChatTurn,
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

const encoder = new TextEncoder();
const GENERATIVE_REQUEST_TIMEOUT_MS = 25_000;

function sseFrame(event: string, data: unknown): Uint8Array {
  // SSE は data 行を JSON 1 行で送る。改行を含む payload は data: で複数行
  // 書く必要があるが、JSON.stringify した結果に改行は含まれないので 1 行で OK。
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return encoder.encode(payload);
}

function immediateSseResponse(payload: ChatbotResponse): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sseFrame("text", { chunk: payload.answer }));
        controller.enqueue(sseFrame("meta", payload));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "X-AI-Used": "false",
      },
    },
  );
}

export async function POST(request: Request) {
  const requestBoundary = validateChatbotRequestBoundary(request);
  if (!requestBoundary.allowed) {
    return new Response(
      JSON.stringify({
        error: requestBoundary.message,
        retryable: false,
      }),
      {
        status: requestBoundary.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let body: ChatbotRequest | null = null;
  try {
    body = (await request.json()) as ChatbotRequest;
  } catch {
    // SSE エンドポイントだが、入力エラーは即時 JSON で返す。
    return new Response(
      JSON.stringify({ error: "リクエストボディのJSON形式が不正です。", retryable: false }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return new Response(
      JSON.stringify({ error: "質問文を入力してください。", retryable: false }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
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
    purpose: "chatbot-stream",
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
    return immediateSseResponse(safetyPayload);
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
    return new Response(
      JSON.stringify({ error: "質問または会話履歴が長すぎます。", retryable: false }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!outboundSafety.allowed) {
    return new Response(
      JSON.stringify({ error: outboundSafety.message, retryable: false }),
      { status: outboundSafety.status, headers: { "Content-Type": "application/json" } },
    );
  }

  const resolvedConversation = resolveLegalConversationQuery({
    message,
    history: Array.isArray(body.history) ? body.history : undefined,
    context: rehydratePublicLegalConversationContext(body.context),
  });

  if (hasFutureLegalPremise(message, legalAnswerNow)) {
    const payload = finalizeChatbotResponse({
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
    });
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(sseFrame("text", { chunk: payload.answer }));
          controller.enqueue(sseFrame("meta", payload));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (safetyPayload) {
    return immediateSseResponse(
      finalizeChatbotResponse({
        ...safetyPayload,
        context: resolvedConversation.context,
      }),
    );
  }

  if (
    needsPriorConversationContext(
      message,
      (Array.isArray(body.history) && body.history.length > 0) ||
        hasPublicLegalConversationContext(body.context),
    )
  ) {
    const payload = finalizeChatbotResponse({
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
    });
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(sseFrame("text", { chunk: payload.answer }));
          controller.enqueue(sseFrame("meta", payload));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const retrievalQuery = resolvedConversation.query;
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

  // P2-5: 簡易IPレート制限（濫用防止）。到達時は公式DB誘導を返す。
  let rate;
  try {
    rate = await checkRateLimit(getClientIp(request));
  } catch {
    return new Response(
      JSON.stringify({
        error:
          "混雑防止機能を確認できないため、現在この回答機能を停止しています。公式情報をご確認ください。",
        retryable: true,
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: rateLimitMessage(rate.retryAfterSec), retryable: false }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const lawCategory: LawCategoryFilter = body?.lawCategory ?? "all";
  const apiKey = externalGenerativeAiAllowed()
    ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    : null;

  // P1-1 (chatbot-deep-audit 2026-05-26): stream 経路でもレスポンスキャッシュを使う。
  // 履歴付きリクエストは直前ターンの文脈が回答に影響するため bypass（非stream route と同条件）。
  const cacheableRequest = !body?.history || body.history.length === 0;
  const cKey = cacheableRequest
    ? cacheKey(
        retrievalQuery,
        lawCategory,
        legalAnswerNow,
        VERIFIED_LEGAL_SOURCE_VERSION,
      )
    : null;

  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!cancelled) controller.enqueue(sseFrame(event, data));
      };

      try {
        // キャッシュヒット時は Gemini を呼ばず、確定済み応答を擬似ストリームで再生する
        if (cKey) {
          const cached = getCachedResponse<ChatbotResponse>(cKey);
          if (cached) {
            const cachedAnswer = ensureLegalAnswerAsOf(
              cached.answer,
              legalAnswerNow,
            );
            const cachedAttached = attachNoticesAndLeaflets({
              articles: [],
              answer: cachedAnswer,
              query: retrievalQuery,
            });
            const cachedPayload = finalizeLegalResponse({
              ...cached,
              answer: cachedAnswer,
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
            });
            send("text", { chunk: cachedPayload.answer });
            send("meta", cachedPayload);
            controller.close();
            return;
          }
        }

        send("progress", { step: "rag", message: "関連条文を検索しています…" });

        // RAG 検索 (関数引数の型ガード上 message は trim 済の string)
        const { articles: allRelevant, normalizedScore, hadPins } =
          searchRelevantArticlesWithScore(retrievalQuery, 10, lawCategory);
        // FT-D4 全文フォールバック: 条番号直指定で curated に無い条は全文層から1条だけ
        // 文脈注入（RAG 母集団＝curated は不変・全文の BM25 投入なし）。条番号を直指定しない
        // 通常質問では発火しない。
        const fulltextArticles = await resolveFulltextRagArticles(retrievalQuery, lawCategory, allRelevant);
        const mlitMatches = searchMlitResources(retrievalQuery, 3);
        const relatedNotices = searchRelevantNotices(retrievalQuery, 3);
        const CONFIDENCE_THRESHOLD = 0.5;
        const hasDirectHit =
          normalizedScore >= CONFIDENCE_THRESHOLD && allRelevant.length > 0;
        // P1-5: 直接ヒットが無くても低スコアの関連条文を「参考」として根拠提示に使う。
        // 「該当条文無し」で突き放さず、関連条文＋一般原則＋公式誘導を返す。
        // 全文フォールバック条が刺さった場合は「確定条」なので no-hit モードにしない。
        const noHitMode = !hasDirectHit && fulltextArticles.length === 0;
        // T9: no-hit時は normalizedScore が下限未満ならslice内の全件がノイズ
        // （診断04 Q21「明日の東京の天気」→港湾労働法第2条 の誤提示事例）。
        // 2026-07-11 E3/GQ51: ドメイン外シグナルつきクエリ（車検等）は関連条文の
        // 提示自体が偶発ヒットのノイズのため一切出さない（route.ts と同一の判定）。
        const curatedRelevant = hasDirectHit
          ? allRelevant
          : normalizedScore >= NO_HIT_NOISE_FLOOR && !hasOutOfDomainSignal(retrievalQuery)
            ? allRelevant.slice(0, 8)
            : [];
        // 全文フォールバック条は PIN と同型で先頭へ差し込む（curated の順位・母集団は不変）。
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
        const context = buildContextFromArticles(relevantArticles);
        // 全文フォールバックが刺さった場合は明示条番号の確定ソースのため信頼度を底上げ。
        const scoreForConfidence =
          fulltextArticles.length > 0 ? Math.max(normalizedScore, 0.7) : normalizedScore;
        const generationUnavailable =
          !GENERATIVE_LEGAL_ANSWERS_ENABLED ||
          !apiKey ||
          apiKey === "dummy";

        const buildSourceList = (): ChatbotSource[] => [
          ...relevantArticles.map((article: LawArticle) =>
            lawArticleToSource(article, retrievalQuery, legalAnswerNow),
          ),
          ...mlitMatches.map(mlitToSource),
        ];

        // P1-5: API無し、または根拠となる関連条文が皆無 → 決定的テンプレ
        // （関連条文＋関連分野＋一般原則＋公式誘導。推測の断定は一切含めない）
        if (generationUnavailable || relevantArticles.length === 0) {
          const exactEvidence = buildExactLegalEvidenceAnswer(
            retrievalQuery,
            relevantArticles,
            legalAnswerNow,
          );
          const explicitReferenceUnverified =
            hasExplicitLawArticleReference(retrievalQuery) && exactEvidence === null;
          // Keep the exact citation first, while retaining verified surrounding
          // provisions required for a substantive cross-hierarchy answer.
          const evidenceArticles = [
            ...(exactEvidence?.articles ?? []),
            ...relevantArticles.filter(
              (candidate) =>
                !exactEvidence?.articles.some(
                  (exact) =>
                    exact.law === candidate.law &&
                    exact.articleNum === candidate.articleNum,
                ),
            ),
          ].slice(0, 12);
          const initialTemplate =
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
            : citedLegalAnswerArticles(initialTemplate, evidenceArticles);
          const template =
            !explicitReferenceUnverified && displayedEvidenceArticles.length > 0
              ? buildServiceFirstLegalAnswer({
                  query: retrievalQuery,
                  articles: displayedEvidenceArticles,
                  now: legalAnswerNow,
                })
              : initialTemplate;
          const answer = ensureLegalAnswerAsOf(
            template,
            legalAnswerNow,
          );
          const fallbackAttached = explicitReferenceUnverified
            ? { notices: [], leaflets: [] }
            : attachNoticesAndLeaflets({
                articles: displayedEvidenceArticles,
                answer,
                query: retrievalQuery,
              });
          const fallbackPayload = finalizeLegalResponse({
            requiresHumanReview: true,
            answer,
            // 生成停止中はhash検証済み法令本文だけを返す。MLIT資料や
            // 通達・指針を、同じ検証状態であるかのように混在させない。
            sources: explicitReferenceUnverified
              ? []
              : generationUnavailable
              ? displayedEvidenceArticles.map((article: LawArticle) =>
                  lawArticleToSource(article, retrievalQuery, legalAnswerNow),
                )
              : buildSourceList(),
            source_type: explicitReferenceUnverified
              ? "safety"
              : generationUnavailable
              ? relevantArticles.length > 0
                ? "rag"
                : "safety"
              : relevantArticles.length > 0
                ? "rag"
                : "safety",
            confidence: "low",
            followups: explicitReferenceUnverified
              ? undefined
              : buildFollowups(retrievalQuery, displayedEvidenceArticles),
            notices: explicitReferenceUnverified ? undefined : relatedNotices,
            citations:
              explicitReferenceUnverified
                ? []
                : displayedEvidenceArticles.length > 0
                  ? buildStructuredCitations(displayedEvidenceArticles)
                  : [],
            relatedLaws: explicitReferenceUnverified
              ? []
                : suggestRelatedLaws(retrievalQuery, displayedEvidenceArticles),
            digDeeperLinks: explicitReferenceUnverified
              ? []
                : suggestDigDeeperLinks(retrievalQuery, displayedEvidenceArticles),
            scopeWarnings: explicitReferenceUnverified
              ? ["指定条文を検証済み収録正本から一意に特定できません。"]
              : undefined,
            attachedNotices:
              fallbackAttached.notices.length > 0
                ? fallbackAttached.notices
                : undefined,
            attachedLeaflets:
              fallbackAttached.leaflets.length > 0
                ? fallbackAttached.leaflets
                : undefined,
          });
          send("text", { chunk: fallbackPayload.answer });
          send("meta", fallbackPayload);
          controller.close();
          return;
        }

        // Phase 2 Layer 1: ホワイトリスト同梱プロンプト
        const allowedCitations = buildAllowedCitations(relevantArticles);
        const fallbackDecision = buildFallbackDecision({
          query: retrievalQuery,
          normalizedScore,
          articles: relevantArticles,
          hadPins,
        });

        send("progress", { step: "ai", message: "AIが回答を生成しています…" });

        // Gemini streaming
        let answer = "";
        let citationLayer2Status:
          | "skipped"
          | "passed"
          | "warned"
          | "evidence-only" = "skipped";
        let citationWarningNote = "";
        try {
          await withCircuitBreaker(
            "gemini",
            async () => {
              const genAI = new GoogleGenAI({
                apiKey,
                httpOptions: { timeout: GENERATIVE_REQUEST_TIMEOUT_MS },
              });
              // P1-5: 直接ヒット無しモードでは「関連＋最低限措置＋公式誘導」を根拠付きで生成
              const userPrompt = noHitMode
                ? buildNoHitGeminiPrompt({
                    question: retrievalQuery,
                    context,
                    allowed: allowedCitations,
                  })
                : buildPromptWithWhitelist({
                    question: retrievalQuery,
                    context,
                    mlitContext: buildMlitContext(mlitMatches),
                    allowed: allowedCitations,
                  });
              // Prior turns are reduced to allowlisted work conditions in
              // retrievalQuery; raw conversation text is never forwarded.
              const streamResult = await genAI.models.generateContentStream({
                model: GEMINI_FLASH_MODEL,
                contents: userPrompt,
                config: {
                  systemInstruction: SYSTEM_PROMPT,
                  abortSignal: request.signal,
                },
              });
              for await (const chunkResponse of streamResult) {
                if (cancelled || request.signal.aborted) {
                  throw new DOMException("Request aborted", "AbortError");
                }
                const chunkText = chunkResponse.text;
                if (chunkText) {
                  answer += chunkText;
                }
              }
              return answer;
            },
            { failureThreshold: 4, cooldownMs: 60_000 },
          );

          // Phase 2 Layer 2: 応答完了後の条文番号検証 (retry は SSE では行わず警告のみ)
          // 警告は answer 本文へ追記せず scopeWarnings（UIの警告枠）で返す（2026-07-11）
          const validation = validateCitations(answer, allowedCitations);
          citationWarningNote =
            validation.findings.length > 0
              ? validation.warningNote
              : "生成本文は条文番号の形式検査を通過しましたが、主張単位の引用支持を自動証明できないため表示していません。公式条文と構造化出典を確認してください。";
          citationLayer2Status = "evidence-only";
          answer = buildServiceFirstLegalAnswer({
            query: retrievalQuery,
            articles: relevantArticles,
            now: legalAnswerNow,
          });
        } catch (err) {
          if (cancelled || request.signal.aborted) return;
          const lower = err instanceof Error ? err.message.toLowerCase() : "";
          let reasonLabel = "AIサービスへの接続に失敗しました";
          if (err instanceof CircuitOpenError) reasonLabel = "AIサービスが連続失敗中（自動復旧待ち）";
          else if (lower.includes("quota") || lower.includes("429")) reasonLabel = "AIサービスの利用制限に達しました";
          else if (lower.includes("timeout")) reasonLabel = "AIサービスの応答がタイムアウトしました";

          const degradedAnswer = buildServiceFirstLegalAnswer({
            query: retrievalQuery,
            articles: relevantArticles,
            now: legalAnswerNow,
          });
          const datedDegradedAnswer = ensureLegalAnswerAsOf(
            degradedAnswer,
            legalAnswerNow,
          );
          const degradedAttached = attachNoticesAndLeaflets({
            articles: relevantArticles,
            answer: datedDegradedAnswer,
            query: retrievalQuery,
          });
          const degradedPayload = finalizeLegalResponse({
            requiresHumanReview: true,
            answer: datedDegradedAnswer,
            sources: relevantArticles.map((article: LawArticle) =>
              lawArticleToSource(article, retrievalQuery, legalAnswerNow),
            ),
            source_type: "rag",
            confidence: "low",
            notices: relatedNotices,
            citations: buildStructuredCitations(relevantArticles),
            relatedLaws: suggestRelatedLaws(retrievalQuery, relevantArticles),
            digDeeperLinks: suggestDigDeeperLinks(retrievalQuery, relevantArticles),
            scopeWarnings: [reasonLabel],
            attachedNotices:
              degradedAttached.notices.length > 0
                ? degradedAttached.notices
                : undefined,
            attachedLeaflets:
              degradedAttached.leaflets.length > 0
                ? degradedAttached.leaflets
                : undefined,
          });
          send("text", { chunk: degradedPayload.answer });
          send("meta", degradedPayload);
          controller.close();
          return;
        }

        // ごちゃごちゃブロック根絶（2026-07-11）: 出典・通達・リーフレット・関連法令は
        // answer 本文へテキスト追記せず、構造化フィールドのみで返す（UIが折りたたみ
        // カードで表示するため本文追記は二重表示だった）。モデルが自前で書いた
        // 免責・出典風テール、プレースホルダ（YYYY年MM月等）もここで除去する。
        answer = stripAnswerTailBlocks(sanitizePlaceholderCitations(answer));

        // Phase 2 Layer 3 (adjacent)
        if (fallbackDecision.tier === "adjacent" && fallbackDecision.headline) {
          const headlineChunk = `\n\n[補足] ${fallbackDecision.headline}`;
          answer += headlineChunk;
        }

        // 出典・通達・リーフレット（構造化フィールド）
        const structuredCitations = buildStructuredCitations(relevantArticles);
        const relatedLaws = suggestRelatedLaws(retrievalQuery, relevantArticles);
        const digDeeperLinks = suggestDigDeeperLinks(retrievalQuery, relevantArticles);
        const attached = attachNoticesAndLeaflets({
          articles: relevantArticles,
          answer,
          query: retrievalQuery,
        });

        // P1-5: 直接ヒット無しモードでは公式情報への誘導を必ず末尾に付与
        if (noHitMode) {
          const officialChunk = `\n${formatOfficialLinks()}`;
          answer += officialChunk;
        }

        // ハルシネーション抑制系の警告（本文へは追記せず scopeWarnings で返す）
        const scopeWarnings: string[] = [];
        if (citationWarningNote) {
          scopeWarnings.push(citationWarningNote.trim());
        }
        // 短縮名に加えて正式名称も渡す（50法令レジストリ外の収録法令の偽警告防止）
        const hitLawNames = relevantArticles.flatMap((a: LawArticle) => [a.lawShort, a.law]);
        const outOfScopeRefs = detectOutOfScopeLawReferences(answer, hitLawNames);
        if (outOfScopeRefs.length > 0) {
          const sample = outOfScopeRefs.slice(0, 3).join("、");
          scopeWarnings.push(
            `回答中の参照「${sample}」は本ツールの収録データ（条文・通達DB）の範囲外のため、内容の確からしさは保証できません。e-Gov法令検索および厚生労働省公式情報で必ずご確認ください。`,
          );
        }
        if (detectUngroundedAssertions(answer)) {
          scopeWarnings.push(
            "回答に推測表現が複数含まれます。法的判断には e-Gov 法令検索および専門家への相談を推奨します。",
          );
        }

        // 信頼度判定（no-hitモードは「参考」提示のため常に low）
        let finalConfidence: "high" | "medium" | "low" = noHitMode
          ? "low"
          : scoreForConfidence >= 0.75 && relevantArticles.length >= 2
            ? "high"
            : "medium";
        if (citationLayer2Status === "evidence-only") {
          finalConfidence = "low";
          scopeWarnings.push(
            "生成本文は主張単位の引用支持を自動証明できないため非表示とし、確認用の根拠案内だけを表示しています。",
          );
        }
        if (fallbackDecision.tier === "adjacent" && finalConfidence === "high") {
          finalConfidence = "medium";
        }

        const sources: ChatbotSource[] = [
          ...relevantArticles.map((article: LawArticle) =>
            lawArticleToSource(article, retrievalQuery, legalAnswerNow),
          ),
          ...mlitMatches.map(mlitToSource),
        ];

        answer = ensureLegalAnswerAsOf(answer, legalAnswerNow);
        const payload = finalizeLegalResponse({
          requiresHumanReview: true,
          answer,
          sources,
          source_type: "rag",
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
        // P1-1: 正常完了した応答のみキャッシュ（degraded/error path はキャッシュしない）。
        // 引用検証を通過した生成回答だけをキャッシュする。
        if (cKey && citationLayer2Status === "evidence-only") {
          setCachedResponse(cKey, payload);
        }
        send("text", { chunk: payload.answer });
        send("meta", payload);
        controller.close();
      } catch (_err) {
        if (cancelled || request.signal.aborted) return;
        send("error", {
          message: "回答を完了できませんでした。時間をおいて再試行してください。",
          retryable: true,
        });
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
      "X-AI-Used": "false",
    },
  });
}
