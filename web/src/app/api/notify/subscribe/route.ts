import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendEmailSafe } from "@/lib/external/resend-safe";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";

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

  // 登録要求は必ずログに残す。Resend 不通時の手動レスキューに必須。
  console.warn(
    "[notify/subscribe]",
    JSON.stringify({ email, prefecture: body.prefecture ?? "", name: body.name ?? "", at: new Date().toISOString() })
  );

  if (!apiKey) {
    return NextResponse.json(
      {
        success: true,
        email,
        delivered: false,
        message:
          "登録を受け付けました。通知システムは現在準備中のため、運用開始時にあらためてご案内します。",
      },
      { status: 200 }
    );
  }

  // Resend Contacts API（audienceId 設定時のみ）。失敗はメール送信を止めない。
  if (audienceId) {
    try {
      await withCircuitBreaker(
        "resend",
        async () => {
          const resend = new Resend(apiKey);
          await resend.contacts.create({
            email,
            firstName: body.name ?? "",
            unsubscribed: false,
            audienceId,
          });
        },
        { failureThreshold: 4, cooldownMs: 120_000 }
      );
    } catch (err) {
      const detail = err instanceof CircuitOpenError ? "circuit_open" : err instanceof Error ? err.message : String(err);
      console.warn("[notify/subscribe] contacts.create failed (continuing):", detail);
    }
  }

  const fromAddress = process.env.NOTIFY_FROM ?? "安全AIポータル <noreply@anzen-ai.com>";
  const result = await sendEmailSafe({
    tag: "notify-subscribe",
    from: fromAddress,
    to: email,
    subject: "【安全AIポータル】気象警報メール通知の登録が完了しました",
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <h1 style="font-size:20px;color:#059669;">安全AIポータル 気象警報通知</h1>
  <p>登録が完了しました。<strong>${email}</strong> に気象警報が発表された際にメールをお送りします。</p>
  ${body.prefecture ? `<p>対象地域：<strong>${body.prefecture}</strong></p>` : ""}
  <p>配信停止はこちら：<a href="{{unsubscribe_url}}" style="color:#6b7280;">配信停止</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:12px;color:#94a3b8;">安全AIポータル ─ 現場の安全を、AIで変える。</p>
</body>
</html>`,
  });

  return NextResponse.json({
    success: true,
    email,
    delivered: result.delivered,
    message: result.delivered
      ? "登録が完了しました。確認メールをお送りしましたのでご確認ください。"
      : "登録を受け付けました。確認メール送信に失敗したため、運営側で手動対応します。",
  });
}
