import { NextResponse } from "next/server";
import { Resend } from "resend";

// 気象警報メール通知 購読登録エンドポイント
//
// 必要な環境変数:
//   RESEND_API_KEY   - Resend ダッシュボードで取得
//   NOTIFY_FROM      - 送信元メールアドレス (例: noreply@anzen-ai.com)
//   RESEND_AUDIENCE_ID - Resend のオーディエンスID (コンタクトリスト管理用)

interface SubscribeRequest {
  email: string;
  prefecture?: string; // 都道府県 (任意)
  name?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as SubscribeRequest;
  const email = body.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください。" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey) {
    return NextResponse.json(
      { error: "メール通知機能は現在準備中です。（RESEND_API_KEY未設定）" },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    // Resend Contacts API でオーディエンスに追加
    if (audienceId) {
      await resend.contacts.create({
        email,
        firstName: body.name ?? "",
        unsubscribed: false,
        audienceId,
      });
    }

    // 登録確認メール送信
    const fromAddress = process.env.NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.com>";
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "【ANZEN AI】気象警報メール通知の登録が完了しました",
      html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h1 style="font-size:20px;color:#059669;">ANZEN AI 気象警報通知</h1>
  <p>登録が完了しました。<strong>${email}</strong> に気象警報が発表された際にメールをお送りします。</p>
  ${body.prefecture ? `<p>対象地域：<strong>${body.prefecture}</strong></p>` : ""}
  <p>配信停止はこちら：<a href="{{unsubscribe_url}}" style="color:#6b7280;">配信停止</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:12px;color:#94a3b8;">ANZEN AI ─ 現場の安全を、AIで変える。</p>
</body>
</html>`,
    });

    return NextResponse.json({ success: true, email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "登録に失敗しました。";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
