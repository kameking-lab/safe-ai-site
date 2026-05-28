/**
 * P3-1: 月次メールダイジェスト配信（CRON_SECRET 認証）。
 *
 * - 既存の通知基盤（Resend Audience: RESEND_API_KEY / RESEND_AUDIENCE_ID / NOTIFY_FROM）を流用。
 *   新規env追加なし。Res.end Audience の購読者へ Broadcast 配信する。
 * - 個人情報保護: メアドのみ（Audienceで管理）。Resend の List-Unsubscribe による
 *   ワンクリック解除＋コンタクト削除に対応。本文末尾にも解除導線を必ず含める。
 * - 安全側設計: RESEND未設定 or ?preview=1 のときは送信せずダイジェスト内容を返す（検証用）。
 *   送信失敗時もダイジェスト内容を返し、例外でCronを落とさない。
 */
import { NextResponse } from "next/server";
import { buildNewsHubItems } from "@/lib/news-hub";
import { buildMonthlyDigest } from "@/lib/news-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentMonthLabel(now = new Date()): string {
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // CRON_SECRET 設定時は Bearer 一致を要求
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // 送信を許可するのは「CRON_SECRET が設定され、かつ Bearer 一致」の正規Cronのみ。
  // CRON_SECRET 未設定や未認証の公開アクセスでは、メール送信せず内容プレビューのみ返す
  // （公開エンドポイントからの一斉配信トリガを防止）。
  const authed = Boolean(cronSecret) && auth === `Bearer ${cronSecret}`;

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const items = buildNewsHubItems();
  const digest = buildMonthlyDigest({ items, monthLabel: currentMonthLabel() });

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const from = process.env.NOTIFY_FROM;

  // 送信できない/未認証/プレビュー時は内容のみ返す（個人情報を扱わない安全経路）
  if (preview || !authed || !apiKey || !audienceId || !from) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: preview ? "preview" : !authed ? "unauthenticated_preview" : "resend_not_configured",
      subject: digest.subject,
      itemCount: items.length,
      textPreview: digest.text.slice(0, 600),
    });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    // Resend Broadcast: Audience 宛に作成して送信（List-Unsubscribe 自動付与）
    const created = await resend.broadcasts.create({
      audienceId,
      from,
      subject: digest.subject,
      html: digest.html,
    });
    const broadcastId = (created as { data?: { id?: string } }).data?.id;
    if (broadcastId) {
      await resend.broadcasts.send(broadcastId);
    }
    return NextResponse.json({ ok: true, sent: Boolean(broadcastId), broadcastId, subject: digest.subject });
  } catch (e) {
    // 送信失敗でもCronは成功扱い（次回再送）。内容は返す。
    console.error("[news-digest] send failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: true, sent: false, reason: "send_error", subject: digest.subject });
  }
}
