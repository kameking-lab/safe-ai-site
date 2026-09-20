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

export const PPE_SELECTION_MAIL_SUBJECT =
  "安全AIポータル｜保護具選定の相談";

export const PPE_SELECTION_MAIL_TEMPLATE = `【作業内容】
[例：屋内で有機溶剤を使った部品洗浄を1日2時間]

【危険有害要因】
[粉じん／蒸気・ガス／薬液飛散／墜落／騒音／飛来物／その他・不明]

【確認できている情報】
[SDSの有無、物質名・CAS番号、濃度、酸素濃度、換気、作業時間など。分からない項目は「不明」]

【現在使っている保護具】
[種類・メーカー・型式。未使用なら「なし」]

【相談したいこと】
[どの条件を確認し、どの規格・製品群へ絞ればよいか]

※個人情報、健康情報、会社・現場の機密、認証情報は記入しないでください。
※危険有害性が不明な状態で製品を決めず、緊急性がある場合は作業を開始せず現場責任者へ連絡してください。
※最初のメールへファイルを添付せず、SDS等は相談後に取扱方法を確認してください。`;

export type ConsultationMailKind = "automation" | "ppe-selection";

export function getConsultationMailDraft(kind: ConsultationMailKind): {
  subject: string;
  template: string;
} {
  return kind === "ppe-selection"
    ? {
        subject: PPE_SELECTION_MAIL_SUBJECT,
        template: PPE_SELECTION_MAIL_TEMPLATE,
      }
    : {
        subject: AUTOMATION_MAIL_SUBJECT,
        template: AUTOMATION_MAIL_TEMPLATE,
      };
}

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
  return buildConsultationMailto("automation", env);
}

export function buildConsultationMailto(
  kind: ConsultationMailKind,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const recipients = getAutomationMailRecipients(env);
  if (!recipients) return null;

  const draft = getConsultationMailDraft(kind);

  const params = new URLSearchParams({
    bcc: recipients.bcc,
    subject: draft.subject,
    body: draft.template,
  });
  return `mailto:${encodeURIComponent(recipients.to)}?${params.toString()}`;
}
