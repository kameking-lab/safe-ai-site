import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  hasJsonContentType,
  isValidAutomationConsultOrigin,
} from "@/lib/automation-consult/origin";
import {
  fingerprintAutomationConsultInput,
  isValidAutomationConsultIdempotencyKey,
  parseAutomationConsultSubmissionDate,
} from "@/lib/automation-consult/idempotency";
import { getAutomationConsultClientIp } from "@/lib/automation-consult/rate-limit";
import {
  anonymizeAutomationConsultClient,
  resolveAutomationConsultStateStore,
} from "@/lib/automation-consult/state-store";
import { inquirySchema, readInquiryJson } from "@/lib/inquiry/schema";
import { sendEmailSafe } from "@/lib/external/resend-safe";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER_CONTROL_CHARACTERS = /[\r\n\u0000-\u001f\u007f]/;

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { ...NO_STORE_HEADERS, ...headers } },
  );
}

function isSafeMailbox(value: string): boolean {
  if (value.length > 254 || HEADER_CONTROL_CHARACTERS.test(value)) return false;
  const bracketMatch = value.match(/^[^<>]{1,100}<([^<>]+)>$/);
  return EMAIL_PATTERN.test(bracketMatch?.[1]?.trim() ?? value.trim());
}

function createInquiryReference(submissionDate: Date, key: string): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(submissionDate)
    .replaceAll("-", "");
  const suffix = createHash("sha256")
    .update(`inquiry\0${key}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `INQ-${date}-${suffix}`;
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return errorResponse(415, "unsupported_media_type", "JSON形式で送信してください。");
  }
  if (!isValidAutomationConsultOrigin(request)) {
    return errorResponse(403, "invalid_origin", "送信元を確認できませんでした。");
  }

  const stateResolution = resolveAutomationConsultStateStore();
  if (!stateResolution.ok) {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、重複送信防止機能を確認できないため送信できません。",
    );
  }
  const stateStore = stateResolution.store;
  const clientIp = getAutomationConsultClientIp(request);
  const anonymousClientKey =
    stateStore.backend === "upstash"
      ? anonymizeAutomationConsultClient(clientIp)
      : clientIp;
  if (!anonymousClientKey) {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、送信回数の安全確認ができないため送信できません。",
    );
  }

  const rawBody = await readInquiryJson(request);
  if (!rawBody.ok) {
    return rawBody.reason === "payload_too_large"
      ? errorResponse(413, "payload_too_large", "入力内容が長すぎます。")
      : errorResponse(400, "invalid_json", "入力形式を確認してください。");
  }
  if (
    typeof rawBody.value === "object" &&
    rawBody.value !== null &&
    "website" in rawBody.value &&
    typeof rawBody.value.website === "string" &&
    rawBody.value.website.trim().length > 0
  ) {
    return errorResponse(400, "invalid_submission", "入力内容を確認してください。");
  }

  const parsed = inquirySchema.safeParse(rawBody.value);
  if (!parsed.success) {
    return errorResponse(400, "validation_error", "入力内容を確認してください。");
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!isValidAutomationConsultIdempotencyKey(idempotencyKey)) {
    return errorResponse(
      400,
      "missing_idempotency_key",
      "送信を安全に処理できませんでした。ページを再読み込みしてお試しください。",
    );
  }
  const submissionDate = parseAutomationConsultSubmissionDate(idempotencyKey);
  if (!submissionDate) {
    return errorResponse(
      400,
      "missing_idempotency_key",
      "送信を安全に処理できませんでした。ページを再読み込みしてお試しください。",
    );
  }

  const fingerprint = fingerprintAutomationConsultInput({
    route: "inquiry",
    input: parsed.data,
  });
  if (!fingerprint) {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、重複送信防止の安全確認ができないため送信できません。",
    );
  }

  let idempotency;
  try {
    idempotency = await stateStore.beginIdempotency(
      idempotencyKey,
      fingerprint,
    );
  } catch {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、重複送信防止機能を確認できないため送信できません。",
    );
  }
  if (idempotency.state === "conflict") {
    return errorResponse(
      409,
      "idempotency_conflict",
      "同じ送信識別子で異なる内容は送信できません。",
    );
  }
  if (idempotency.state === "pending") {
    return errorResponse(
      409,
      "request_in_progress",
      "同じ内容を送信中です。しばらくお待ちください。",
    );
  }
  if (idempotency.state === "replay") {
    return NextResponse.json(idempotency.response, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  let rateLimit;
  try {
    rateLimit = await stateStore.consumeRateLimit(anonymousClientKey);
  } catch {
    await stateStore
      .releaseIdempotency(idempotencyKey, fingerprint)
      .catch(() => undefined);
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、送信回数の安全確認ができないため送信できません。",
    );
  }
  if (!rateLimit.allowed) {
    await stateStore
      .releaseIdempotency(idempotencyKey, fingerprint)
      .catch(() => undefined);
    return errorResponse(
      429,
      "rate_limited",
      "短時間に複数回の送信がありました。時間をおいてお試しください。",
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  const inboxAddress = process.env.INQUIRY_INBOX?.trim() ?? "";
  const fromAddress = process.env.NOTIFY_FROM?.trim() ?? "";
  if (!isSafeMailbox(inboxAddress) || !isSafeMailbox(fromAddress)) {
    await stateStore
      .releaseIdempotency(idempotencyKey, fingerprint)
      .catch(() => undefined);
    return errorResponse(
      503,
      "delivery_not_configured",
      "現在、お問い合わせを送信できません。時間をおいてお試しください。",
    );
  }

  const referenceId = createInquiryReference(
    submissionDate,
    idempotencyKey,
  );
  const receivedAt = new Date().toISOString();
  const body = parsed.data;
  const delivery = await sendEmailSafe({
    tag: "inquiry",
    from: fromAddress,
    to: inboxAddress,
    replyTo: body.email,
    subject: `[安全AIポータル][ご意見] ${referenceId}`,
    text: [
      `受付番号: ${referenceId}`,
      `カテゴリ: ${body.category}`,
      `名前: ${body.name ?? "未記入"}`,
      `メール: ${body.email ?? "未記入"}`,
      `業種: ${body.industry ?? "未記入"}`,
      `件名: ${body.subject}`,
      "",
      "--- 内容 ---",
      body.message,
    ].join("\n"),
    idempotencyKey: `inquiry.${idempotencyKey}`,
  });
  if (!delivery.delivered) {
    await stateStore
      .releaseIdempotency(idempotencyKey, fingerprint)
      .catch(() => undefined);
    return errorResponse(
      503,
      delivery.reason === "not_configured"
        ? "delivery_not_configured"
        : "delivery_failed",
      "現在、お問い合わせを送信できません。時間をおいてお試しください。",
    );
  }

  const response = { ok: true as const, referenceId, receivedAt };
  try {
    const completed = await stateStore.completeIdempotency(
      idempotencyKey,
      fingerprint,
      response,
    );
    return NextResponse.json(response, {
      status: 200,
      headers: completed
        ? NO_STORE_HEADERS
        : {
            ...NO_STORE_HEADERS,
            "X-Idempotency-State": "provider-protected",
          },
    });
  } catch {
    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "X-Idempotency-State": "provider-protected",
      },
    });
  }
}
