#!/usr/bin/env node
/**
 * 週間安全情報メルマガ 配信スクリプト
 *
 * 必要な環境変数:
 *   RESEND_API_KEY            - Resend APIキー
 *   NEWSLETTER_AUDIENCE_ID    - Resendオーディエンスid (なければ RESEND_AUDIENCE_ID)
 *   AUTH_SECRET               - 配信停止トークン生成用シークレット
 *   NOTIFY_FROM               - 送信元アドレス (例: ANZEN AI <noreply@anzen-ai.com>)
 *   NEXT_PUBLIC_SITE_URL      - サイトURL (例: https://safe-ai-site.vercel.app)
 *
 * 実行:
 *   node scripts/send-newsletter.mjs [--dry-run]
 */

import { createHmac } from "crypto";

const DRY_RUN = process.argv.includes("--dry-run");
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AUDIENCE_ID =
  process.env.NEWSLETTER_AUDIENCE_ID ?? process.env.RESEND_AUDIENCE_ID;
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-newsletter-secret";
const FROM_ADDRESS = process.env.NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.com>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://safe-ai-site.vercel.app";

if (!RESEND_API_KEY) {
  console.error("[send-newsletter] RESEND_API_KEY が設定されていません。");
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

function buildHtml(email) {
  const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken(email)}`;
  const label = weekLabel();

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px 16px;color:#1e293b;background:#f8fafc;">
<div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
  <h1 style="font-size:18px;color:#059669;margin:0 0 4px;">ANZEN AI 週間安全情報</h1>
  <p style="font-size:12px;color:#64748b;margin:0 0 20px;">${label}</p>

  <div style="background:#fff7ed;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
    <h2 style="font-size:14px;color:#c2410c;margin:0 0 8px;">今週の注目災害事例</h2>
    <p style="font-size:13px;font-weight:600;margin:0 0 4px;">建設現場における墜落・転落災害（足場作業中）</p>
    <p style="font-size:12px;color:#78350f;margin:0;">足場の組立・解体作業中に手すりが未設置の箇所から転落。安全帯の未使用が主因。作業前点検の徹底と安全帯着用ルールの再確認を。</p>
  </div>

  <h2 style="font-size:14px;color:#1e293b;margin:0 0 8px;">最新通達・通知（厚労省）</h2>
  <ul style="padding-left:16px;margin:0 0 20px;">
    <li style="margin-bottom:8px;"><a href="${SITE_URL}/laws" style="color:#2563eb;font-size:13px;">化学物質の自律的な管理に係る安全データシートの提供義務の対象物質の追加</a><span style="display:block;font-size:11px;color:#64748b;">2024-04-01</span></li>
    <li style="margin-bottom:8px;"><a href="${SITE_URL}/laws" style="color:#2563eb;font-size:13px;">建設業における一人親方等の安全衛生対策の推進について</a><span style="display:block;font-size:11px;color:#64748b;">2024-03-15</span></li>
    <li style="margin-bottom:8px;"><a href="${SITE_URL}/laws" style="color:#2563eb;font-size:13px;">高齢労働者の安全と健康確保のためのガイドライン改訂</a><span style="display:block;font-size:11px;color:#64748b;">2024-03-01</span></li>
  </ul>

  <h2 style="font-size:14px;color:#1e293b;margin:0 0 8px;">法改正情報</h2>
  <ul style="padding-left:16px;margin:0 0 20px;">
    <li style="margin-bottom:8px;font-size:13px;">労働安全衛生規則 第13条（産業医の権限強化）<span style="display:block;font-size:11px;color:#64748b;">施行日：2024年4月1日</span></li>
    <li style="margin-bottom:8px;font-size:13px;">化学物質管理促進法 改正（GHS分類義務化）<span style="display:block;font-size:11px;color:#64748b;">施行日：2024年7月1日</span></li>
  </ul>

  <h2 style="font-size:14px;color:#1e293b;margin:0 0 8px;">安全活動 事例共有</h2>
  <ul style="padding-left:16px;margin:0 0 20px;">
    <li style="margin-bottom:8px;font-size:13px;">製造ラインの安全パトロールチェックリスト共有<span style="display:block;font-size:11px;color:#64748b;">投稿者：某製造業安全担当</span></li>
    <li style="margin-bottom:8px;font-size:13px;">建設現場の熱中症予防グッズレビュー<span style="display:block;font-size:11px;color:#64748b;">投稿者：現場監督A</span></li>
    <li style="margin-bottom:8px;font-size:13px;">ヒヤリハット報告書の書き方テンプレート<span style="display:block;font-size:11px;color:#64748b;">投稿者：安全委員会</span></li>
  </ul>

  <div style="border-top:1px solid #e2e8f0;margin-top:16px;padding-top:16px;text-align:center;">
    <a href="${SITE_URL}" style="display:inline-block;background:#059669;color:#fff;padding:8px 20px;border-radius:8px;font-size:13px;text-decoration:none;font-weight:600;">ANZEN AI を開く</a>
  </div>
</div>
<p style="font-size:11px;color:#94a3b8;margin:16px 0 0;text-align:center;">
  <a href="${unsubUrl}" style="color:#6b7280;">配信停止</a>
  ｜ ANZEN AI ─ 現場の安全を、AIで変える。
</p>
</body>
</html>`;
}

// ── Resend API wrappers ───────────────────────────────────────

async function fetchResend(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.resend.com${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function listContacts() {
  if (!AUDIENCE_ID) {
    console.warn("[send-newsletter] NEWSLETTER_AUDIENCE_ID / RESEND_AUDIENCE_ID が未設定です。");
    return [];
  }
  const data = await fetchResend(`/audiences/${AUDIENCE_ID}/contacts`);
  const raw = Array.isArray(data?.data) ? data.data : (data?.data?.data ?? []);
  return raw.filter((c) => !c.unsubscribed);
}

async function sendBatch(emails) {
  return fetchResend("/emails/batch", "POST", emails);
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

  const subject = `【ANZEN AI】週間安全情報 ${weekLabel()}`;
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
      batch.forEach((c) => console.log(`  → ${c.email}`));
      sent += batch.length;
      continue;
    }

    try {
      await sendBatch(emails);
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
}

main().catch((err) => {
  console.error("[send-newsletter] 致命的エラー:", err);
  process.exit(1);
});
