import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";
import { getLawRevisionById } from "@/data/mock/law-revisions";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import { buildStructuredCitations } from "@/lib/chatbot-enrichment";
import {
  finalizeChatbotResponse,
  legalAnswerAssumptions,
  type ChatbotResponse,
} from "@/lib/chatbot-contract";
import {
  buildServiceFirstLegalAnswer,
  buildServiceFirstNoHitAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
} from "@/lib/legal-extractive-answer";
import {
  buildFutureLegalHoldAnswer,
  ensureLegalAnswerAsOf,
  hasFutureLegalPremise,
  legalAnswerBasisNow,
} from "@/lib/legal-answer-temporal";
import {
  buildContextClarificationAnswer,
  needsPriorConversationContext,
} from "@/lib/legal-question-boundary";
import {
  nextLegalClarification,
  resolveLegalConversationQuery,
  sanitizeLegalConversationContext,
} from "@/lib/legal-conversation-context";
import { lawArticleToSource } from "@/lib/chatbot-route-shared";
import { inspectAiOutbound } from "@/lib/server/ai-outbound-safety";
import {
  resolveDiagnosticDelay,
  resolveDiagnosticError,
} from "@/lib/server/diagnostic-controls";
import type {
  ApiErrorResponse,
  ChatApiRequest,
  ChatApiResponse,
} from "@/lib/types/api";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";

const MAX_BODY_BYTES = 16_384;

function jsonError(
  status: number,
  code: ApiErrorResponse["error"]["code"],
  message: string,
) {
  return NextResponse.json<ApiErrorResponse>(
    { error: { code, message, retryable: status >= 500 } },
    {
      status,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
      },
    },
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeGuardedText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function jstDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function japaneseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

function isRevisionEffectiveDateQuestion(value: string): boolean {
  return /(?:施行日|施行はいつ|いつ施行|いつから|施行済み|施行され)/.test(value);
}

/**
 * 法改正一覧の互換経路。
 *
 * 条文番号が許可リスト内にあることだけでは、自由生成された主張が引用本文に
 * 支持されることを保証できない。この旧経路は外部AIを呼ばず、承認済み
 * サーバー法令コーパスの該当箇所と公式原文リンクだけを返す。
 */
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const delayMs = resolveDiagnosticDelay(requestUrl.searchParams.get("delayMs"));
  const forceError = resolveDiagnosticError(request);

  if (delayMs > 0) await wait(delayMs);
  if (forceError === "timeout") await wait(5_000);
  if (forceError === "5xx") {
    return jsonError(503, "UNAVAILABLE", "チャットAPIが一時的に利用できません。");
  }
  if (forceError === "validation") {
    return jsonError(400, "VALIDATION", "チャットの入力形式が不正です。");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError(413, "VALIDATION", "入力が長すぎます。必要な内容だけに短くしてください。");
  }

  let body: ChatApiRequest;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonError(413, "VALIDATION", "入力が長すぎます。必要な内容だけに短くしてください。");
    }
    body = JSON.parse(rawBody) as ChatApiRequest;
  } catch {
    return jsonError(400, "VALIDATION", "リクエストボディのJSON形式が不正です。");
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return jsonError(400, "VALIDATION", "質問文を入力してください。");
  }
  const revisionTitle =
    typeof body.revisionTitle === "string" && body.revisionTitle.trim()
      ? body.revisionTitle.trim()
      : "選択中の法改正";
  const history = Array.isArray(body.history)
    ? body.history
        .slice(-10)
        .filter(
          (turn): turn is { role: "user" | "assistant"; content: string } =>
            Boolean(
              turn &&
                (turn.role === "user" || turn.role === "assistant") &&
                typeof turn.content === "string" &&
                turn.content.length <= 4_000,
            ),
        )
        .map((turn) => ({
          role: turn.role,
          content: normalizeGuardedText(turn.content),
        }))
        .filter((turn) => turn.content.length > 0)
    : [];

  // RAG、キャッシュ、SDK、モデル、ログより前に必ず実行する。
  const safety = inspectAiOutbound({
    purpose: "law-revision-chat",
    texts: [
      revisionTitle,
      question,
      ...history
        .filter((turn) => turn.role === "user")
        .map((turn) => turn.content),
    ],
    consent: body.privacyConfirmed === true,
    maxChars: 4_000,
    contextPolicy: "approved-server-corpus",
  });
  if (!safety.allowed) {
    return jsonError(
      safety.status,
      "VALIDATION",
      safety.message,
    );
  }

  const safeQuestion = normalizeGuardedText(question);
  const revisionId =
    typeof body.revisionId === "string" ? normalizeGuardedText(body.revisionId) : "";
  // クライアント表示値を法的事実の根拠にはしない。IDが公開済みe-Gov
  // レコードと一致する場合は、サーバー側のタイトルと日付だけを会話文脈へ採用する。
  const selectedRevision = getLawRevisionById(revisionId);
  const resolvedConversation = resolveLegalConversationQuery({
    message: safeQuestion,
    history,
    context: body.context,
  });
  const legalAnswerNow = legalAnswerBasisNow();
  const revisionContextTitle = selectedRevision?.title ?? "";
  const contextualQuery =
    revisionContextTitle && revisionContextTitle !== "選択中の法改正"
      ? `${revisionContextTitle} ${resolvedConversation.query}`
      : resolvedConversation.query;
  const chatbotSafety = evaluateChatbotSafety(safeQuestion);
  if (chatbotSafety && chatbotSafety.kind !== "ambiguous") {
    const structuredSafety = finalizeChatbotResponse({
      answer: chatbotSafety.response,
      assumptions: [],
      conditions: [],
      sources: [],
      source_type: "safety",
      confidence: "low",
      citations: [],
      safetyKind: chatbotSafety.kind,
      clarificationQuestion: null,
      quickReplies: [],
      requiresHumanReview: true,
      context: resolvedConversation.context,
    });
    return NextResponse.json<ChatApiResponse & ChatbotResponse>(
      {
        ...structuredSafety,
        reply: structuredSafety.answer,
      },
      {
        status: 200,
        headers: {
          ...noStoreHeaders(),
          "X-Citation-Validation": "evidence-only",
          "X-AI-Used": "false",
        },
      },
    );
  }
  if (
    needsPriorConversationContext(
      safeQuestion,
      history.length > 0 ||
        Object.keys(sanitizeLegalConversationContext(body.context)).length > 0,
    )
  ) {
    const contextHold = finalizeChatbotResponse({
      requiresHumanReview: true,
      answer: ensureLegalAnswerAsOf(
        buildContextClarificationAnswer(),
        legalAnswerNow,
      ),
      assumptions: [],
      conditions: [],
      sources: [],
      source_type: "safety",
      confidence: "low",
      citations: [],
      clarificationQuestion: null,
      quickReplies: [],
      scopeWarnings: ["会話履歴がないため、指示語の対象を特定できません。"],
      context: resolvedConversation.context,
    });
    return NextResponse.json<ChatApiResponse & ChatbotResponse>(
      { ...contextHold, reply: contextHold.answer },
      {
        status: 200,
        headers: {
          ...noStoreHeaders(),
          "X-Citation-Validation": "evidence-only",
          "X-AI-Used": "false",
        },
      },
    );
  }
  if (hasFutureLegalPremise(safeQuestion, legalAnswerNow)) {
    const futureHold = finalizeChatbotResponse({
      answer: buildFutureLegalHoldAnswer(safeQuestion, legalAnswerNow),
      assumptions: [],
      conditions: [],
      sources: [],
      source_type: "safety",
      confidence: "low",
      citations: [],
      clarificationQuestion: null,
      quickReplies: [],
      scopeWarnings: [
        "将来時点の施行状態を確認済みの公式資料から特定できないため、回答を保留しました。",
      ],
      requiresHumanReview: true,
      context: resolvedConversation.context,
    });
    return NextResponse.json<ChatApiResponse & ChatbotResponse>(
      { ...futureHold, reply: futureHold.answer },
      {
        status: 200,
        headers: {
          ...noStoreHeaders(),
          "X-Citation-Validation": "evidence-only",
          "X-AI-Used": "false",
        },
      },
    );
  }
  // 安全判定の後だけ、承認済みのサーバー法令コーパスを検索する。
  const limited = await sharedRateLimitGuard(request, {
    routeKey: "law-revision-chat",
    limit: 30,
    windowMs: 10 * 60 * 1_000,
  }, { previewGlobalSubject: true });
  if (limited) return limited;

  if (
    selectedRevision?.enforcement_date &&
    isRevisionEffectiveDateQuestion(safeQuestion)
  ) {
    const asOf = jstDateKey(legalAnswerNow);
    const effectiveOn = selectedRevision.enforcement_date;
    const isCurrent = effectiveOn <= asOf;
    const sourceUrl =
      selectedRevision.source_url ?? selectedRevision.source?.url ?? undefined;
    const conclusion = [
      `「${selectedRevision.title}」の施行日は${japaneseDate(effectiveOn)}です。[1]`,
      `${japaneseDate(asOf)}時点では${isCurrent ? "施行済み" : "施行前"}です。`,
    ].join("\n");
    const structured = finalizeChatbotResponse({
      answer: `結論\n${conclusion}\n\n回答基準日: ${asOf} JST`,
      substantiveAnswer: conclusion,
      assumptions: ["選択中の法改正を対象に回答します。"],
      conditions: [],
      sources: [
        {
          law: selectedRevision.title,
          article: `改正履歴（${selectedRevision.revisionNumber}）`,
          effectiveOn,
          asOf,
          applicationStatus: isCurrent ? "current" : "future",
          text: selectedRevision.summary,
          snippet: `公布日 ${selectedRevision.publication_date || selectedRevision.publishedAt}、施行日 ${effectiveOn}`,
          ministry: selectedRevision.issuer,
          url: sourceUrl,
        },
      ],
      source_type: "rag",
      confidence: "high",
      citations: [
        {
          lawShort: selectedRevision.title.split("（", 1)[0] || selectedRevision.title,
          fullName: selectedRevision.title,
          articleNum: "改正履歴",
          articleTitle: selectedRevision.revisionNumber,
          issuer: selectedRevision.issuer,
          effectiveDate: effectiveOn,
          searchHref: `/law-search?q=${encodeURIComponent(selectedRevision.title)}`,
          egovHref: sourceUrl,
        },
      ],
      clarificationQuestion: null,
      quickReplies: [],
      requiresHumanReview: true,
      context: resolvedConversation.context,
    });
    return NextResponse.json<ChatApiResponse & ChatbotResponse>(
      { ...structured, reply: structured.answer },
      {
        status: 200,
        headers: {
          ...noStoreHeaders(),
          "X-Citation-Validation": "evidence-only",
          "X-AI-Used": "false",
        },
      },
    );
  }

  const { articles: rankedArticles } = searchRelevantArticlesWithScore(
    contextualQuery,
    10,
  );
  const relevantArticles = expandVerifiedLegalEvidenceArticles(
    contextualQuery,
    rankedArticles,
  );
  const now = legalAnswerNow;
  const initialReply = relevantArticles.length > 0
      ? buildServiceFirstLegalAnswer({
        query: contextualQuery,
        articles: relevantArticles.slice(0, 12),
        now,
      })
    : buildServiceFirstNoHitAnswer(contextualQuery, now);
  const citedArticles = citedLegalAnswerArticles(
    initialReply,
    relevantArticles.slice(0, 12),
  );
  const answer = ensureLegalAnswerAsOf(
    citedArticles.length > 0
      ? buildServiceFirstLegalAnswer({
          query: contextualQuery,
          articles: citedArticles,
          now,
        })
      : initialReply,
    now,
  );
  const structured = finalizeChatbotResponse({
    answer,
    assumptions: legalAnswerAssumptions(contextualQuery),
    sources: citedArticles.map((article) =>
      lawArticleToSource(article, contextualQuery, now),
    ),
    source_type: citedArticles.length > 0 ? "rag" : "safety",
    confidence: "low",
    citations: buildStructuredCitations(citedArticles),
    clarification: nextLegalClarification(contextualQuery) ?? undefined,
    requiresHumanReview: true,
    context: resolvedConversation.context,
  });
  return NextResponse.json<ChatApiResponse & ChatbotResponse>(
    {
      ...structured,
      reply: structured.answer,
    },
    {
      status: 200,
      headers: {
        ...noStoreHeaders(),
        "X-Citation-Validation": "evidence-only",
        "X-AI-Used": "false",
      },
    },
  );
}
