import { validateChatbotRequestBoundary } from "@/lib/server/chatbot-request-boundary";
import { POST as chatbotPost } from "../route";
import type {
  ChatbotResponse,
  ChatbotSource,
} from "@/lib/chatbot-contract";
import {
  resolveLegalConversationQuery,
  sanitizeLegalConversationContext,
  type LegalConversationContext,
} from "@/lib/legal-conversation-context";

const FORM_CONTENT_TYPES = new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeOfficialUrl(source: ChatbotSource): string | null {
  if (!source.url) return null;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function renderSources(sources: ChatbotSource[]): string {
  if (sources.length === 0) return "";
  const items = sources.map((source, index) => {
    const excerpt = (source.snippet ?? source.text).slice(0, 360);
    const officialUrl = safeOfficialUrl(source);
    const locatorParts = [source.article];
    for (const part of [source.paragraph, source.item]) {
      if (part && !source.article.includes(part)) locatorParts.push(part);
    }
    const locator = locatorParts.join(" ");
    const status =
      source.applicationStatus === "current"
        ? "施行中"
        : source.applicationStatus === "future"
          ? "未施行"
          : source.applicationStatus === "past"
            ? "過去時点"
            : null;
    const timing = [status, source.effectiveOn ? `適用日 ${source.effectiveOn}` : null]
      .filter(Boolean)
      .join("・");
    return `<li><strong>［${index + 1}］${escapeHtml(source.law)} ${escapeHtml(locator)}</strong>${timing ? `<p class="meta">${escapeHtml(timing)}</p>` : ""}<p>${escapeHtml(excerpt)}</p>${officialUrl ? `<a href="${escapeHtml(officialUrl)}" rel="noopener noreferrer">公式原文</a>` : ""}</li>`;
  });
  return `<details><summary>根拠 ${items.length}件</summary><ol>${items.join("")}</ol></details>`;
}

function renderItems(title: string, items: string[] | undefined): string {
  const visible = (items ?? []).filter(Boolean).slice(0, 3);
  if (visible.length === 0) return "";
  return `<section><h2>${escapeHtml(title)}</h2><ul>${visible.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function renderQuickReplies(
  payload: Partial<ChatbotResponse>,
  escapedContext: string,
): string {
  const replies = (payload.quickReplies ?? []).slice(0, 3);
  if (!payload.clarificationQuestion || replies.length === 0) return "";
  return `<div class="chips" aria-label="回答候補">${replies
    .map(
      (reply) =>
        `<form method="post" action="/api/chatbot/no-script"><input type="hidden" name="context" value="${escapedContext}"><button type="submit" name="message" value="${escapeHtml(reply.prompt)}">${escapeHtml(reply.label)}</button></form>`,
    )
    .join("")}</div>`;
}

function renderAnswer(
  payload: Partial<ChatbotResponse>,
  escapedContext: string,
): string {
  const substantiveAnswer = payload.substantiveAnswer?.trim();
  if (!substantiveAnswer) {
    return `<section aria-labelledby="answer-title"><h1 id="answer-title">回答</h1><p class="answer">${escapeHtml(payload.answer ?? "回答を取得できませんでした。").replaceAll("\n", "<br>")}</p>${renderSources(payload.sources ?? [])}</section>`;
  }
  return `<section aria-labelledby="answer-title"><h1 id="answer-title">回答</h1><p class="answer">${escapeHtml(substantiveAnswer).replaceAll("\n", "<br>")}</p>${renderItems("前提", payload.assumptions)}${renderItems("条件で変わる点", payload.conditions)}${payload.clarificationQuestion ? `<section><h2>確認</h2><p>${escapeHtml(payload.clarificationQuestion)}</p></section>` : ""}${renderQuickReplies(payload, escapedContext)}${renderSources(payload.sources ?? [])}</section>`;
}

function htmlResponse(input: {
  payload?: Partial<ChatbotResponse>;
  error?: string;
  status?: number;
  context?: LegalConversationContext;
  headers?: HeadersInit;
}): Response {
  const context = escapeHtml(JSON.stringify(input.context ?? {}));
  const answer = input.payload?.answer
    ? renderAnswer(input.payload, context)
    : `<p role="alert">${escapeHtml(input.error ?? "回答を取得できませんでした。")}</p>`;
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow,noarchive"><title>安衛法AI</title><style>body{font-family:system-ui,sans-serif;max-width:48rem;margin:0 auto;padding:1rem;line-height:1.7;color:#172033}a{color:#0756a3}textarea{box-sizing:border-box;width:100%;min-height:7rem;padding:.75rem;font:inherit;border:1px solid #94a3b8;border-radius:.75rem}button{min-height:2.75rem;padding:.5rem 1.25rem;border:1px solid #94a3b8;border-radius:999px;background:white;color:#172033;font-weight:700}.answer{white-space:normal}details{margin-top:1rem;border-block:1px solid #cbd5e1;padding:.5rem 0}summary{min-height:2.75rem;cursor:pointer;font-weight:700}li{margin-block:.5rem}.row{display:flex;align-items:center;justify-content:space-between;gap:1rem}.row button{border-color:#0756a3;background:#0756a3;color:white}.chips{display:flex;flex-wrap:wrap;gap:.5rem}.chips form{margin:0}.note,.meta{font-size:.8rem;color:#526077}</style></head>
<body><main>${answer}<h2>続けて質問する</h2><form method="post" action="/api/chatbot/no-script"><input type="hidden" name="context" value="${context}"><label for="message">質問入力</label><textarea id="message" name="message" required maxlength="4000" placeholder="作業や設備を質問"></textarea><div class="row"><p class="note">個人情報は入力しない</p><button type="submit">送信</button></div></form><p><a href="/chatbot">安衛法AIへ戻る</a>　<a href="/law-search">法令検索</a></p></main></body></html>`;
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex, follow, noarchive",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
  const retryAfter = new Headers(input.headers).get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) headers.set("Retry-After", retryAfter);
  return new Response(html, {
    status: input.status ?? 200,
    headers,
  });
}

function jsonBoundaryRequest(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: "{}",
  });
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
  let context: LegalConversationContext = {};
  try {
    const form = await request.formData();
    const value = form.get("message");
    message = typeof value === "string" ? value.trim() : "";
    const contextValue = form.get("context");
    if (typeof contextValue === "string" && contextValue.length > 0) {
      if (contextValue.length > 2_000) {
        return htmlResponse({ error: "会話条件が長すぎます。", status: 400 });
      }
      const parsed = JSON.parse(contextValue) as LegalConversationContext;
      context = sanitizeLegalConversationContext(parsed);
    }
  } catch {
    return htmlResponse({ error: "質問を読み取れませんでした。", status: 400 });
  }
  if (!message || message.length > 4_000) {
    return htmlResponse({
      error: "1〜4000文字で質問を入力してください。",
      status: 400,
      context,
    });
  }

  const headers = new Headers({ "content-type": "application/json" });
  for (const name of [
    "origin",
    "sec-fetch-site",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let response: Response;
  try {
    response = await chatbotPost(
      new Request(new URL("/api/chatbot", request.url), {
        method: "POST",
        headers,
        body: JSON.stringify({ message, context, privacyConfirmed: true }),
        signal: request.signal,
      }),
    );
  } catch {
    return htmlResponse({
      error: "回答を取得できませんでした。時間をおいて再試行してください。",
      status: 503,
      context,
    });
  }
  const payload = (await response.json().catch(() => null)) as
    | (Partial<ChatbotResponse> & { error?: string })
    | null;
  if (!response.ok || !payload?.answer) {
    return htmlResponse({
      error: payload?.error ?? "回答を取得できませんでした。",
      status: response.status >= 400 ? response.status : 502,
      context,
      headers: response.headers,
    });
  }
  const nextContext = resolveLegalConversationQuery({ message, context }).context;
  return htmlResponse({
    payload,
    context: nextContext,
  });
}
