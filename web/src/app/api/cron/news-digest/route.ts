/**
 * P3-1: 月次メールダイジェスト配信（CRON_SECRET 認証）。
 *
 * - 既存の通知基盤（Resend Audience: RESEND_API_KEY / RESEND_AUDIENCE_ID / NOTIFY_FROM）を流用。
 *   新規env追加なし。Res.end Audience の購読者へ Broadcast 配信する。
 * - 個人情報保護: メアドのみ（Audienceで管理）。Resend の List-Unsubscribe による
 *   ワンクリック解除＋コンタクト削除に対応。本文末尾にも解除導線を必ず含める。
 * - 自動cronは停止中。送信には当月の明示的な運用許可が必要。
 * - 同じ月名のBroadcastが既に存在する場合はfail-closedで重複作成しない。
 */
import { NextResponse } from "next/server";
import { buildNewsHubItems } from "@/lib/news-hub";
import { buildMonthlyDigest } from "@/lib/news-digest";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentMonthLabel(now = new Date()): string {
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

function currentPeriodKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const auth = verifyBearerSecret(request, process.env.CRON_SECRET);
  if (!auth.ok) return bearerAuthError(auth);

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const items = buildNewsHubItems();
  const digest = buildMonthlyDigest({ items, monthLabel: currentMonthLabel() });

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const from = process.env.NOTIFY_FROM;
  const periodKey = currentPeriodKey();

  // 送信できない/プレビュー時は内容のみ返す（認証済み運用者専用）。
  if (preview || !apiKey || !audienceId || !from) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: preview ? "preview" : "resend_not_configured",
      subject: digest.subject,
      itemCount: items.length,
      textPreview: digest.text.slice(0, 600),
    });
  }

  if (
    process.env.NEWS_DIGEST_SEND_ENABLED !== "true" ||
    process.env.NEWS_DIGEST_PERIOD !== periodKey
  ) {
    return NextResponse.json(
      { ok: false, sent: false, reason: "delivery_disabled", periodKey },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const broadcastName = `anzen-ai-monthly-${periodKey}`;
    const listed = await resend.broadcasts.list({ limit: 100 });
    if (listed.error) throw new Error("broadcast_list_failed");
    const existing = listed.data?.data.find((broadcast) => broadcast.name === broadcastName);
    if (existing) {
      return NextResponse.json(
        { ok: false, sent: false, reason: "broadcast_already_exists", periodKey },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Create+sendを1リクエストにまとめる。Broadcast API自体にIdempotency-Keyは
    // ないため、定名照会と手動単発運用を併用する。
    const created = await resend.broadcasts.create({
      audienceId,
      name: broadcastName,
      from,
      subject: digest.subject,
      html: digest.html,
      send: true,
    });
    if (created.error || !created.data?.id) throw new Error("broadcast_create_failed");
    return NextResponse.json({ ok: true, sent: true, broadcastId: created.data.id, subject: digest.subject });
  } catch {
    console.error("[news-digest] delivery failed", { periodKey });
    return NextResponse.json(
      { ok: false, sent: false, reason: "send_error", subject: digest.subject },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
