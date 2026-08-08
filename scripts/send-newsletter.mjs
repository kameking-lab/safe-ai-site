#!/usr/bin/env node
/**
 * 週間安全情報メルマガ 配信スクリプト
 *
 * 必要な環境変数:
 *   RESEND_API_KEY            - Resend APIキー
 *   NEWSLETTER_AUDIENCE_ID    - Resendオーディエンスid (なければ RESEND_AUDIENCE_ID)
 *   AUTH_SECRET               - 配信停止トークン生成用シークレット
 *   NOTIFY_FROM               - 送信元アドレス (例: 安全AIポータル <noreply@anzen-ai.com>)
 *   NEXT_PUBLIC_SITE_URL      - サイトURL (例: https://anzen-ai-portal.jp)
 *
 * 実行:
 *   node scripts/send-newsletter.mjs --dry-run
 *   ALLOW_NEWSLETTER_SEND=true node scripts/send-newsletter.mjs --send
 */

import { createHash, createHmac } from "crypto";

const SEND_REQUESTED = process.argv.includes("--send");
const DRY_RUN = !SEND_REQUESTED;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AUDIENCE_ID =
  process.env.NEWSLETTER_AUDIENCE_ID ?? process.env.RESEND_AUDIENCE_ID;
const AUTH_SECRET = process.env.AUTH_SECRET;
const FROM_ADDRESS = process.env.NOTIFY_FROM ?? "安全AIポータル <noreply@anzen-ai.com>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anzen-ai-portal.jp";

if (!RESEND_API_KEY) {
  console.error("[send-newsletter] RESEND_API_KEY が設定されていません。");
  process.exit(1);
}
if (!AUTH_SECRET) {
  console.error("[send-newsletter] AUTH_SECRET が設定されていません。");
  process.exit(1);
}
if (SEND_REQUESTED && process.env.ALLOW_NEWSLETTER_SEND !== "true") {
  console.error("[send-newsletter] 実送信は明示的に許可されていません。");
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────

function unsubToken(email) {
  return createHmac("sha256", AUTH_SECRET).update(email.toLowerCase()).digest("hex");
}

function weekLabel() {
  const now = new Date();
  const y = now.getFullYear();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${y}年 ${fmt(start)}〜${fmt(end)}`;
}

function weekStartIso() {
  const now = new Date();
  const start = new Date(now);
  const day = now.getUTCDay();
  start.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1));
  return start.toISOString().slice(0, 10);
}

function buildHtml(email) {
  const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken(email)}`;
  const label = weekLabel();

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px 16px;color:#1e293b;background:#f8fafc;">
<div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
  <h1 style="font-size:18px;color:#059669;margin:0 0 4px;">安全AIポータル 週間安全情報</h1>
  <p style="font-size:12px;color:#64748b;margin:0 0 20px;">${label}</p>

  <div style="background:#fff7ed;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
    <h2 style="font-size:14px;color:#c2410c;margin:0 0 8px;">更新情報の確認</h2>
    <p style="font-size:13px;color:#78350f;margin:0;">法令・事故・気象情報は更新日時と一次資料をポータル上で確認してください。メール本文だけで安全判断を完結しないでください。</p>
  </div>

  <ul style="padding-left:16px;margin:0 0 20px;">
    <li style="margin-bottom:8px;"><a href="${SITE_URL}/whats-new" style="color:#2563eb;font-size:13px;">新着情報（更新日・出典付き）</a></li>
    <li style="margin-bottom:8px;"><a href="${SITE_URL}/laws" style="color:#2563eb;font-size:13px;">法改正カレンダー</a></li>
    <li style="margin-bottom:8px;"><a href="${SITE_URL}/risk" style="color:#2563eb;font-size:13px;">当日の気象リスク</a></li>
  </ul>

  <div style="border-top:1px solid #e2e8f0;margin-top:16px;padding-top:16px;text-align:center;">
    <a href="${SITE_URL}" style="display:inline-block;background:#059669;color:#fff;padding:8px 20px;border-radius:8px;font-size:13px;text-decoration:none;font-weight:600;">安全AIポータル を開く</a>
  </div>
</div>
<p style="font-size:11px;color:#94a3b8;margin:16px 0 0;text-align:center;">
  <a href="${unsubUrl}" style="color:#6b7280;">配信停止</a>
  ｜ 安全AIポータル ─ 現場の安全を、AIで変える。
</p>
</body>
</html>`;
}

// ── Resend API wrappers ───────────────────────────────────────

async function fetchResend(path, method = "GET", body = null, idempotencyKey = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  };
  if (idempotencyKey) opts.headers["Idempotency-Key"] = idempotencyKey;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.resend.com${path}`, opts);
  if (!res.ok) {
    throw new Error(`Resend API ${method} failed with status ${res.status}`);
  }
  return res.json();
}

async function listContacts() {
  if (!AUDIENCE_ID) {
    throw new Error("NEWSLETTER_AUDIENCE_ID / RESEND_AUDIENCE_ID is not configured");
  }
  const data = await fetchResend(`/audiences/${AUDIENCE_ID}/contacts`);
  const raw = Array.isArray(data?.data) ? data.data : (data?.data?.data ?? []);
  return raw.filter((c) => !c.unsubscribed);
}

async function sendBatch(emails, idempotencyKey) {
  return fetchResend("/emails/batch", "POST", emails, idempotencyKey);
}

// ── main ─────────────────────────────────────────────────────

async function main() {
  console.log(`[send-newsletter] 開始 ${new Date().toISOString()} DRY_RUN=${DRY_RUN}`);

  const contacts = await listContacts();
  console.log(`[send-newsletter] 送信対象: ${contacts.length} 件`);

  if (contacts.length === 0) {
    console.log("[send-newsletter] 送信対象者がいません。終了。");
    return;
  }

  const subject = `【安全AIポータル】週間安全情報 ${weekLabel()}`;
  const BATCH_SIZE = 50;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const emails = batch.map((c) => ({
      from: FROM_ADDRESS,
      to: c.email,
      subject,
      html: buildHtml(c.email),
    }));

    if (DRY_RUN) {
      console.log(`[send-newsletter][dry-run] バッチ ${i / BATCH_SIZE + 1}: ${batch.length} 件`);
      sent += batch.length;
      continue;
    }

    try {
      const recipientsDigest = createHash("sha256")
        .update(batch.map((contact) => contact.email.toLowerCase()).sort().join("\n"))
        .digest("hex")
        .slice(0, 24);
      const idempotencyKey = `newsletter-${weekStartIso()}-${i / BATCH_SIZE}-${recipientsDigest}`;
      await sendBatch(emails, idempotencyKey);
      sent += batch.length;
      console.log(`[send-newsletter] バッチ ${i / BATCH_SIZE + 1} 送信完了: ${batch.length} 件`);
    } catch (err) {
      console.error(`[send-newsletter] バッチ ${i / BATCH_SIZE + 1} 失敗:`, err.message);
      failed += batch.length;
    }
  }

  console.log(
    `[send-newsletter] 完了 sent=${sent} failed=${failed} subject="${subject}"`
  );
  if (failed > 0) {
    throw new Error(`newsletter delivery failed for ${failed} recipient(s)`);
  }
}

main().catch((err) => {
  console.error("[send-newsletter] 致命的エラー:", err);
  process.exit(1);
});
