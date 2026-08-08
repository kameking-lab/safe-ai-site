import "server-only";

const SAFE_EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const HEADER_CONTROLS = /[\r\n\u0000-\u001f\u007f]/;

export const AUTOMATION_MAIL_SUBJECT =
  "安全AIポータル｜業務自動化・講習の相談";

export const AUTOMATION_MAIL_TEMPLATE = `【相談カテゴリ】
[業務自動化／安全衛生業務の効率化／AI活用／講習・研修／資料・手順書]

【現在の業務】
[個人名・会社名・現場名を伏せ、作業手順と頻度を記入]

【困っていること】
[例：毎週の転記と集計に約3時間かかる]

【希望時期】
[未定でも可]

【予算目安】
[未定／3〜10万円／10〜30万円／30万円以上]

※個人情報、健康情報、会社・現場の機密、認証情報は記入しないでください。
※最初のメールへファイルを添付せず、必要資料は相談後に取扱方法を確認してください。`;

export type AutomationMailRecipients = {
  to: string;
  bcc: string;
};

function isSafeEmail(value: string): boolean {
  return (
    value.length <= 254 &&
    SAFE_EMAIL.test(value) &&
    !HEADER_CONTROLS.test(value)
  );
}

/**
 * 宛先はserver-only環境変数から解決する。
 * 検証済みGmailは手動送信fallbackのToとしてserver-renderできるが、
 * OutlookのBccはHTMLやclient propsへ返さない。
 */
export function getAutomationMailRecipients(
  env: Record<string, string | undefined> = process.env,
): AutomationMailRecipients | null {
  const recipients = [
    ...new Set(
      (env.AUTOMATION_CONSULT_RECIPIENTS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (recipients.length !== 2 || !recipients.every(isSafeEmail)) return null;

  const to = recipients.find((value) =>
    value.toLowerCase().endsWith("@gmail.com"),
  );
  const bcc = recipients.find((value) =>
    value.toLowerCase().endsWith("@outlook.com"),
  );
  if (!to || !bcc || to === bcc) return null;
  return { to, bcc };
}

export function buildAutomationMailto(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const recipients = getAutomationMailRecipients(env);
  if (!recipients) return null;

  const params = new URLSearchParams({
    bcc: recipients.bcc,
    subject: AUTOMATION_MAIL_SUBJECT,
    body: AUTOMATION_MAIL_TEMPLATE,
  });
  return `mailto:${encodeURIComponent(recipients.to)}?${params.toString()}`;
}
