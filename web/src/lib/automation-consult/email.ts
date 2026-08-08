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
  | { ok: true; from: string; recipients: [string, string] }
  | { ok: false };

export type AutomationConsultEmailDeliveryResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" | "owner_delivery_failed" | "reply_failed" };

export function getAutomationConsultEmailConfiguration(): AutomationConsultEmailConfiguration {
  const rawRecipients = process.env.AUTOMATION_CONSULT_RECIPIENTS;
  const from = process.env.AUTOMATION_CONSULT_FROM ?? process.env.NOTIFY_FROM;
  if (!rawRecipients || !from || !isSafeFromAddress(from)) return { ok: false };

  const recipients = [...new Set(rawRecipients.split(",").map((value) => value.trim()))];
  if (
    recipients.length !== 2 ||
    recipients.some(
      (recipient) =>
        !EMAIL_PATTERN.test(recipient) || HEADER_CONTROL_CHARACTERS.test(recipient)
    )
  ) {
    return { ok: false };
  }

  return { ok: true, from, recipients: [recipients[0], recipients[1]] };
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
    `名前: ${consultation.name}`,
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

export function buildAutomationConsultAcknowledgementEmail(input: {
  consultation: AutomationConsultInput;
  referenceId: string;
}): Pick<SafeEmailParams, "subject" | "text" | "html"> {
  const { consultation, referenceId } = input;
  const consultationType = CONSULTATION_TYPE_LABELS[consultation.consultationType];
  const summary =
    consultation.currentProblem.length > 400
      ? `${consultation.currentProblem.slice(0, 400)}…`
      : consultation.currentProblem;
  const confidentialityNotice =
    "追加の個人情報、営業秘密、顧客情報、SDS原文などの機密資料は、このメールへ送信しないでください。必要な場合は、内容を確認後に安全な受け渡し方法をご案内します。";
  const replyNotice =
    "このメールは自動送信専用です。このメールへ返信しても相談の追加受付はできません。";
  const responseNotice =
    "返信時期は相談内容を確認したうえでご案内します。見積前に費用は発生しません。";

  const text = [
    `${consultation.name} 様`,
    "",
    "安全AIポータルへご相談いただき、ありがとうございます。",
    `受付番号: ${referenceId}`,
    `相談種別: ${consultationType}`,
    "",
    "相談内容の要約:",
    summary,
    "",
    responseNotice,
    confidentialityNotice,
    replyNotice,
  ].join("\n");

  const html = [
    `<p>${escapeAutomationConsultHtml(consultation.name)} 様</p>`,
    "<p>安全AIポータルへご相談いただき、ありがとうございます。</p>",
    `<p><strong>受付番号:</strong> ${escapeAutomationConsultHtml(referenceId)}<br>`,
    `<strong>相談種別:</strong> ${escapeAutomationConsultHtml(consultationType)}</p>`,
    "<p><strong>相談内容の要約:</strong><br>",
    `${multilineAutomationConsultHtml(summary)}</p>`,
    `<p>${escapeAutomationConsultHtml(responseNotice)}</p>`,
    `<p>${escapeAutomationConsultHtml(confidentialityNotice)}</p>`,
    `<p>${escapeAutomationConsultHtml(replyNotice)}</p>`,
  ].join("");

  return {
    subject: `[安全AIポータル] 業務相談を受け付けました - ${referenceId}`,
    text,
    html,
  };
}

export type AutomationConsultDryRunSummary = {
  mode: "dry-run";
  ownerDeliveryCount: 2;
  acknowledgementDeliveryCount: 1;
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
  const acknowledgement = buildAutomationConsultAcknowledgementEmail(input);
  if (
    ownerEmail.replyTo !== input.consultation.email ||
    !ownerEmail.subject ||
    !ownerEmail.text ||
    !ownerEmail.html ||
    !acknowledgement.subject ||
    !acknowledgement.text ||
    !acknowledgement.html
  ) {
    throw new Error("automation_consult_dry_run_structure_invalid");
  }
  // Production delivery uses these exact stable suffixes for two individual
  // owner messages and one acknowledgement. Do not expose configured recipients.
  const plannedIdempotencyKeys = [
    `${input.idempotencyKey}.owner-1`,
    `${input.idempotencyKey}.owner-2`,
    `${input.idempotencyKey}.ack`,
  ];
  if (new Set(plannedIdempotencyKeys).size !== 3) {
    throw new Error("automation_consult_dry_run_idempotency_invalid");
  }
  return {
    mode: "dry-run",
    ownerDeliveryCount: 2,
    acknowledgementDeliveryCount: 1,
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
  const ownerDeliveries = await Promise.all(
    configuration.recipients.map((recipient, index) =>
      sendEmail({
        tag: `automation-consult-owner-${index + 1}`,
        idempotencyKey: `${input.idempotencyKey}.owner-${index + 1}`,
        from: configuration.from,
        to: recipient,
        ...ownerEmail,
      })
    )
  );

  if (ownerDeliveries.some((delivery) => !delivery.delivered)) {
    return { delivered: false, reason: "owner_delivery_failed" };
  }

  const acknowledgement = buildAutomationConsultAcknowledgementEmail(input);
  const replyDelivery = await sendEmail({
    tag: "automation-consult-acknowledgement",
    idempotencyKey: `${input.idempotencyKey}.ack`,
    from: configuration.from,
    to: input.consultation.email,
    ...acknowledgement,
  });

  if (!replyDelivery.delivered) return { delivered: false, reason: "reply_failed" };
  return { delivered: true };
}
