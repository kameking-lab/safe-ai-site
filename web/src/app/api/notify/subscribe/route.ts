import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendEmailSafe } from "@/lib/external/resend-safe";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { buildUnsubscribeUrl } from "@/lib/newsletter";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[char] ?? char;
  });
}

export async function POST(req: Request) {
  if (process.env.AUTOMATED_NOTIFICATION_DELIVERY_ENABLED !== "true") {
    return NextResponse.json(
      { success: false, delivered: false, error: "delivery_not_operationally_verified" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const limited = await sharedRateLimitGuard(req, {
    routeKey: "weather-notify-subscribe",
    limit: 5,
    windowMs: 60 * 60 * 1_000,
  });
  if (limited) return limited;
  let body: SubscribeRequest;
  try {
    body = (await req.json()) as SubscribeRequest;
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください。" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const unsubscribeUrl = buildUnsubscribeUrl(email);

  if ((body.name?.length ?? 0) > 100 || (body.prefecture?.length ?? 0) > 20) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  console.info(
    "[notify/subscribe]",
    JSON.stringify({ hasName: Boolean(body.name), hasPrefecture: Boolean(body.prefecture), at: new Date().toISOString() })
  );

  // A subscription is not complete unless it is persisted and has a working
  // unsubscribe destination. Never acknowledge a log-only registration.
  if (!apiKey || !audienceId || !unsubscribeUrl) {
    return NextResponse.json(
      {
        success: false,
        delivered: false,
        message: "通知登録は現在利用できません。",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await withCircuitBreaker(
      "resend",
      async () => {
        const resend = new Resend(apiKey);
        const result = await resend.contacts.create({
          email,
          firstName: body.name ?? "",
          unsubscribed: false,
          audienceId,
        });
        if (result.error) throw new Error("contacts.create failed");
      },
      { failureThreshold: 4, cooldownMs: 120_000 }
    );
  } catch (err) {
    const reason = err instanceof CircuitOpenError ? "circuit_open" : "provider_error";
    console.warn("[notify/subscribe] contacts.create failed", reason);
    return NextResponse.json(
      { success: false, delivered: false, message: "通知登録に失敗しました。時間をおいて再度お試しください。" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const fromAddress = process.env.NOTIFY_FROM?.trim();
  if (!fromAddress) {
    return NextResponse.json(
      { ok: false, error: "delivery_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
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
  <p>登録が完了しました。<strong>${escapeHtml(email)}</strong> に気象警報が発表された際にメールをお送りします。</p>
  ${body.prefecture ? `<p>対象地域：<strong>${escapeHtml(body.prefecture)}</strong></p>` : ""}
  <p>配信停止はこちら：<a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">配信停止</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:12px;color:#94a3b8;">安全AIポータル ─ 根拠から、現場の行動へ</p>
</body>
</html>`,
  });

  return NextResponse.json({
    success: true,
    delivered: result.delivered,
    message: result.delivered
      ? "登録が完了しました。確認メールをお送りしましたのでご確認ください。"
      : "登録を受け付けました。確認メール送信に失敗したため、運営側で手動対応します。",
  }, { headers: { "Cache-Control": "no-store" } });
}
