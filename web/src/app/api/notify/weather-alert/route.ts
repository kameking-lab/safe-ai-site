import { NextResponse } from "next/server";
import { Resend } from "resend";

// 気象警報メール一斉送信エンドポイント
// Vercel Cron または外部スクリプトから呼び出す想定
//
// 必要な環境変数:
//   RESEND_API_KEY     - Resend APIキー
//   RESEND_AUDIENCE_ID - 送信先オーディエンスID
//   NOTIFY_FROM        - 送信元アドレス
//   CRON_SECRET        - このエンドポイントを保護するシークレット

interface AlertPayload {
  prefecture: string;
  alertType: string; // 例: "大雨警報", "暴風警報"
  issuedAt: string;  // ISO 8601
  url?: string;
}

export async function POST(req: Request) {
  // 簡易認証 (Vercel Cron や内部サービスからのみ呼ぶ想定)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return NextResponse.json({ error: "Resend未設定" }, { status: 503 });
  }

  const body = (await req.json()) as AlertPayload;
  const { prefecture, alertType, issuedAt, url } = body;

  if (!prefecture || !alertType) {
    return NextResponse.json({ error: "prefecture, alertType は必須です。" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.com>";
  const issuedDate = new Date(issuedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  try {
    // Resend Broadcasts API（または個別送信）で一斉送信
    // NOTE: Resend v3 では broadcasts.create で一斉送信が可能
    await resend.emails.send({
      from: fromAddress,
      to: `audience:${audienceId}`, // Resend オーディエンス全体に送信
      subject: `【ANZEN AI 警報】${prefecture}に${alertType}が発表されました`,
      html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:24px;">
    <h1 style="font-size:18px;color:#dc2626;margin:0 0 8px;">⚠ 気象警報発令</h1>
    <p style="margin:0;font-size:16px;font-weight:bold;">${prefecture}に${alertType}が発表されました</p>
    <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">発表日時：${issuedDate}</p>
  </div>
  <p>現場作業の安全確認を行い、必要に応じて作業中止・避難を検討してください。</p>
  ${url ? `<p><a href="${url}" style="color:#059669;">詳細情報を確認する →</a></p>` : ""}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:12px;color:#94a3b8;">
    ANZEN AI ─ 現場の安全を、AIで変える。<br/>
    <a href="{{unsubscribe_url}}" style="color:#94a3b8;">配信停止はこちら</a>
  </p>
</body>
</html>`,
    });

    return NextResponse.json({ success: true, prefecture, alertType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "送信失敗";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
