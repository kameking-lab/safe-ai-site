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

const REQUIRED_COMMON_KEYS = [
  "AUTOMATION_CONSULT_RECIPIENTS",
  "RESEND_API_KEY",
  "AUTOMATION_CONSULT_STATE_BACKEND",
  "AUTOMATION_CONSULT_STATE_HASH_SECRET",
  "AUTOMATION_CONSULT_FROM_VERIFIED",
  "AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK",
  "AUTOMATION_CONSULT_STATE_VERIFIED",
  "AUTOMATION_CONSULT_DELIVERY_VERIFIED",
  "AUTOMATION_CONSULT_RETENTION_POLICY_ACK",
  "AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED",
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

/**
 * Public presentation state only. It never returns configuration values,
 * addresses, tokens, or the name of a missing secret.
 */
export function getAutomationConsultAvailability(
  env: Environment = process.env,
): AutomationConsultAvailability {
  const publicStatus =
    env.AUTOMATION_CONSULT_PUBLIC_STATUS?.trim().toLowerCase();
  if (publicStatus === "paused") {
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

  const sender =
    env.AUTOMATION_CONSULT_FROM?.trim() || env.NOTIFY_FROM?.trim();
  const hasSender = hasSafeSender(sender);
  const stateBackend =
    env.AUTOMATION_CONSULT_STATE_BACKEND?.trim().toLowerCase();
  const hasSharedState =
    (stateBackend === "upstash" &&
      hasSafeUpstashUrl(env.UPSTASH_REDIS_REST_URL) &&
      Boolean(
        env.UPSTASH_REDIS_REST_TOKEN &&
          env.UPSTASH_REDIS_REST_TOKEN.trim().length >= 16,
      )) ||
    (stateBackend === "postgres" && isConfigured(env.DATABASE_URL));
  const hasAllConfiguration =
    hasSender &&
    REQUIRED_COMMON_KEYS.every((key) => isConfigured(env[key])) &&
    getAutomationMailRecipients(env) !== null &&
    env.RESEND_API_KEY!.trim().length >= 12 &&
    hasSharedState &&
    env.AUTOMATION_CONSULT_STATE_HASH_SECRET!.trim().length >= 32 &&
    env.AUTOMATION_CONSULT_FROM_VERIFIED?.trim().toLowerCase() === "true" &&
    env.AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK?.trim().toLowerCase() ===
      "true" &&
    env.AUTOMATION_CONSULT_STATE_VERIFIED?.trim().toLowerCase() === "true" &&
    env.AUTOMATION_CONSULT_DELIVERY_VERIFIED?.trim().toLowerCase() === "true" &&
    hasValidRetention(env.AUTOMATION_CONSULT_RETENTION_DAYS) &&
    env.AUTOMATION_CONSULT_RETENTION_POLICY_ACK?.trim().toLowerCase() ===
      "true" &&
    env.AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED?.trim().toLowerCase() ===
      "true";
  if (publicStatus === "available" && hasAllConfiguration) {
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

  if (getAutomationMailRecipients(env) !== null) {
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
