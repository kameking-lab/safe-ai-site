import { NextResponse } from "next/server";
import { sendEmailSafe } from "@/lib/external/resend-safe";
import {
  beginSharedIdempotency,
  completeSharedIdempotency,
  consumeRequestRateLimit,
  fingerprintSharedRequest,
  releaseSharedIdempotency,
} from "@/lib/security/shared-state";

export type FeedbackPayload = {
  articleSlug: string;
  errorType: "law_citation" | "broken_link" | "factual_error" | "other";
  description: string;
  email?: string;
};

const ERROR_TYPE_LABELS: Record<FeedbackPayload["errorType"], string> = {
  law_citation: "法令引用誤り",
  broken_link: "リンク切れ",
  factual_error: "事実誤認",
  other: "その他",
};

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ────────────────────────────────────────────────────────────
// In-memory rate limiter: 同一IPあたり 1分間で最大 3 リクエスト
// ────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 3;

// ────────────────────────────────────────────────────────────
// メール送信。本文や宛先はアプリケーションログへ記録しない。
// ────────────────────────────────────────────────────────────
function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[char] ?? char;
  });
}

async function sendFeedbackEmail(
  payload: FeedbackPayload,
  receivedAt: string,
  idempotencyKey: string,
): Promise<boolean> {
  const to = process.env.FEEDBACK_INBOX;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!to || !from) return false;
  const subject = `[SafeAI] 記事誤り報告: ${payload.articleSlug}`;
  const html = `
<h2>記事誤り報告</h2>
<table>
  <tr><th>記事スラッグ</th><td>${escapeHtml(payload.articleSlug)}</td></tr>
  <tr><th>エラー種別</th><td>${ERROR_TYPE_LABELS[payload.errorType]}</td></tr>
  <tr><th>説明</th><td>${escapeHtml(payload.description).replace(/\n/g, "<br>")}</td></tr>
  ${payload.email ? `<tr><th>報告者メール</th><td>${escapeHtml(payload.email)}</td></tr>` : ""}
  <tr><th>受信日時</th><td>${receivedAt}</td></tr>
</table>
`;

  const result = await sendEmailSafe({
    tag: "feedback",
    from,
    to,
    subject,
    html,
    idempotencyKey,
  });
  return result.delivered;
}

// ────────────────────────────────────────────────────────────
// POST /api/feedback
// ────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  let rateLimit;
  try {
    rateLimit = await consumeRequestRateLimit(request, {
      routeKey: "feedback",
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "shared_rate_limit_unavailable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "短時間に多数の送信がありました。1分ほどおいて再度お試しください。" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  let body: FeedbackPayload;
  try {
    body = (await request.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isNonEmpty(body.articleSlug)) {
    return NextResponse.json({ ok: false, error: "missing_article_slug" }, { status: 400 });
  }
  if (body.articleSlug.length > 200) {
    return NextResponse.json({ ok: false, error: "article_slug_too_long" }, { status: 400 });
  }
  if (!["law_citation", "broken_link", "factual_error", "other"].includes(body.errorType)) {
    return NextResponse.json({ ok: false, error: "invalid_error_type" }, { status: 400 });
  }
  if (!isNonEmpty(body.description)) {
    return NextResponse.json({ ok: false, error: "missing_description" }, { status: 400 });
  }
  if (body.description.length > 1000) {
    return NextResponse.json({ ok: false, error: "description_too_long" }, { status: 400 });
  }
  if (body.email && !isValidEmail(body.email.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey)) {
    return NextResponse.json(
      { ok: false, error: "idempotency_key_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const requestHash = fingerprintSharedRequest("feedback", {
    articleSlug: body.articleSlug.trim(),
    errorType: body.errorType,
    description: body.description.trim(),
    email: body.email?.trim().toLowerCase() || null,
  });
  let idempotency;
  try {
    idempotency = await beginSharedIdempotency<{
      ok: true;
      receivedAt: string;
    }>({
      routeKey: "feedback",
      key: idempotencyKey,
      requestHash,
      ttlMs: 10 * 60 * 1_000,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "shared_idempotency_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
    );
  }
  if (idempotency.state === "conflict") {
    return NextResponse.json(
      { ok: false, error: "idempotency_conflict" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (idempotency.state === "pending") {
    return NextResponse.json(
      { ok: false, error: "idempotency_pending" },
      {
        status: 409,
        headers: { "Cache-Control": "no-store", "Retry-After": "2" },
      },
    );
  }
  if (idempotency.state === "replay") {
    return NextResponse.json(idempotency.response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Idempotent-Replay": "true",
      },
    });
  }

  const receivedAt = new Date().toISOString();
  console.info(
    "[feedback]",
    JSON.stringify({ receivedAt, errorType: body.errorType, descriptionLength: body.description.length, hasEmail: Boolean(body.email) })
  );

  const delivered = await sendFeedbackEmail(
    body,
    receivedAt,
    `feedback.${idempotencyKey}`,
  );
  if (!delivered) {
    await releaseSharedIdempotency({
      routeKey: "feedback",
      key: idempotencyKey,
      requestHash,
      leaseToken: idempotency.leaseToken,
    }).catch(() => false);
    return NextResponse.json(
      { ok: false, error: "delivery_failed", message: "現在、報告を送信できません。時間をおいて再度お試しください。" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await completeSharedIdempotency({
      routeKey: "feedback",
      key: idempotencyKey,
      requestHash,
      leaseToken: idempotency.leaseToken,
      response: { ok: true as const, receivedAt },
      retentionMs: 24 * 60 * 60 * 1_000,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "idempotency_completion_unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      },
    );
  }
  return NextResponse.json(
    { ok: true, receivedAt },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
