import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  listSubscribers,
  generateUnsubscribeToken,
  memSendHistory,
} from "@/lib/newsletter";
import { buildNewsHubItems } from "@/lib/news-hub";
import { buildIndustryDigest } from "@/lib/news-digest";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";

function isAuthorized(req: Request): boolean {
  const adminToken = process.env.NEWSLETTER_ADMIN_TOKEN;
  if (!adminToken) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${adminToken}`;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.anzen-ai-portal.jp";
}

function monthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY が設定されていません。" },
      { status: 503 }
    );
  }

  const subscribers = await listSubscribers();
  const activeSubscribers = subscribers.filter((s) => s.active);

  if (activeSubscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "送信対象者がいません。" });
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.NOTIFY_FROM ?? "安全AIポータル <noreply@anzen-ai.com>";
  const label = monthLabel();
  // 実データ（新着ハブ）を1回だけ構築し、購読者ごとに業種で絞ったダイジェストを生成する。
  // 旧実装のサンプル固定本文を廃止し、e-Gov法改正・労災速報・通達・重大災害の実データを配信。
  const items = buildNewsHubItems({ lawLimit: 40, noticeLimit: 8, mediaLimit: 6, seriousCaseLimit: 6 });

  const BATCH_SIZE = 50;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < activeSubscribers.length; i += BATCH_SIZE) {
    const batch = activeSubscribers.slice(i, i + BATCH_SIZE);
    const emails = batch.map((sub) => {
      const unsubToken = generateUnsubscribeToken(sub.email);
      const unsubUrl = `${siteUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${unsubToken}`;
      // 購読者の業種で法改正を絞ったダイジェスト（IT/その他/未指定は全業種向け）
      const digest = buildIndustryDigest(items, label, sub.industry, unsubUrl);
      return {
        from: fromAddress,
        to: sub.email,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      };
    });

    try {
      await withCircuitBreaker(
        "resend",
        () => resend.batch.send(emails),
        { failureThreshold: 4, cooldownMs: 120_000 }
      );
      sent += batch.length;
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        console.error("[newsletter:send:circuit_open]", err.message, "skipping remaining batches");
        failed += activeSubscribers.length - i;
        break; // 残りバッチは諦めて当該実行を終わらせる（次回 cron で再試行）
      }
      console.error("[newsletter:send:batch_error]", err);
      failed += batch.length;
    }
  }

  const subjectSummary = `${label}の労働安全ダイジェスト（業種別・実データ）`;
  const record = {
    sentAt: new Date().toISOString(),
    subject: subjectSummary,
    recipientCount: sent,
  };
  memSendHistory.push(record);
  console.log("[newsletter:send]", JSON.stringify(record));

  return NextResponse.json({ ok: true, sent, failed, subject: subjectSummary });
}
