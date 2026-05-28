/**
 * P3-1: 月次メールダイジェストの本文ビルダー（news-completion 2026-05-29）
 *
 * 新着ハブの集約データから「今月の主要法改正（施行前/済）＋労災トレンド＋機能誘導」の
 * メール本文を生成する純関数。送信は別（/api/notify/digest）。
 *
 * 原則: 事実の集約のみ。各項目に公式リンク。解除導線を必ず本文に含める。
 */
import type { NewsHubItem } from "@/lib/news-hub-types";

const SITE = "https://www.anzen-ai-portal.jp";

export type DigestInput = {
  items: NewsHubItem[];
  /** ダイジェスト対象月のラベル（例: 2026年5月） */
  monthLabel: string;
  /** 配信解除URL（Resend管理 or 自前token）。空でも本文に案内文は入れる */
  unsubscribeUrl?: string;
};

export type DigestOutput = {
  subject: string;
  text: string;
  html: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildMonthlyDigest(input: DigestInput): DigestOutput {
  const { items, monthLabel } = input;
  const laws = items.filter((i) => i.category === "law-revision").slice(0, 6);
  const upcoming = laws.filter((i) => (i.badge ?? "").includes("施行前"));
  const accidents = items.filter((i) => i.category === "accident" || i.category === "media").slice(0, 4);
  const notices = items.filter((i) => i.category === "notice").slice(0, 4);

  const subject = `【安全AIポータル】${monthLabel}の労働安全ダイジェスト（法改正${upcoming.length ? `・施行前${upcoming.length}件` : ""}／労災速報）`;
  const unsub =
    input.unsubscribeUrl ??
    `${SITE}/notifications`;

  // テキスト版
  const tLines: string[] = [
    `${monthLabel} 労働安全ダイジェスト（安全AIポータル）`,
    `登録不要で全文はこちら: ${SITE}/whats-new`,
    "",
    "■ 今月の主要法改正（施行前/施行済）",
    ...laws.map((i) => `・[${i.badge ?? ""}] ${i.title}（施行/公布 ${i.date}） ${i.url}`),
    "",
    "■ 労災の速報・関連ニュース",
    ...accidents.map((i) => `・${i.title}（${i.date}） ${i.url}`),
    "",
    "■ 通達・告示の新着",
    ...notices.map((i) => `・${i.title}（${i.date}） ${i.url}`),
    "",
    "関連機能: 化学物質RA / 事故データベース / 安衛法AIチャット",
    `${SITE}/chemical-ra ・ ${SITE}/accidents ・ ${SITE}/chatbot`,
    "",
    "※ 本メールは参考情報です。最新・正確な内容は各公式情報でご確認ください。",
    `配信停止（ワンクリック）: ${unsub}`,
  ];

  // HTML版（簡潔・安全）
  const htmlItems = (arr: NewsHubItem[]) =>
    arr
      .map(
        (i) =>
          `<li>${i.badge ? `<strong>[${esc(i.badge)}]</strong> ` : ""}${esc(i.title)} <span style="color:#888">(${i.date})</span> — <a href="${esc(i.url)}">公式</a></li>`,
      )
      .join("");
  const html = [
    `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#222">`,
    `<h2>${esc(monthLabel)} 労働安全ダイジェスト</h2>`,
    `<p>全文（登録不要）: <a href="${SITE}/whats-new">${SITE}/whats-new</a></p>`,
    `<h3>今月の主要法改正（施行前/施行済）</h3><ul>${htmlItems(laws)}</ul>`,
    `<h3>労災の速報・関連ニュース</h3><ul>${htmlItems(accidents)}</ul>`,
    `<h3>通達・告示の新着</h3><ul>${htmlItems(notices)}</ul>`,
    `<p style="font-size:12px;color:#888">※ 本メールは参考情報です。最新・正確な内容は各公式情報でご確認ください。</p>`,
    `<p style="font-size:12px"><a href="${esc(unsub)}">配信停止（ワンクリック）</a></p>`,
    `</div>`,
  ].join("");

  return { subject, text: tLines.join("\n"), html };
}
