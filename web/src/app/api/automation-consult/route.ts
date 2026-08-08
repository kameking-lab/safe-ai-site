import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  automationConsultSchema,
  flattenAutomationConsultErrors,
  readAutomationConsultJson,
} from "@/lib/automation-consult/schema";
import {
  hasJsonContentType,
  isValidAutomationConsultOrigin,
} from "@/lib/automation-consult/origin";
import {
  getAutomationConsultClientIp,
} from "@/lib/automation-consult/rate-limit";
import {
  fingerprintAutomationConsultInput,
  isValidAutomationConsultIdempotencyKey,
  parseAutomationConsultSubmissionDate,
} from "@/lib/automation-consult/idempotency";
import {
  anonymizeAutomationConsultClient,
  getAutomationConsultPreviewDryRunStateStore,
  resolveAutomationConsultStateStore,
} from "@/lib/automation-consult/state-store";
import {
  createAutomationConsultReference,
  deliverAutomationConsultEmails,
  formatAutomationConsultJst,
  prepareAutomationConsultEmailDryRun,
} from "@/lib/automation-consult/email";
import { isPreviewSafetyMode } from "@/lib/server/deployment-safety";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import {
  automationConsultQueueConfiguration,
  enqueueAutomationConsult,
} from "@/lib/automation-consult/queue";
import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const PREVIEW_DRY_RUN_HASH_SECRET = randomBytes(32).toString("base64url");

function errorResponse(
  status: number,
  code: string,
  message: string,
  options?: {
    fieldErrors?: Record<string, string[]>;
    headers?: Record<string, string>;
  }
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(options?.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
      },
    },
    {
      status,
      headers: { ...NO_STORE_HEADERS, ...options?.headers },
    }
  );
}

export async function POST(request: Request) {
  const previewSafetyMode = isPreviewSafetyMode();
  const availability = getAutomationConsultAvailability();
  if (!hasJsonContentType(request)) {
    return errorResponse(415, "unsupported_media_type", "JSON形式で送信してください。");
  }
  if (!isValidAutomationConsultOrigin(request)) {
    return errorResponse(403, "invalid_origin", "送信元を確認できませんでした。");
  }
  // Productionでは、共有状態・配送・送信元を含む受付能力をPII body読取前に
  // 一括検査する。Preview dry-runだけは外部送信なしの構造検証を許可する。
  if (
    !previewSafetyMode &&
    availability.webFormEnabled !== true
  ) {
    return errorResponse(
      503,
      "intake_unavailable",
      "Webフォームは利用できません。個人情報は送信されていません。メール相談をご利用ください。",
    );
  }
  const previewStore = getAutomationConsultPreviewDryRunStateStore();
  const stateResolution = previewStore
    ? { ok: true as const, store: previewStore }
    : resolveAutomationConsultStateStore();
  if (!stateResolution.ok) {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、重複送信防止機能を確認できないため相談を送信できません。",
    );
  }
  const stateStore = stateResolution.store;
  const clientIp = getAutomationConsultClientIp(request);
  const anonymousClientKey =
    stateStore.backend === "memory"
      ? clientIp
      : anonymizeAutomationConsultClient(clientIp);
  if (!anonymousClientKey) {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、送信回数の安全確認ができないため相談を送信できません。",
    );
  }

  const rawBody = await readAutomationConsultJson(request);
  if (!rawBody.ok) {
    if (rawBody.reason === "payload_too_large") {
      return errorResponse(413, "payload_too_large", "入力内容が長すぎます。");
    }
    return errorResponse(400, "invalid_json", "入力形式を確認してください。");
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

  const parsed = automationConsultSchema.safeParse(rawBody.value);
  if (!parsed.success) {
    return errorResponse(400, "validation_error", "入力内容を確認してください。", {
      fieldErrors: flattenAutomationConsultErrors(parsed.error),
    });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!isValidAutomationConsultIdempotencyKey(idempotencyKey)) {
    return errorResponse(
      400,
      "missing_idempotency_key",
      "送信を安全に処理できませんでした。ページを再読み込みしてお試しください。"
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

  const fingerprint = fingerprintAutomationConsultInput(
    parsed.data,
    previewSafetyMode ? PREVIEW_DRY_RUN_HASH_SECRET : undefined,
  );
  if (!fingerprint) {
    return errorResponse(
      503,
      "shared_state_unavailable",
      "現在、重複送信防止の安全確認ができないため相談を送信できません。",
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
      "現在、重複送信防止機能を確認できないため相談を送信できません。",
    );
  }
  if (idempotency.state === "conflict") {
    return errorResponse(
      409,
      "idempotency_conflict",
      "同じ送信識別子で異なる内容は送信できません。"
    );
  }
  if (idempotency.state === "pending") {
    return errorResponse(
      409,
      "request_in_progress",
      "同じ内容を送信中です。しばらくお待ちください。"
    );
  }
  if (idempotency.state === "replay") {
    return NextResponse.json(idempotency.response, {
      status: 200,
      headers: previewSafetyMode
        ? {
            ...NO_STORE_HEADERS,
            "X-Safe-AI-Preview-Mode": "dry-run",
          }
        : NO_STORE_HEADERS,
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
      "現在、送信回数の安全確認ができないため相談を送信できません。",
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
      { headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const referenceId = createAutomationConsultReference(submissionDate, idempotencyKey);
  const receivedAt = new Date().toISOString();

  try {
    const deliveryInput = {
      consultation: parsed.data,
      referenceId,
      // Stable across partial retries because the provider idempotency key
      // requires an identical message body. The email labels this honestly as
      // the client-generated send-start time, not a trusted server timestamp.
      submissionStartedAtJst: formatAutomationConsultJst(submissionDate),
      idempotencyKey,
    };
    if (previewSafetyMode) {
      prepareAutomationConsultEmailDryRun(deliveryInput);
    } else if (availability.intakeMode === "queue") {
      const queueConfiguration = automationConsultQueueConfiguration();
      if (!queueConfiguration.ok || !prisma) {
        throw new Error("automation_consult_queue_unavailable");
      }
      await enqueueAutomationConsult(
        prisma as unknown as GovernanceDatabase,
        {
          referenceId,
          idempotencyKey,
          payload: parsed.data,
          configuration: queueConfiguration,
          now: submissionDate,
        },
      );
    } else {
      const delivery = await deliverAutomationConsultEmails(deliveryInput);
      if (!delivery.delivered) {
        await stateStore
          .releaseIdempotency(idempotencyKey, fingerprint)
          .catch(() => undefined);
        const code =
          delivery.reason === "not_configured"
            ? "delivery_not_configured"
            : "delivery_failed";
        return errorResponse(
          503,
          code,
          "現在、相談を送信できません。時間をおいてお試しください。"
        );
      }
    }
  } catch {
    await stateStore
      .releaseIdempotency(idempotencyKey, fingerprint)
      .catch(() => undefined);
    return errorResponse(
      503,
      "delivery_failed",
      "現在、相談を送信できません。時間をおいてお試しください。"
    );
  }

  const response = {
    ok: true as const,
    referenceId,
    receivedAt,
    ...(previewSafetyMode
      ? { deliveryMode: "dry-run" as const }
      : availability.intakeMode === "queue"
        ? { deliveryMode: "queued" as const }
        : {}),
  };
  const successHeaders = previewSafetyMode
    ? {
        ...NO_STORE_HEADERS,
        "X-Safe-AI-Preview-Mode": "dry-run",
      }
    : NO_STORE_HEADERS;
  try {
    const completed = await stateStore.completeIdempotency(
      idempotencyKey,
      fingerprint,
      response,
    );
    if (!completed) {
      // Email provider idempotency remains the final duplicate-send boundary.
      // Return success because delivery already completed; do not ask the user
      // to resubmit an already accepted consultation.
      return NextResponse.json(response, {
        status: 200,
        headers: {
          ...successHeaders,
          "X-Idempotency-State": "provider-protected",
        },
      });
    }
  } catch {
    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...successHeaders,
        "X-Idempotency-State": "provider-protected",
      },
    });
  }
  return NextResponse.json(response, {
    status: 200,
    headers: successHeaders,
  });
}
