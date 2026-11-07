import { getAutomationMailRecipients } from "./mail-draft";

export type AutomationConsultAvailabilityStatus =
  | "available"
  | "mail_available"
  | "paused"
  | "checking";

export type AutomationConsultAvailability = {
  status: AutomationConsultAvailabilityStatus;
  /** 相談手段が1つ以上使えるか。Webフォームの可否とは分けて扱う。 */
  accepting: boolean;
  /** PIIを受け取るWebフォームの全gateが成立した場合だけtrue。 */
  webFormEnabled?: boolean;
  /** 公開画面に表示する実際の受付手段。 */
  contactMode?: "web_form" | "mail_client" | null;
  intakeMode: "email" | "queue" | null;
  retentionDays: number | null;
  label: string;
  message: string;
};

type Environment = Record<string, string | undefined>;

const COMMON_PRESENCE_CHECKS = [
  ["AUTOMATION_CONSULT_RECIPIENTS", "common_recipients_missing"],
  ["RESEND_API_KEY", "common_resend_key_missing"],
  ["AUTOMATION_CONSULT_STATE_BACKEND", "common_state_backend_missing"],
  ["AUTOMATION_CONSULT_STATE_HASH_SECRET", "common_state_hash_secret_missing"],
  ["AUTOMATION_CONSULT_FROM_VERIFIED", "common_from_verified_missing"],
  ["AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK", "common_bounce_complaint_policy_missing"],
  ["AUTOMATION_CONSULT_STATE_VERIFIED", "common_state_verified_missing"],
  ["AUTOMATION_CONSULT_DELIVERY_VERIFIED", "common_delivery_verified_missing"],
  ["AUTOMATION_CONSULT_RETENTION_POLICY_ACK", "common_retention_policy_missing"],
  ["AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED", "common_admin_review_path_missing"],
] as const;

function isConfigured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

const HEADER_CONTROL_CHARACTERS = /[\r\n\u0000-\u001f\u007f]/;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function hasSafeSender(value: string | undefined): boolean {
  if (!value || value.length > 254 || HEADER_CONTROL_CHARACTERS.test(value)) {
    return false;
  }
  const bracketMatch = value.match(/^[^<>]{1,100}<([^<>]+)>$/);
  return EMAIL_PATTERN.test(bracketMatch?.[1]?.trim() ?? value.trim());
}

function hasSafeUpstashUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith(".upstash.io") ||
        url.hostname.endsWith(".upstash.com"))
    );
  } catch {
    return false;
  }
}

function hasValidRetention(value: string | undefined): boolean {
  const days = Number(value);
  return Number.isInteger(days) && days >= 7 && days <= 90;
}

/** Internal boolean-only predicates shared by presentation and private logging. */
export function evaluateAutomationConsultReadiness(
  env: Environment = process.env,
) {
  const publicStatus = env.AUTOMATION_CONSULT_PUBLIC_STATUS?.trim().toLowerCase();
  const sender = env.AUTOMATION_CONSULT_FROM?.trim() || env.NOTIFY_FROM?.trim();
  const stateBackend = env.AUTOMATION_CONSULT_STATE_BACKEND?.trim().toLowerCase();
  const recipientsValid = getAutomationMailRecipients(env) !== null;
  const commonPresence = Object.fromEntries(
    COMMON_PRESENCE_CHECKS.map(([key, code]) => [code, isConfigured(env[key])]),
  ) as Record<(typeof COMMON_PRESENCE_CHECKS)[number][1], boolean>;
  const checks = {
    public_status_not_available: publicStatus === "available",
    ...commonPresence,
    recipients_invalid: recipientsValid,
    sender_invalid: hasSafeSender(sender),
    resend_key_invalid: (env.RESEND_API_KEY?.trim().length ?? 0) >= 12,
    state_backend_invalid: stateBackend === "upstash" || stateBackend === "postgres",
    upstash_url_invalid: stateBackend !== "upstash" || hasSafeUpstashUrl(env.UPSTASH_REDIS_REST_URL),
    upstash_token_invalid: stateBackend !== "upstash" || (env.UPSTASH_REDIS_REST_TOKEN?.trim().length ?? 0) >= 16,
    postgres_url_missing: stateBackend !== "postgres" || isConfigured(env.DATABASE_URL),
    state_hash_secret_invalid: (env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim().length ?? 0) >= 32,
    from_not_verified: env.AUTOMATION_CONSULT_FROM_VERIFIED?.trim().toLowerCase() === "true",
    bounce_complaint_policy_not_acknowledged: env.AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK?.trim().toLowerCase() === "true",
    state_not_verified: env.AUTOMATION_CONSULT_STATE_VERIFIED?.trim().toLowerCase() === "true",
    delivery_not_verified: env.AUTOMATION_CONSULT_DELIVERY_VERIFIED?.trim().toLowerCase() === "true",
    retention_days_invalid: hasValidRetention(env.AUTOMATION_CONSULT_RETENTION_DAYS),
    retention_policy_not_acknowledged: env.AUTOMATION_CONSULT_RETENTION_POLICY_ACK?.trim().toLowerCase() === "true",
    admin_review_path_not_verified: env.AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED?.trim().toLowerCase() === "true",
  };
  return {
    checks,
    webFormEnabled: Object.values(checks).every(Boolean),
    explicitlyPaused: publicStatus === "paused",
    mailFallbackAvailable: recipientsValid,
  };
}

export type AutomationConsultReadinessReason =
  keyof ReturnType<typeof evaluateAutomationConsultReadiness>["checks"];

/** Never attach these private fixed enums to public responses or UI. */
export function getAutomationConsultReadinessReasons(env: Environment = process.env): AutomationConsultReadinessReason[] {
  const { checks } = evaluateAutomationConsultReadiness(env);
  return (Object.keys(checks) as AutomationConsultReadinessReason[]).filter((code) => !checks[code]);
}

/**
 * Public presentation state only. It never returns configuration values,
 * addresses, tokens, or the name of a missing secret.
 */
export function getAutomationConsultAvailability(
  env: Environment = process.env,
): AutomationConsultAvailability {
  // Preserve the explicit-pause early return without evaluating other settings.
  if (env.AUTOMATION_CONSULT_PUBLIC_STATUS?.trim().toLowerCase() === "paused") {
    return {
      status: "paused",
      accepting: false,
      webFormEnabled: false,
      contactMode: null,
      intakeMode: null,
      retentionDays: null,
      label: "受付停止中",
      message:
        "現在は相談受付を停止しています。料金、モデルケース、依頼準備の内容は引き続き確認できます。",
    };
  }

  const readiness = evaluateAutomationConsultReadiness(env);
  if (readiness.webFormEnabled) {
    return {
      status: "available",
      accepting: true,
      webFormEnabled: true,
      contactMode: "web_form",
      intakeMode: "email",
      retentionDays: Number(env.AUTOMATION_CONSULT_RETENTION_DAYS),
      label: "Webフォーム受付中",
      message:
        "初回30分の相談は無料です。送信前に個人情報の取扱いと入力内容をご確認ください。",
    };
  }

  if (readiness.mailFallbackAvailable) {
    return {
      status: "mail_available",
      accepting: true,
      webFormEnabled: false,
      contactMode: "mail_client",
      intakeMode: null,
      retentionDays: null,
      label: "メール相談受付中",
      message:
        "ボタンを押すと、お使いのメールアプリで相談文を作成します。Webフォームから相談本文を送信・保存することはありません。",
    };
  }

  return {
    status: "paused",
    accepting: false,
    webFormEnabled: false,
    contactMode: null,
    intakeMode: null,
    retentionDays: null,
    label: "受付停止中",
    message:
      "現在利用できる相談手段がありません。料金とモデルケースは引き続き確認できます。",
  };
}
