import {
  CHATBOT_PRIVACY_RESPONSE,
  detectChatbotSensitiveData,
  evaluateChatbotSafety,
} from "@/lib/chatbot-safety";

export type AiOutboundBlockReason =
  | "consent_required"
  | "emergency"
  | "sensitive_data"
  | "confidential_data"
  | "input_too_large"
  | "invalid_input"
  | "uninspectable_binary"
  | "unapproved_context";

export type AiOutboundSafetyDecision =
  | { allowed: true; normalizedText: string }
  | {
      allowed: false;
      reason: AiOutboundBlockReason;
      status: 400 | 413 | 422 | 428;
      message: string;
    };

export type AiOutboundSafetyInput = {
  /** Purpose label is allow-listed server code, never user input. */
  purpose: string;
  texts: readonly unknown[];
  consent: boolean;
  maxChars?: number;
  contextPolicy: "approved-server-corpus" | "no-context";
  /** Raw PDF/image bytes cannot be reliably preflighted by this text gate. */
  hasUninspectableBinary?: boolean;
};

const DEFAULT_MAX_CHARS = 12_000;

const CONFIDENTIAL_PATTERNS = [
  /(?:現場名|工事名|案件名|プロジェクト名|顧客名|取引先名?|会社名|事業場名|元請名|協力会社名)[は:：=]?(?!未定|なし|匿名)[^\n、。]{2,80}/,
  /(?:株式会社|有限会社|合同会社|㈱|㈲)[^\n、。]{1,60}/,
  /(?:[一-龠々〆ヶァ-ヶー]{2,24}(?:ビル|マンション|工場|倉庫|病院|学校|庁舎|橋梁|トンネル))(?:新築|改修|増築|解体|補修|建設)?工事/,
  /(?:access[_ -]?token|api[_ -]?key|secret|password|パスワード|認証情報)[\s:：=]+[^\s]{6,}/i,
  /(?:図面番号|物件番号|受注番号|契約番号)[は:：=]?[A-Z0-9_-]{4,}/i,
  /(?:署名|押印|印影)[は:：=]?(?!なし|未記入)[^\n、。]{2,80}/,
];

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.normalize("NFKC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Isomorphic safety core. Every external generative-AI call must pass this
 * function before RAG lookup,
 * prompt construction, SDK/network access, persistence, analytics, or logging.
 * The result deliberately contains no rejected raw input.
 */
export function inspectAiOutbound(input: AiOutboundSafetyInput): AiOutboundSafetyDecision {
  if (!input.purpose || !["approved-server-corpus", "no-context"].includes(input.contextPolicy)) {
    return {
      allowed: false,
      reason: "unapproved_context",
      status: 422,
      message: "許可された参照情報を確認できないため、AI送信を停止しました。",
    };
  }
  if (input.hasUninspectableBinary) {
    return {
      allowed: false,
      reason: "uninspectable_binary",
      status: 422,
      message:
        "ファイル内の個人情報・機密情報を送信前に確認できないため、AI送信を停止しました。連絡先・署名・会社名等を除いた内容を手入力してください。",
    };
  }
  const normalized: string[] = [];
  for (const value of input.texts) {
    const text = normalizeText(value);
    if (text === null) {
      return {
        allowed: false,
        reason: "invalid_input",
        status: 400,
        message: "AIへ送る入力形式を確認できないため、送信を停止しました。",
      };
    }
    normalized.push(text);
  }
  const joined = normalized.join("\n");

  const emergency = normalized
    .map((text) => evaluateChatbotSafety(text))
    .find((decision) => decision?.kind === "emergency");
  if (emergency) {
    return {
      allowed: false,
      reason: "emergency",
      status: 422,
      message: emergency.response,
    };
  }
  if (joined.length > (input.maxChars ?? DEFAULT_MAX_CHARS)) {
    return {
      allowed: false,
      reason: "input_too_large",
      status: 413,
      message: "AIへ送る入力が長すぎます。必要な情報だけに短くしてください。",
    };
  }
  if (
    normalized.some((text) => detectChatbotSensitiveData(text).length > 0) ||
    normalized.some((text) => evaluateChatbotSafety(text)?.kind === "privacy")
  ) {
    return {
      allowed: false,
      reason: "sensitive_data",
      status: 422,
      message: CHATBOT_PRIVACY_RESPONSE,
    };
  }
  if (CONFIDENTIAL_PATTERNS.some((pattern) => pattern.test(joined))) {
    return {
      allowed: false,
      reason: "confidential_data",
      status: 422,
      message:
        "会社名、現場名、案件番号、署名、認証情報などの機密情報を匿名化してから再度お試しください。",
    };
  }
  // Report the more urgent/specific safety reason before asking for consent.
  // This also guarantees emergency and sensitive input is never treated as
  // merely a missing-checkbox condition by clients.
  if (input.consent !== true) {
    return {
      allowed: false,
      reason: "consent_required",
      status: 428,
      message:
        "外部AIへの送信前確認が必要です。個人情報・機密情報を匿名化し、送信に同意してから実行してください。",
    };
  }
  return { allowed: true, normalizedText: joined };
}

export function aiOutboundBlockedJson(decision: Exclude<AiOutboundSafetyDecision, { allowed: true }>) {
  return {
    ok: false as const,
    reason: decision.reason,
    message: decision.message,
    requiresHumanReview: true as const,
  };
}

/** Log only an operation label and coarse error class; never provider messages or raw prompts. */
export function logAiOutboundFailure(operation: string, error: unknown): void {
  console.error("[ai-outbound] request failed", {
    operation,
    kind: error instanceof Error ? error.name : "unknown",
  });
}
