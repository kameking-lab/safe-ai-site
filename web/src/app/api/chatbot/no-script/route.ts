import { validateChatbotRequestBoundary } from "@/lib/server/chatbot-request-boundary";
import { POST as chatbotPost } from "../route";
import type {
  ChatbotResponse,
  ChatbotSource,
  ChatTurn,
} from "@/lib/chatbot-contract";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import {
  normalizeLegalConversationText,
  resolveLegalConversationQuery,
  safeClarificationIntent,
} from "@/lib/legal-conversation-context";
import {
  PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS,
  hasPublicLegalConversationContext,
  rehydratePublicLegalConversationContext,
  sanitizePublicLegalConversationContext,
  type PublicLegalConversationContext,
} from "@/lib/legal-conversation-public-context";

const FORM_CONTENT_TYPES = new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
]);

const NO_SCRIPT_STATE_VERSION = 1;
const MAX_NO_SCRIPT_STATE_CHARS = 2_000;
const SAFETY_MANAGER_WORK_TYPE = "労働安全衛生法 安全管理者の選任義務";
const SAFE_NO_SCRIPT_INDUSTRIES = ["建設業", "製造業", "その他"] as const;

function isSafetyManagerContext(
  context: PublicLegalConversationContext,
): boolean {
  return (
    context.topicDomain === "general" &&
    context.equipment === SAFETY_MANAGER_WORK_TYPE
  );
}

type SafeNoScriptIndustry = (typeof SAFE_NO_SCRIPT_INDUSTRIES)[number];
type SafeNoScriptIntent = "reportRecipient";

type NoScriptConversationState = {
  v: typeof NO_SCRIPT_STATE_VERSION;
  context: PublicLegalConversationContext;
  industry?: SafeNoScriptIndustry;
  intent?: SafeNoScriptIntent;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key));
}

function isSafeNoScriptIndustry(
  value: unknown,
): value is SafeNoScriptIndustry {
  return (
    typeof value === "string" &&
    SAFE_NO_SCRIPT_INDUSTRIES.some((industry) => industry === value)
  );
}

function blockingCurrentInputSafety(message: string) {
  const direct = evaluateChatbotSafety(message);
  if (direct?.kind === "emergency" || direct?.kind === "privacy") {
    return direct;
  }
  const normalized = evaluateChatbotSafety(
    normalizeLegalConversationText(message),
  );
  return normalized?.kind === "emergency" || normalized?.kind === "privacy"
    ? normalized
    : null;
}

function canonicalContext(
  value: unknown,
): PublicLegalConversationContext | null {
  if (!isRecord(value)) return null;
  if (
    !hasOnlyKeys(value, PUBLIC_LEGAL_CONVERSATION_CONTEXT_KEYS)
  ) {
    return null;
  }
  const sanitized = sanitizePublicLegalConversationContext(value);
  return JSON.stringify(sanitized) === JSON.stringify(value)
    ? sanitized
    : null;
}

function parseConversationState(value: string): NoScriptConversationState | null {
  if (!value || value.length > MAX_NO_SCRIPT_STATE_CHARS) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (
    !isRecord(parsed) ||
    !hasOnlyKeys(parsed, ["v", "context", "industry", "intent"]) ||
    parsed.v !== NO_SCRIPT_STATE_VERSION
  ) {
    return null;
  }
  const context = canonicalContext(parsed.context);
  if (!context) return null;
  const industry = parsed.industry;
  if (
    industry !== undefined &&
    (!isSafeNoScriptIndustry(industry) ||
      !isSafetyManagerContext(context))
  ) {
    return null;
  }
  const intent = parsed.intent;
  if (
    intent !== undefined &&
    (intent !== "reportRecipient" ||
      hasPublicLegalConversationContext(context) ||
      industry !== undefined)
  ) {
    return null;
  }
  return {
    v: NO_SCRIPT_STATE_VERSION,
    context,
    ...(industry ? { industry } : {}),
    ...(intent ? { intent } : {}),
  };
}

function conversationState(input: {
  context?: PublicLegalConversationContext;
  industry?: SafeNoScriptIndustry;
  intent?: SafeNoScriptIntent;
}): NoScriptConversationState | undefined {
  const context = sanitizePublicLegalConversationContext(input.context);
  const industry =
    isSafetyManagerContext(context) ? input.industry : undefined;
  if (
    !hasPublicLegalConversationContext(context) &&
    !input.intent &&
    !industry
  ) {
    return undefined;
  }
  const candidate: NoScriptConversationState = {
    v: NO_SCRIPT_STATE_VERSION,
    context,
    ...(industry ? { industry } : {}),
    ...(input.intent ? { intent: input.intent } : {}),
  };
  if (JSON.stringify(candidate).length > MAX_NO_SCRIPT_STATE_CHARS) {
    return hasPublicLegalConversationContext(context)
      ? {
          v: NO_SCRIPT_STATE_VERSION,
          context,
          ...(industry ? { industry } : {}),
        }
      : undefined;
  }
  return candidate;
}

function intentHistory(intent: SafeNoScriptIntent | undefined): ChatTurn[] | undefined {
  return intent === "reportRecipient"
    ? [{ role: "user", content: "報告はどこへ？" }]
    : undefined;
}

function nextTurnIntent(
  message: string,
  context: PublicLegalConversationContext,
): SafeNoScriptIntent | undefined {
  if (hasPublicLegalConversationContext(context)) return undefined;
  return safeClarificationIntent(message).split(/\s+/).includes("報告先")
    ? "reportRecipient"
    : undefined;
}

function industryForRequest(
  message: string,
  priorState: NoScriptConversationState | undefined,
): SafeNoScriptIndustry | undefined {
  if (!priorState || !isSafetyManagerContext(priorState.context)) {
    return undefined;
  }
  if (!isSafeNoScriptIndustry(message)) return priorState.industry;
  if (priorState.industry) return message;
  return message;
}

function messageWithSafeIndustryContext(input: {
  message: string;
  priorState?: NoScriptConversationState;
  industry?: SafeNoScriptIndustry;
}): string {
  if (!input.priorState || !input.industry) return input.message;
  const resolved = resolveLegalConversationQuery({
    message: input.message,
    context: rehydratePublicLegalConversationContext(
      input.priorState.context,
    ),
  });
  const continuesSafetyManagerTopic =
    resolved.context.workType === SAFETY_MANAGER_WORK_TYPE ||
    (isSafeNoScriptIndustry(input.message) &&
      isSafetyManagerContext(input.priorState.context));
  if (!continuesSafetyManagerTopic) return input.message;
  if (
    input.message.includes("安全管理者") &&
    input.message.includes(input.industry)
  ) {
    return input.message;
  }
  return `${input.message} ${input.industry}の安全管理者`;
}

function hiddenStateInput(serializedState: string | null): string {
  return serializedState
    ? `<input type="hidden" name="state" value="${escapeHtml(serializedState)}">`
    : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const OFFICIAL_SOURCE_HOSTS = [
  "mhlw.go.jp",
  "e-gov.go.jp",
  "meti.go.jp",
  "mlit.go.jp",
] as const;
const MAX_RELATED_NOTICES = 2;
const MAX_RELATED_LEAFLETS = 2;

function safeOfficialUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isOfficialHost = OFFICIAL_SOURCE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !isOfficialHost
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function firstSafeOfficialUrl(values: readonly unknown[]): string | null {
  for (const value of values) {
    const url = safeOfficialUrl(value);
    if (url) return url;
  }
  return null;
}

function evidenceStatusLabel(
  status: ChatbotSource["applicationStatus"] | undefined,
): string | null {
  return status === "current"
    ? "施行中"
    : status === "future"
      ? "未施行"
      : status === "past"
        ? "過去時点"
        : status === "unknown"
          ? "施行状態未確認"
          : null;
}

function sourceForCitation(
  citation: ChatbotResponse["citations"][number],
  sources: readonly ChatbotSource[],
): ChatbotSource | undefined {
  return sources.find((source) => {
    const sameLaw =
      source.law === citation.fullName ||
      source.law === citation.lawShort ||
      source.lawShort === citation.lawShort;
    const sameArticle =
      source.article.includes(citation.articleNum) ||
      citation.articleNum.includes(source.article);
    return sameLaw && sameArticle;
  });
}

function sourceLocator(source: ChatbotSource): string {
  const locatorParts = [source.article];
  for (const part of [source.paragraph, source.item]) {
    if (part && !source.article.includes(part)) locatorParts.push(part);
  }
  return locatorParts.join(" ");
}

function renderEvidence(
  payload: Partial<ChatbotResponse>,
  requiresHumanReview: boolean,
): string {
  const sources = payload.sources ?? [];
  const citations = payload.citations ?? [];
  const relatedMaterials = renderRelatedOfficialMaterials(payload);
  if (
    sources.length === 0 &&
    citations.length === 0 &&
    relatedMaterials.count === 0 &&
    !requiresHumanReview
  ) {
    return "";
  }

  const matchedSources = new Set<ChatbotSource>();
  const citationItems = citations.map((citation) => {
    const source = sourceForCitation(citation, sources);
    if (source) matchedSources.add(source);
    const excerpt = source
      ? (source.snippet ?? source.text).slice(0, 360)
      : "";
    const officialUrl = firstSafeOfficialUrl([
      citation.egovHref,
      source?.url,
    ]);
    const locator = source
      ? sourceLocator(source)
      : citation.articleNum;
    const status = evidenceStatusLabel(
      source?.applicationStatus ?? payload.effectiveDateStatus?.status,
    );
    const timing = [
      status,
      citation.effectiveDate || source?.effectiveOn
        ? `適用日 ${citation.effectiveDate ?? source?.effectiveOn}`
        : null,
    ]
      .filter(Boolean)
      .join("・");
    const issuer = citation.issuer
      ? `<p class="meta">発出機関 ${escapeHtml(citation.issuer)}</p>`
      : "";
    return `<li><strong>${escapeHtml(citation.fullName)} ${escapeHtml(locator)}</strong>${timing ? `<p class="meta">${escapeHtml(timing)}</p>` : ""}${issuer}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}${officialUrl ? `<a href="${escapeHtml(officialUrl)}" rel="noopener noreferrer">公式原文</a>` : ""}</li>`;
  });
  const sourceItems = sources
    .filter((source) => !matchedSources.has(source))
    .map((source) => {
      const excerpt = (source.snippet ?? source.text).slice(0, 360);
      const officialUrl = safeOfficialUrl(source.url);
      const status = evidenceStatusLabel(source.applicationStatus);
      const timing = [
        status,
        source.effectiveOn ? `適用日 ${source.effectiveOn}` : null,
      ]
        .filter(Boolean)
        .join("・");
      return `<li><strong>${escapeHtml(source.law)} ${escapeHtml(sourceLocator(source))}</strong>${timing ? `<p class="meta">${escapeHtml(timing)}</p>` : ""}<p>${escapeHtml(excerpt)}</p>${officialUrl ? `<a href="${escapeHtml(officialUrl)}" rel="noopener noreferrer">公式原文</a>` : ""}</li>`;
    });
  const items = [...citationItems, ...sourceItems];
  const reviewStatus = requiresHumanReview
    ? '<p class="meta review-status">確認状態：回答と根拠の対応は最終確認が必要です。</p>'
    : "";
  const evidenceCount = items.length + relatedMaterials.count;
  return `<details><summary>${evidenceCount > 0 ? `根拠 ${evidenceCount}件` : "確認状態"}</summary>${reviewStatus}${items.length > 0 ? `<ol>${items.map((item, index) => item.replace("<li><strong>", `<li><strong>［${index + 1}］`)).join("")}</ol>` : ""}${relatedMaterials.html}</details>`;
}

function renderRelatedOfficialMaterials(
  payload: Partial<ChatbotResponse>,
): { count: number; html: string } {
  const notices = (payload.attachedNotices ?? [])
    .map((notice) => ({
      notice,
      url: firstSafeOfficialUrl([
        notice.pdfUrl,
        notice.sourceUrl,
        notice.detailUrl,
      ]),
    }))
    .filter((entry): entry is typeof entry & { url: string } =>
      Boolean(entry.url),
    )
    .slice(0, MAX_RELATED_NOTICES);
  const leaflets = (payload.attachedLeaflets ?? [])
    .map((leaflet) => ({
      leaflet,
      url: firstSafeOfficialUrl([
        leaflet.pdfUrl,
        leaflet.detailUrl,
        leaflet.sourceUrl,
      ]),
    }))
    .filter((entry): entry is typeof entry & { url: string } =>
      Boolean(entry.url),
    )
    .slice(0, MAX_RELATED_LEAFLETS);
  const count = notices.length + leaflets.length;
  if (count === 0) return { count: 0, html: "" };

  const noticeItems = notices
    .map(({ notice, url }) => {
      const metadata = [notice.noticeNumber, notice.issuedDateRaw, notice.locator]
        .filter((value): value is string => Boolean(value))
        .join("・");
      const excerpt = notice.excerpt?.trim().slice(0, 240);
      return `<li><strong>${escapeHtml(notice.title)}</strong>${metadata ? `<p class="meta">${escapeHtml(metadata)}</p>` : ""}${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}<a href="${escapeHtml(url)}" rel="noopener noreferrer">厚生労働省の原文</a></li>`;
    })
    .join("");
  const leafletItems = leaflets
    .map(({ leaflet, url }) => {
      const metadata = [leaflet.publisher, leaflet.publishedDateRaw]
        .filter((value): value is string => Boolean(value))
        .join("・");
      return `<li><strong>${escapeHtml(leaflet.title)}</strong>${metadata ? `<p class="meta">${escapeHtml(metadata)}</p>` : ""}<a href="${escapeHtml(url)}" rel="noopener noreferrer">厚生労働省の資料</a></li>`;
    })
    .join("");
  return {
    count,
    html: `<section aria-labelledby="related-materials-title"><h2 class="detail-heading" id="related-materials-title">関連公式資料 ${count}件</h2>${noticeItems ? `<section aria-labelledby="related-notices-title"><h3 class="detail-heading" id="related-notices-title">確認済み通達</h3><ul>${noticeItems}</ul></section>` : ""}${leafletItems ? `<section aria-labelledby="related-leaflets-title"><h3 class="detail-heading" id="related-leaflets-title">リーフレット</h3><ul>${leafletItems}</ul></section>` : ""}</section>`,
  };
}

function renderItems(title: string, items: string[] | undefined): string {
  const visible = (items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (visible.length === 0) return "";
  return `<section><h2>${escapeHtml(title)}</h2><ul>${visible.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function oneClarificationQuestion(value: string | null | undefined): string | null {
  const firstLine = value
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return null;
  const questionEnd = firstLine.search(/[？?]/);
  return questionEnd >= 0
    ? firstLine.slice(0, questionEnd + 1)
    : firstLine;
}

function renderAnswerMetadata(payload: Partial<ChatbotResponse>): string {
  const effective = payload.effectiveDateStatus;
  const confidenceLabel =
    payload.confidence === "high"
      ? "高"
      : payload.confidence === "medium"
        ? "中"
        : payload.confidence === "low"
          ? "低"
          : null;
  const values = [
    effective?.asOf ? `回答基準日 ${effective.asOf}` : null,
    effective?.label?.trim().slice(0, 120) || null,
    confidenceLabel ? `確信度 ${confidenceLabel}` : null,
  ].filter((value): value is string => Boolean(value));
  return values.length > 0
    ? `<p class="meta answer-metadata">${escapeHtml(values.join("・"))}</p>`
    : "";
}

function renderScopeWarnings(items: string[] | undefined): string {
  const visible = (items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (visible.length === 0) return "";
  return `<section class="scope-warnings" aria-labelledby="scope-warnings-title"><h2 id="scope-warnings-title">文脈上の注意</h2><ul>${visible.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function renderQuickReplies(
  payload: Partial<ChatbotResponse>,
  serializedState: string | null,
  clarificationQuestion: string | null,
): string {
  const replies = (payload.quickReplies ?? []).slice(0, 3);
  if (!clarificationQuestion || replies.length === 0) return "";
  return `<div class="chips" aria-label="回答候補">${replies
    .map(
      (reply) =>
        `<form method="post" action="/api/chatbot/no-script">${hiddenStateInput(serializedState)}<button type="submit" name="message" value="${escapeHtml(reply.prompt)}">${escapeHtml(reply.label)}</button></form>`,
    )
    .join("")}</div>`;
}

function renderAnswer(
  payload: Partial<ChatbotResponse>,
  serializedState: string | null,
): string {
  const directAnswer =
    payload.directAnswer?.trim() ||
    payload.substantiveAnswer?.trim() ||
    payload.answer?.trim() ||
    "回答を取得できませんでした。";
  const importantConditions =
    payload.importantConditions !== undefined
      ? payload.importantConditions
      : payload.conditions;
  const clarificationQuestion = oneClarificationQuestion(
    payload.clarificationQuestion,
  );
  return `<section aria-labelledby="answer-title"><h1 id="answer-title">回答</h1><p class="answer">${escapeHtml(directAnswer).replaceAll("\n", "<br>")}</p>${renderAnswerMetadata(payload)}${renderScopeWarnings(payload.scopeWarnings)}${renderItems("前提", payload.assumptions)}${renderItems("条件で変わる点", importantConditions)}${clarificationQuestion ? `<section><h2>確認</h2><p>${escapeHtml(clarificationQuestion)}</p></section>` : ""}${renderQuickReplies(payload, serializedState, clarificationQuestion)}${renderEvidence(payload, payload.requiresHumanReview === true)}</section>`;
}

function htmlResponse(input: {
  payload?: Partial<ChatbotResponse>;
  error?: string;
  status?: number;
  state?: NoScriptConversationState;
  headers?: HeadersInit;
}): Response {
  const serializedState = input.state ? JSON.stringify(input.state) : null;
  const answer =
    input.payload &&
    (input.payload.directAnswer ||
      input.payload.substantiveAnswer ||
      input.payload.answer)
    ? renderAnswer(input.payload, serializedState)
    : `<p role="alert">${escapeHtml(input.error ?? "回答を取得できませんでした。")}</p>`;
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow,noarchive"><title>安衛法AI</title><style>body{font-family:system-ui,sans-serif;max-width:48rem;margin:0 auto;padding:1rem;line-height:1.7;color:#172033}a{color:#0756a3}textarea{box-sizing:border-box;width:100%;min-height:7rem;padding:.75rem;font:inherit;border:1px solid #94a3b8;border-radius:.75rem}button{min-height:2.75rem;padding:.5rem 1.25rem;border:1px solid #94a3b8;border-radius:999px;background:white;color:#172033;font-weight:700}.answer{white-space:normal}details{margin-top:1rem;border-block:1px solid #cbd5e1;padding:.5rem 0}summary{min-height:2.75rem;cursor:pointer;font-weight:700}li{margin-block:.5rem}.detail-heading{font-size:1rem}.row{display:flex;align-items:center;justify-content:space-between;gap:1rem}.row button{border-color:#0756a3;background:#0756a3;color:white}.chips{display:flex;flex-wrap:wrap;gap:.5rem}.chips form{margin:0}.note,.meta{font-size:.8rem;color:#526077}</style></head>
<body><main>${answer}<h2>続けて質問する</h2><form method="post" action="/api/chatbot/no-script">${hiddenStateInput(serializedState)}<label for="message">質問入力</label><textarea id="message" name="message" required maxlength="4000" placeholder="作業や設備を質問"></textarea><div class="row"><p class="note">個人情報は入力しない</p><button type="submit">送信</button></div></form><p><a href="/chatbot">安衛法AIへ戻る</a>　<a href="/law-search">法令検索</a></p></main></body></html>`;
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex, follow, noarchive",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
  const upstreamHeaders = new Headers(input.headers);
  const upstreamAiUsed = upstreamHeaders
    .get("x-ai-used")
    ?.trim()
    .toLowerCase();
  headers.set("X-AI-Used", upstreamAiUsed === "true" ? "true" : "false");
  const retryAfter = upstreamHeaders.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) headers.set("Retry-After", retryAfter);
  return new Response(html, {
    status: input.status ?? 200,
    headers,
  });
}

function jsonBoundaryRequest(request: Request): Request {
  const headers = new Headers(request.headers);
  if (isOpaqueSameOriginNavigation(request)) headers.delete("origin");
  headers.set("content-type", "application/json");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: "{}",
  });
}

function isOpaqueSameOriginNavigation(request: Request): boolean {
  // Chromium serializes Origin as "null" on a POST from this endpoint because
  // the response deliberately uses Referrer-Policy: no-referrer. Accept that
  // one browser-derived navigation shape only; opaque cross-site requests keep
  // failing the shared boundary.
  return (
    request.headers.get("origin") === "null" &&
    request.headers.get("sec-fetch-site")?.toLowerCase() === "same-origin" &&
    request.headers.get("sec-fetch-mode")?.toLowerCase() === "navigate" &&
    request.headers.get("sec-fetch-dest")?.toLowerCase() === "document"
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (!contentType || !FORM_CONTENT_TYPES.has(contentType)) {
    return htmlResponse({ error: "フォームから送信してください。", status: 415 });
  }

  const boundary = validateChatbotRequestBoundary(jsonBoundaryRequest(request));
  if (!boundary.allowed) {
    return htmlResponse({ error: boundary.message, status: boundary.status });
  }

  let message = "";
  let context: PublicLegalConversationContext = {};
  let history: ChatTurn[] | undefined;
  let priorState: NoScriptConversationState | undefined;
  let stateValue: FormDataEntryValue | null = null;
  let contextValue: FormDataEntryValue | null = null;
  try {
    const form = await request.formData();
    const value = form.get("message");
    message = typeof value === "string" ? value.trim() : "";
    stateValue = form.get("state");
    contextValue = form.get("context");
  } catch {
    return htmlResponse({ error: "質問を読み取れませんでした。", status: 400 });
  }

  const currentSafety = blockingCurrentInputSafety(message);
  if (currentSafety) {
    return htmlResponse({
      payload: {
        answer: currentSafety.response,
        sources: [],
        safetyKind: currentSafety.kind,
      },
      headers: { "X-AI-Used": "false" },
    });
  }

  try {
    if (stateValue !== null && contextValue !== null) {
      return htmlResponse({ error: "会話条件を一つにしてください。", status: 400 });
    }
    if (stateValue !== null) {
      if (typeof stateValue !== "string") {
        return htmlResponse({ error: "会話条件を読み取れませんでした。", status: 400 });
      }
      const parsedState = parseConversationState(stateValue);
      if (!parsedState) {
        return htmlResponse({ error: "会話条件を読み取れませんでした。", status: 400 });
      }
      priorState = parsedState;
      context = parsedState.context;
      history = intentHistory(parsedState.intent);
    } else if (typeof contextValue === "string" && contextValue.length > 0) {
      if (contextValue.length > 2_000) {
        return htmlResponse({ error: "会話条件が長すぎます。", status: 400 });
      }
      const parsed = JSON.parse(contextValue) as unknown;
      context = sanitizePublicLegalConversationContext(parsed);
      priorState = conversationState({ context });
    }
  } catch {
    return htmlResponse({ error: "質問を読み取れませんでした。", status: 400 });
  }
  if (!message || message.length > 4_000) {
    return htmlResponse({
      error: "1〜4000文字で質問を入力してください。",
      status: 400,
      state: priorState,
    });
  }

  const industry = industryForRequest(message, priorState);
  const upstreamMessage = messageWithSafeIndustryContext({
    message,
    priorState,
    industry,
  });

  const headers = new Headers({ "content-type": "application/json" });
  const opaqueSameOriginNavigation = isOpaqueSameOriginNavigation(request);
  for (const name of [
    "origin",
    "sec-fetch-site",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]) {
    const value = request.headers.get(name);
    if (name === "origin" && opaqueSameOriginNavigation) continue;
    if (value) headers.set(name, value);
  }
  let response: Response;
  try {
    response = await chatbotPost(
      new Request(new URL("/api/chatbot", request.url), {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: upstreamMessage,
          ...(hasPublicLegalConversationContext(context) ? { context } : {}),
          ...(history ? { history } : {}),
          privacyConfirmed: true,
        }),
        signal: request.signal,
      }),
    );
  } catch {
    return htmlResponse({
      error: "回答を取得できませんでした。時間をおいて再試行してください。",
      status: 503,
      state: priorState,
    });
  }
  const payload = (await response.json().catch(() => null)) as
    | (Partial<ChatbotResponse> & { error?: string })
    | null;
  if (
    !response.ok ||
    !payload ||
    !(payload.directAnswer || payload.substantiveAnswer || payload.answer)
  ) {
    return htmlResponse({
      error: payload?.error ?? "回答を取得できませんでした。",
      status: response.status >= 400 ? response.status : 502,
      state: response.status === 422 ? undefined : priorState,
      headers: response.headers,
    });
  }
  const blockedState =
    payload.safetyKind === "emergency" || payload.safetyKind === "privacy";
  const nextContext = sanitizePublicLegalConversationContext(
    payload.context ??
      resolveLegalConversationQuery({
        message: upstreamMessage,
        context: rehydratePublicLegalConversationContext(context),
        history,
      }).context,
  );
  const nextState = blockedState
    ? undefined
    : conversationState({
        context: nextContext,
        industry:
          isSafetyManagerContext(nextContext)
            ? industry
            : undefined,
        intent: nextTurnIntent(upstreamMessage, nextContext),
      });
  return htmlResponse({
    payload,
    state: nextState,
    headers: response.headers,
  });
}
