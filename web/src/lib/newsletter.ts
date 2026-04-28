import { Resend } from "resend";
import { createHmac } from "crypto";

export type Industry = "建設" | "製造" | "医療福祉" | "運輸" | "IT" | "その他";

export interface NewsletterSubscriber {
  email: string;
  industry: Industry;
  subscribedAt: string;
  active: boolean;
}

export interface SendRecord {
  sentAt: string;
  subject: string;
  recipientCount: number;
}

// In-memory fallback (dev / no-Resend environment)
const memSubscribers = new Map<string, NewsletterSubscriber>();
export const memSendHistory: SendRecord[] = [];

// ── token helpers ────────────────────────────────────────────

export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.AUTH_SECRET ?? "dev-newsletter-secret";
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  return generateUnsubscribeToken(email) === token;
}

// ── Resend helpers ───────────────────────────────────────────

function getResend(): { resend: Resend; audienceId: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const audienceId =
    process.env.NEWSLETTER_AUDIENCE_ID ?? process.env.RESEND_AUDIENCE_ID ?? "";
  return { resend: new Resend(apiKey), audienceId };
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://safe-ai-site.vercel.app";
}

function fromAddress(): string {
  return process.env.NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.com>";
}

// ── subscribe ────────────────────────────────────────────────

export async function addSubscriber(
  sub: NewsletterSubscriber
): Promise<{ ok: boolean; error?: string }> {
  const emailKey = sub.email.toLowerCase();

  if (memSubscribers.has(emailKey)) {
    return { ok: false, error: "既に登録されています。" };
  }
  memSubscribers.set(emailKey, sub);

  const r = getResend();
  if (!r) {
    console.log("[newsletter:subscribe]", JSON.stringify(sub));
    return { ok: true };
  }

  try {
    if (r.audienceId) {
      await r.resend.contacts.create({
        email: sub.email,
        firstName: sub.industry,
        unsubscribed: false,
        audienceId: r.audienceId,
      });
    }

    const unsubToken = generateUnsubscribeToken(sub.email);
    const unsubUrl = `${siteUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${unsubToken}`;

    await r.resend.emails.send({
      from: fromAddress(),
      to: sub.email,
      subject: "【ANZEN AI】週間安全情報メルマガの登録が完了しました",
      html: buildWelcomeEmail(sub, unsubUrl),
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "登録に失敗しました。";
    console.error("[newsletter:subscribe:error]", msg);
    // Still return ok if memory write succeeded
    return { ok: true };
  }
}

// ── unsubscribe ──────────────────────────────────────────────

export async function removeSubscriber(email: string): Promise<boolean> {
  const emailKey = email.toLowerCase();
  const sub = memSubscribers.get(emailKey);
  if (sub) {
    memSubscribers.set(emailKey, { ...sub, active: false });
  }

  const r = getResend();
  if (!r) {
    console.log("[newsletter:unsubscribe]", email);
    return true;
  }

  try {
    if (r.audienceId) {
      // Re-create with unsubscribed:true updates the existing contact
      await r.resend.contacts.create({
        email,
        unsubscribed: true,
        audienceId: r.audienceId,
      });
    }
    return true;
  } catch {
    return true; // best-effort
  }
}

// ── list ─────────────────────────────────────────────────────

export async function listSubscribers(): Promise<NewsletterSubscriber[]> {
  const r = getResend();
  if (!r || !r.audienceId) {
    return Array.from(memSubscribers.values());
  }

  try {
    const result = await r.resend.contacts.list({ audienceId: r.audienceId });
    if (!result.data) return Array.from(memSubscribers.values());

    // SDK v6: result.data may be { data: Contact[] } or Contact[] directly
    type RawContact = {
      email: string;
      first_name?: string;
      firstName?: string;
      created_at?: string;
      createdAt?: string;
      unsubscribed?: boolean;
    };
    const raw = result.data as unknown as { data?: RawContact[] } | RawContact[];
    const contacts: RawContact[] = Array.isArray(raw)
      ? raw
      : (raw as { data?: RawContact[] }).data ?? [];

    return contacts.map((c) => ({
      email: c.email,
      industry: ((c.first_name ?? c.firstName ?? "その他") as Industry),
      subscribedAt: c.created_at ?? c.createdAt ?? new Date().toISOString(),
      active: !(c.unsubscribed ?? false),
    }));
  } catch {
    return Array.from(memSubscribers.values());
  }
}

// ── email templates ──────────────────────────────────────────

function buildWelcomeEmail(sub: NewsletterSubscriber, unsubUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px 16px;color:#1e293b;background:#f8fafc;">
  <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
    <h1 style="font-size:18px;color:#059669;margin:0 0 16px;">ANZEN AI 週間安全情報</h1>
    <p style="margin:0 0 12px;font-size:14px;">研究プロジェクトの応援者として登録が完了しました。ありがとうございます！</p>
    <p style="margin:0 0 8px;font-size:14px;">毎週月曜日の朝9時に、以下の情報をお届けします：</p>
    <ul style="font-size:13px;padding-left:20px;margin:8px 0 16px;line-height:1.8;">
      <li>最新の労働安全衛生通達（厚労省）</li>
      <li>注目の労働災害事例</li>
      <li>法改正情報</li>
      <li>ユーザー投稿の安全活動事例</li>
    </ul>
    <p style="font-size:13px;color:#475569;margin:0 0 4px;">登録業種：<strong>${sub.industry}</strong></p>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin:16px 0 0;text-align:center;">
    <a href="${unsubUrl}" style="color:#6b7280;">配信停止</a>
    ｜ ANZEN AI ─ 現場の安全を、AIで変える。
  </p>
</body>
</html>`;
}

export function buildDigestEmail(opts: {
  notices: { title: string; date: string; url?: string }[];
  accident: { title: string; summary: string } | null;
  lawChanges: { title: string; effectiveDate: string }[];
  ugcItems: { title: string; author: string }[];
  weekLabel: string;
  unsubUrl: string;
}): string {
  const noticeHtml = opts.notices
    .map(
      (n) =>
        `<li style="margin-bottom:8px;"><a href="${n.url ?? "#"}" style="color:#2563eb;font-size:13px;">${n.title}</a><span style="display:block;font-size:11px;color:#64748b;">${n.date}</span></li>`
    )
    .join("");

  const lawHtml = opts.lawChanges
    .map(
      (l) =>
        `<li style="margin-bottom:8px;font-size:13px;">${l.title}<span style="display:block;font-size:11px;color:#64748b;">施行日：${l.effectiveDate}</span></li>`
    )
    .join("");

  const ugcHtml = opts.ugcItems
    .map(
      (u) =>
        `<li style="margin-bottom:8px;font-size:13px;">${u.title}<span style="display:block;font-size:11px;color:#64748b;">投稿者：${u.author}</span></li>`
    )
    .join("");

  const accidentSection = opts.accident
    ? `<div style="background:#fff7ed;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
        <h2 style="font-size:14px;color:#c2410c;margin:0 0 8px;">今週の注目災害事例</h2>
        <p style="font-size:13px;font-weight:600;margin:0 0 4px;">${opts.accident.title}</p>
        <p style="font-size:12px;color:#78350f;margin:0;">${opts.accident.summary}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px 16px;color:#1e293b;background:#f8fafc;">
  <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
    <h1 style="font-size:18px;color:#059669;margin:0 0 4px;">ANZEN AI 週間安全情報</h1>
    <p style="font-size:12px;color:#64748b;margin:0 0 20px;">${opts.weekLabel}</p>

    ${accidentSection}

    <h2 style="font-size:14px;color:#1e293b;margin:0 0 8px;">最新通達・通知</h2>
    <ul style="padding-left:16px;margin:0 0 20px;">${noticeHtml || "<li style='font-size:13px;color:#64748b;'>今週の新着通達はありません</li>"}</ul>

    ${lawHtml ? `<h2 style="font-size:14px;color:#1e293b;margin:0 0 8px;">法改正情報</h2><ul style="padding-left:16px;margin:0 0 20px;">${lawHtml}</ul>` : ""}

    ${ugcHtml ? `<h2 style="font-size:14px;color:#1e293b;margin:0 0 8px;">安全活動 事例共有</h2><ul style="padding-left:16px;margin:0 0 20px;">${ugcHtml}</ul>` : ""}

    <div style="border-top:1px solid #e2e8f0;margin-top:16px;padding-top:16px;text-align:center;">
      <a href="https://safe-ai-site.vercel.app" style="display:inline-block;background:#059669;color:#fff;padding:8px 20px;border-radius:8px;font-size:13px;text-decoration:none;font-weight:600;">ANZEN AI を開く</a>
    </div>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin:16px 0 0;text-align:center;">
    <a href="${opts.unsubUrl}" style="color:#6b7280;">配信停止</a>
    ｜ ANZEN AI ─ 現場の安全を、AIで変える。
  </p>
</body>
</html>`;
}
