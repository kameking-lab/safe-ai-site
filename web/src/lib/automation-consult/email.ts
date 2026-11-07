import { getAutomationMailRecipients } from "./mail-draft";
import { createHash, randomBytes } from "node:crypto";
import {
  sendEmailSafe,
  type SafeEmailParams,
  type SafeEmailResult,
} from "@/lib/external/resend-safe";
import type { AutomationConsultInput } from "./schema";
import {
  escapeAutomationConsultHtml,
  multilineAutomationConsultHtml,
  sanitizeAutomationConsultSourcePage,
} from "./html";

type EmailSender = (params: SafeEmailParams) => Promise<SafeEmailResult>;

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const HEADER_CONTROL_CHARACTERS = /[\r\n\u0000-\u001f\u007f]/;

const CONSULTATION_TYPE_LABELS: Record<AutomationConsultInput["consultationType"], string> = {
  automation: "業務自動化",
  "ai-utilization": "AI活用",
  "safety-efficiency": "安全衛生業務の効率化",
  training: "講習・研修",
  "training-materials": "講習会資料作成",
  manuals: "マニュアル・手順書作成",
  signage: "サイネージ",
  "heat-illness-training": "熱中症講習",
  "safety-education-materials": "安全教育資料",
  "wbgt-weather-notifications": "WBGT・気象通知",
  "heat-signage": "熱中症サイネージ表示",
  "ky-document-automation": "KY・帳票自動化",
  other: "その他",
};

const TIMING_LABELS: Record<AutomationConsultInput["timing"], string> = {
  asap: "できるだけ早く",
  "within-1-month": "1か月以内",
  "within-3-months": "3か月以内",
  undecided: "未定・相談したい",
};

const BUDGET_LABELS: Record<NonNullable<AutomationConsultInput["budget"]>, string> = {
  "under-50000": "5万円未満",
  "50000-100000": "5万〜10万円",
  "100000-300000": "10万〜30万円",
  "300000-500000": "30万〜50万円",
  "over-500000": "50万円以上",
  undecided: "未定・相談したい",
};

const DELIVERY_LABELS: Record<
  NonNullable<AutomationConsultInput["deliveryPreference"]>,
  string
> = {
  online: "オンライン",
  onsite: "現地",
  either: "どちらでも可",
  undecided: "未定・相談したい",
};

type AutomationConsultEmailConfiguration =
  | { ok: true; from: string; recipients: [string] }
  | { ok: false };

export type AutomationConsultEmailDeliveryResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" | "owner_delivery_failed" };

export function getAutomationConsultEmailConfiguration(): AutomationConsultEmailConfiguration {
  const recipients = getAutomationMailRecipients();
  const explicitFrom = process.env.AUTOMATION_CONSULT_FROM;
  const rawFrom = explicitFrom?.trim() ? explicitFrom : process.env.NOTIFY_FROM;
  const from = rawFrom?.trim();
  if (
    !recipients ||
    !rawFrom ||
    !from ||
    (explicitFrom !== undefined && HEADER_CONTROL_CHARACTERS.test(explicitFrom)) ||
    rawFrom.length > 254 ||
    HEADER_CONTROL_CHARACTERS.test(rawFrom) ||
    !isSafeFromAddress(from)
  ) {
    return { ok: false };
  }

  return { ok: true, from, recipients: [recipients.to] };
}

function isSafeFromAddress(value: string): boolean {
  if (value.length > 254 || HEADER_CONTROL_CHARACTERS.test(value)) return false;
  const bracketMatch = value.match(/^[^<>]{1,100}<([^<>]+)>$/);
  return EMAIL_PATTERN.test(bracketMatch?.[1]?.trim() ?? value.trim());
}

export function createAutomationConsultReference(
  now = new Date(),
  stableKey?: string,
): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replaceAll("-", "");
  const suffix = stableKey
    ? createHash("sha256").update(stableKey).digest("hex").slice(0, 12).toUpperCase()
    : randomBytes(6).toString("hex").toUpperCase();
  return `AC-${date}-${suffix}`;
}

export function formatAutomationConsultJst(now: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

export function buildAutomationConsultOwnerEmail(input: {
  consultation: AutomationConsultInput;
  referenceId: string;
  submissionStartedAtJst: string;
}): Pick<SafeEmailParams, "subject" | "text" | "html" | "replyTo"> {
  const { consultation, referenceId, submissionStartedAtJst } = input;
  const consultationType = CONSULTATION_TYPE_LABELS[consultation.consultationType];
  const sourcePage = sanitizeAutomationConsultSourcePage(consultation.sourcePage);
  const organization = consultation.organization ?? "未記入";
  const currentTools = consultation.currentTools ?? "未記入";
  const budget = consultation.budget ? BUDGET_LABELS[consultation.budget] : "未記入";
  const deliveryPreference = consultation.deliveryPreference
    ? DELIVERY_LABELS[consultation.deliveryPreference]
    : "未記入";

  const text = [
    `受付番号: ${referenceId}`,
    `受付基準日時（送信開始時刻・JST）: ${submissionStartedAtJst}`,
    `相談種別: ${consultationType}`,
    `名前: ${consultation.name || "ご相談者"}`,
    `返信用メール: ${consultation.email}`,
    `会社・団体名: ${organization}`,
    "",
    "現在困っていること:",
    consultation.currentProblem,
    "",
    "希望する支援:",
    consultation.desiredSupport,
    "",
    `現在利用しているツール: ${currentTools}`,
    `希望時期: ${TIMING_LABELS[consultation.timing]}`,
    `予算帯: ${budget}`,
    `オンライン・現地等の希望: ${deliveryPreference}`,
    `送信元ページ: ${sourcePage}`,
    `個人情報同意送信日時（送信開始時刻・JST）: ${submissionStartedAtJst}`,
  ].join("\n");

  const rows = [
    ["受付番号", referenceId],
    ["受付基準日時（送信開始時刻・JST）", submissionStartedAtJst],
    ["相談種別", consultationType],
    ["名前", consultation.name],
    ["返信用メール", consultation.email],
    ["会社・団体名", organization],
    ["現在困っていること", consultation.currentProblem],
    ["希望する支援", consultation.desiredSupport],
    ["現在利用しているツール", currentTools],
    ["希望時期", TIMING_LABELS[consultation.timing]],
    ["予算帯", budget],
    ["オンライン・現地等の希望", deliveryPreference],
    ["送信元ページ", sourcePage],
    ["個人情報同意送信日時（送信開始時刻・JST）", submissionStartedAtJst],
  ] as const;

  const html = [
    "<h1>安全AIポータル 業務相談</h1>",
    "<table>",
    ...rows.map(
      ([label, value]) =>
        `<tr><th align="left" valign="top">${escapeAutomationConsultHtml(label)}</th>` +
        `<td>${multilineAutomationConsultHtml(value)}</td></tr>`
    ),
    "</table>",
  ].join("");

  return {
    subject: `[安全AIポータル][業務相談] ${consultationType} - ${referenceId}`,
    text,
    html,
    replyTo: consultation.email,
  };
}

export type AutomationConsultDryRunSummary = {
  mode: "dry-run";
  ownerDeliveryCount: 1;
  acknowledgementDeliveryCount: 0;
  replyToValidated: true;
  bodiesGenerated: true;
};

/**
 * Preview用の非送信検証。本文とReply-Toをproductionと同じbuilderで生成するが、
 * 宛先設定・Resend・外部KVへは触れず、本文やメールアドレスを返さない。
 */
export function prepareAutomationConsultEmailDryRun(input: {
  consultation: AutomationConsultInput;
  referenceId: string;
  submissionStartedAtJst: string;
  idempotencyKey: string;
}): AutomationConsultDryRunSummary {
  const ownerEmail = buildAutomationConsultOwnerEmail(input);
  if (
    ownerEmail.replyTo !== input.consultation.email ||
    !ownerEmail.subject ||
    !ownerEmail.text ||
    !ownerEmail.html
  ) {
    throw new Error("automation_consult_dry_run_structure_invalid");
  }
  return {
    mode: "dry-run",
    ownerDeliveryCount: 1,
    acknowledgementDeliveryCount: 0,
    replyToValidated: true,
    bodiesGenerated: true,
  };
}

export async function deliverAutomationConsultEmails(input: {
  consultation: AutomationConsultInput;
  referenceId: string;
  submissionStartedAtJst: string;
  idempotencyKey: string;
  sendEmail?: EmailSender;
}): Promise<AutomationConsultEmailDeliveryResult> {
  const configuration = getAutomationConsultEmailConfiguration();
  if (!configuration.ok) return { delivered: false, reason: "not_configured" };

  const sendEmail = input.sendEmail ?? sendEmailSafe;
  const ownerEmail = buildAutomationConsultOwnerEmail(input);
  const ownerDelivery = await sendEmail({
    tag: "automation-consult-owner-1",
    idempotencyKey: `${input.idempotencyKey}.owner-1`,
    from: configuration.from,
    to: configuration.recipients[0],
    ...ownerEmail,
  });
  if (!ownerDelivery.delivered) {
    return { delivered: false, reason: "owner_delivery_failed" };
  }
  // Receipt is shown on the page. Do not send an automatic response to an
  // unverified user-entered address or duplicate the owner's test message.
  return { delivered: true };
}
